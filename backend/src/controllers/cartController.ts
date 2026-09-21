import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { cartItems, products } from '../db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { redisClient } from '../lib/redis';
import { withUserTransaction } from '../db/utils';

// Helper to validate or generate Guest Session ID
const getOrGenerateGuestSessionId = (req: Request): string => {
    let guestSessionId = req.body.guestSessionId || req.query.guestSessionId;
    
    // Validate that it's a 32-character hex string (generated from crypto.randomBytes)
    const isValidFormat = typeof guestSessionId === 'string' && /^[0-9a-f]{64}$/i.test(guestSessionId);
    
    if (!guestSessionId || !isValidFormat) {
        guestSessionId = crypto.randomBytes(32).toString('hex');
    }
    return guestSessionId;
};

export const addItem = async (req: Request, res: Response) => {
    try {
        const { item } = req.body; // { productId, quantity }

        if (req.user) {
            // AUTHENTICATED CART (PostgreSQL via Drizzle)
            await withUserTransaction(req.user.id, async (tx) => {
                // Ensure product has enough stock (FOR UPDATE)
                const productRes = await tx.execute(sql`SELECT stock_quantity FROM products WHERE id = ${item.productId} FOR UPDATE`);
                const stock = productRes.rows[0]?.stock_quantity || 0;

                if (stock < item.quantity) {
                    throw new Error('Insufficient stock');
                }

                await tx.execute(sql`
                    INSERT INTO cart_items (user_id, product_id, quantity)
                    VALUES (${req.user!.id}, ${item.productId}, ${item.quantity})
                    ON CONFLICT (user_id, product_id)
                    DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, ${stock}::int)
                `);
            });
            return res.json({ success: true });
        } else {
            // GUEST CART (Redis)
            const guestSessionId = getOrGenerateGuestSessionId(req);
            const redisKey = `guest_cart:${guestSessionId}`;

            // Check stock directly from DB (no user context needed for simple SELECT)
            const [product] = await db.select({ stock: products.stockQuantity }).from(products).where(eq(products.id, item.productId)).limit(1);
            if (!product || (product.stock || 0) < item.quantity) {
                return res.status(400).json({ error: 'Insufficient stock' });
            }

            // Get existing item in Redis to increment
            const existingRaw = await redisClient.hget(redisKey, item.productId);
            const existingQty = existingRaw ? JSON.parse(existingRaw).quantity : 0;
            const newQty = Math.min(existingQty + item.quantity, product.stock || 0);

            await redisClient.hset(redisKey, item.productId, JSON.stringify({ quantity: newQty }));
            await redisClient.expire(redisKey, 7 * 24 * 60 * 60); // 7 days TTL

            return res.json({ guestSessionId, success: true });
        }
    } catch (error: any) {
        if (error.message === 'Insufficient stock') {
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        console.error('Cart Add Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getCart = async (req: Request, res: Response) => {
    try {
        if (req.user) {
            // AUTHENTICATED CART
            // Using withUserTransaction ensures RLS policies apply!
            const items = await withUserTransaction(req.user.id, async (tx) => {
                const result = await tx.execute(sql`
                    SELECT ci.quantity, p.id as product_id, p.name, p.price, p.stock_quantity, p.images
                    FROM cart_items ci
                    JOIN products p ON ci.product_id = p.id
                    WHERE ci.user_id = ${req.user!.id}
                `);
                return result.rows;
            });
            return res.json(items);
        } else {
            // GUEST CART
            const guestSessionId = req.query.guestSessionId as string;
            if (!guestSessionId) return res.json([]);

            const redisKey = `guest_cart:${guestSessionId}`;
            const rawItems = await redisClient.hgetall(redisKey);
            
            if (Object.keys(rawItems).length === 0) return res.json([]);

            // We need to fetch product details for the guest cart
            const productIds = Object.keys(rawItems);
            const productDetails = await db.select({
                id: products.id,
                name: products.name,
                price: products.price,
                stock: products.stockQuantity,
                images: products.images
            }).from(products).where(inArray(products.id, productIds));

            const enrichedCart = productDetails.map(p => ({
                product_id: p.id,
                name: p.name,
                price: p.price,
                stock_quantity: p.stock,
                images: p.images,
                quantity: JSON.parse(rawItems[p.id]).quantity
            }));

            return res.json(enrichedCart);
        }
    } catch (error) {
        console.error('Get Cart Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateItem = async (req: Request, res: Response) => {
    try {
        const { item } = req.body; // { productId, quantity }

        if (req.user) {
            let finalQty = 0;
            await withUserTransaction(req.user.id, async (tx) => {
                const productRes = await tx.execute(sql`SELECT stock_quantity FROM products WHERE id = ${item.productId} FOR UPDATE`);
                const stock = productRes.rows[0]?.stock_quantity || 0;

                if (item.quantity <= 0) {
                    await tx.execute(sql`DELETE FROM cart_items WHERE user_id = ${req.user!.id} AND product_id = ${item.productId}`);
                } else {
                    finalQty = Math.min(item.quantity, stock);
                    await tx.execute(sql`
                        UPDATE cart_items SET quantity = ${finalQty}
                        WHERE user_id = ${req.user!.id} AND product_id = ${item.productId}
                    `);
                }
            });
            return res.json({ success: true, updatedItem: { product_id: item.productId, quantity: finalQty } });
        } else {
            const guestSessionId = getOrGenerateGuestSessionId(req);
            const redisKey = `guest_cart:${guestSessionId}`;
            let finalQty = 0;

            if (item.quantity <= 0) {
                await redisClient.hdel(redisKey, item.productId);
            } else {
                const [product] = await db.select({ stock: products.stockQuantity }).from(products).where(eq(products.id, item.productId)).limit(1);
                finalQty = Math.min(item.quantity, product?.stock || 0);
                await redisClient.hset(redisKey, item.productId, JSON.stringify({ quantity: finalQty }));
                await redisClient.expire(redisKey, 7 * 24 * 60 * 60);
            }
            return res.json({ guestSessionId, success: true, updatedItem: { product_id: item.productId, quantity: finalQty } });
        }
    } catch (error) {
        console.error('Cart Update Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const removeItem = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;

        if (req.user) {
            await withUserTransaction(req.user.id, async (tx) => {
                await tx.execute(sql`DELETE FROM cart_items WHERE user_id = ${req.user!.id} AND product_id = ${productId}`);
            });
            return res.json({ success: true });
        } else {
            const guestSessionId = req.query.guestSessionId as string || req.body.guestSessionId;
            if (guestSessionId) {
                const redisKey = `guest_cart:${guestSessionId}`;
                await redisClient.hdel(redisKey, productId);
            }
            return res.json({ success: true });
        }
    } catch (error) {
        console.error('Cart Remove Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const clearCart = async (req: Request, res: Response) => {
    try {
        if (req.user) {
            await withUserTransaction(req.user.id, async (tx) => {
                await tx.execute(sql`DELETE FROM cart_items WHERE user_id = ${req.user!.id}`);
            });
            return res.json({ success: true });
        } else {
            const guestSessionId = req.query.guestSessionId as string || req.body.guestSessionId;
            if (guestSessionId) {
                const redisKey = `guest_cart:${guestSessionId}`;
                await redisClient.del(redisKey);
            }
            return res.json({ success: true });
        }
    } catch (error) {
        console.error('Cart Clear Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
