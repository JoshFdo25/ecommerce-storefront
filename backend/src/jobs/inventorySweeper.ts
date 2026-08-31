import cron from 'node-cron';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Run every minute to check for expired reservations
export const startInventorySweeper = () => {
    cron.schedule('* * * * *', async () => {
        try {
            // Find expired reservations
            const expiredRes = await db.execute(sql`
                SELECT id, product_id, quantity 
                FROM inventory_reservations 
                WHERE status = 'reserved' AND expires_at < NOW()
            `);

            if (expiredRes.rows.length === 0) return;

            console.log(`[Sweeper] Found ${expiredRes.rows.length} expired reservations to release.`);

            await db.transaction(async (tx) => {
                for (const row of expiredRes.rows) {
                    // Update reservation status to released
                    await tx.execute(sql`
                        UPDATE inventory_reservations 
                        SET status = 'released' 
                        WHERE id = ${row.id}
                    `);

                    // Restore the stock quantity
                    await tx.execute(sql`
                        UPDATE products 
                        SET stock_quantity = stock_quantity + ${row.quantity} 
                        WHERE id = ${row.product_id}
                    `);
                }
            });

            console.log(`[Sweeper] Successfully released expired inventory.`);
        } catch (error) {
            console.error('[Sweeper] Failed to run inventory sweeper:', error);
        }
    });
    console.log('Inventory Sweeper cron job initialized.');
};
