import { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { products, cartItems, orders, orderItems, inventoryReservations } from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { withUserTransaction } from '../db/utils';
import { redisClient } from '../lib/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' });

export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const { guestSessionId, shippingAddress } = req.body;
        let cartToProcess: Array<{ productId: string, quantity: number }> = [];
        let userId = req.user?.id;

        // 1. Resolve Cart
        if (userId) {
            const items = await db.select().from(cartItems).where(eq(cartItems.userId, userId));
            cartToProcess = items.map(i => ({ productId: i.productId, quantity: i.quantity }));
        } else if (guestSessionId) {
            const rawItems = await redisClient.hgetall(`guest_cart:${guestSessionId}`);
            cartToProcess = Object.entries(rawItems).map(([productId, dataStr]) => ({
                productId,
                quantity: JSON.parse(dataStr).quantity
            }));
        }

        if (cartToProcess.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // 2. Lock Inventory and Calculate Price Server-Side
        let totalAmount = 0;
        const processedItems: Array<{ product: any, quantity: number }> = [];

        // If user is authenticated, use their RLS context. If guest, we must bypass RLS temporarily or use a service role 
        // to read products and create reservations (since guests don't have a user ID). 
        // Wait, products are public readable. Reservations have no user ID if guest.
        const txWrapper = userId ? (cb: any) => withUserTransaction(userId, cb) : db.transaction.bind(db);

        const checkoutData = await txWrapper(async (tx: any) => {
            for (const item of cartToProcess) {
                // FOR UPDATE prevents race conditions!
                const productRes = await tx.execute(sql`
                    SELECT id, name, price, stock_quantity 
                    FROM products 
                    WHERE id = ${item.productId} AND is_active = true 
                    FOR UPDATE
                `);
                
                const product = productRes.rows[0];
                if (!product || product.stock_quantity < item.quantity) {
                    throw new Error(`Item ${item.productId} is out of stock`);
                }

                totalAmount += (product.price * item.quantity);
                processedItems.push({ product, quantity: item.quantity });

                // Create Inventory Reservation (holds stock for 15 minutes)
                await tx.execute(sql`
                    INSERT INTO inventory_reservations (user_id, product_id, quantity, status, expires_at)
                    VALUES (${userId || null}, ${item.productId}, ${item.quantity}, 'reserved', NOW() + INTERVAL '15 minutes')
                `);

                // Decrement actual stock_quantity so others can't buy it
                await tx.execute(sql`
                    UPDATE products SET stock_quantity = stock_quantity - ${item.quantity} WHERE id = ${item.productId}
                `);
            }

            // Create Pending Order
            const [order] = await tx.execute(sql`
                INSERT INTO orders (user_id, total_amount, shipping_address, status)
                VALUES (${userId || null}, ${totalAmount}, ${JSON.stringify(shippingAddress)}, 'pending')
                RETURNING id
            `);

            for (const pItem of processedItems) {
                await tx.execute(sql`
                    INSERT INTO order_items (order_id, product_id, product_name_at_purchase, quantity, price_at_purchase)
                    VALUES (${order.id}, ${pItem.product.id}, ${pItem.product.name}, ${pItem.quantity}, ${pItem.product.price})
                `);
            }

            return order;
        });

        // 3. Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount, // Stripe takes minor units (cents), which we are already using
            currency: 'usd',
            metadata: {
                orderId: checkoutData.id,
                userId: userId || 'guest'
            }
        });

        // Link payment intent to order
        await db.execute(sql`UPDATE orders SET stripe_payment_intent_id = ${paymentIntent.id} WHERE id = ${checkoutData.id}`);

        return res.json({ clientSecret: paymentIntent.client_secret, orderId: checkoutData.id });

    } catch (error: any) {
        console.error('Checkout Error:', error);
        return res.status(400).json({ error: error.message || 'Internal Server Error' });
    }
};

export const stripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    
    let event: Stripe.Event;
    try {
        // Construct event using raw body buffer (which must be saved by a specific middleware before express.json)
        event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        // Idempotency check
        const existingEvent = await db.execute(sql`SELECT id FROM stripe_events WHERE id = ${event.id}`);
        if (existingEvent.rows.length > 0) {
            return res.status(200).json({ received: true });
        }

        await db.execute(sql`INSERT INTO stripe_events (id, type, status) VALUES (${event.id}, ${event.type}, 'processing')`);

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const orderId = paymentIntent.metadata.orderId;

            // Fulfill the order
            await db.transaction(async (tx) => {
                await tx.execute(sql`UPDATE orders SET status = 'processing' WHERE id = ${orderId}`);
                
                // Get items to resolve reservations
                const items = await tx.execute(sql`SELECT product_id, quantity FROM order_items WHERE order_id = ${orderId}`);
                for (const item of items.rows) {
                    await tx.execute(sql`
                        UPDATE inventory_reservations 
                        SET status = 'sold' 
                        WHERE product_id = ${item.product_id} AND status = 'reserved' 
                        AND user_id = ${paymentIntent.metadata.userId !== 'guest' ? paymentIntent.metadata.userId : null}
                    `);
                }
            });
        }

        await db.execute(sql`UPDATE stripe_events SET status = 'processed' WHERE id = ${event.id}`);
        return res.status(200).json({ received: true });

    } catch (err) {
        console.error('Webhook processing failed:', err);
        return res.status(500).end();
    }
};
