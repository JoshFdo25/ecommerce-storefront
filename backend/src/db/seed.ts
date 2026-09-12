import { db } from './index';
import { sql } from 'drizzle-orm';
import { withUserTransaction } from './utils';
import { users, categories, products } from './schema';

async function verifyConnection() {
    try {
        console.log("Testing Database Connection...");
        
        // 1. Basic Connection Test
        const result = await db.execute(sql`SELECT current_database(), current_user, version()`);
        console.log("Connection Successful! Info:", result.rows[0]);

        // 2. Test RLS Context Wrapper (if running against real DB with RLS)
        console.log("\nTesting RLS Context Wrapper...");
        const mockUserId = '00000000-0000-0000-0000-000000000000'; // Replace with a real UUID if testing locally
        
        await withUserTransaction(mockUserId, async (tx) => {
            const context = await tx.execute(sql`SELECT current_setting('request.jwt.claim.sub', true)`);
            console.log("Active Transaction User Context:", context.rows[0]);
            if (context.rows[0].current_setting === mockUserId) {
                console.log("SUCCESS: RLS user context successfully injected into transaction!");
            } else {
                console.warn("WARNING: RLS context mismatch.");
            }
        });

        console.log("\nSeeding test categories and products...");
        
        // Seed Categories
        const insertedCategories = await db.insert(categories).values([
            { name: 'Electronics', slug: 'electronics' },
            { name: 'Apparel', slug: 'apparel' }
        ]).onConflictDoNothing().returning();

        if (insertedCategories.length > 0) {
            console.log(`Inserted ${insertedCategories.length} categories.`);
        }

        // Fetch categories to get IDs for products
        const allCategories = await db.select().from(categories);
        const electronicsCat = allCategories.find(c => c.slug === 'electronics');
        const apparelCat = allCategories.find(c => c.slug === 'apparel');

        if (electronicsCat && apparelCat) {
            // Seed Products
            const insertedProducts = await db.insert(products).values([
                {
                    categoryId: electronicsCat.id,
                    name: 'Premium Wireless Headphones',
                    slug: 'premium-wireless-headphones',
                    description: '<p>Experience <strong>premium</strong> sound quality with active noise cancellation.</p>',
                    price: 29999, // $299.99
                    stockQuantity: 50,
                    isActive: true,
                    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop']
                },
                {
                    categoryId: electronicsCat.id,
                    name: 'Mechanical Keyboard',
                    slug: 'mechanical-keyboard',
                    description: '<p>Tactile switches for the ultimate typing experience.</p>',
                    price: 14999, // $149.99
                    stockQuantity: 20,
                    isActive: true,
                    images: ['https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=1000&auto=format&fit=crop']
                },
                {
                    categoryId: apparelCat.id,
                    name: 'Minimalist Cotton T-Shirt',
                    slug: 'minimalist-cotton-tshirt',
                    description: '<p>100% organic cotton, ethically sourced.</p>',
                    price: 2999, // $29.99
                    stockQuantity: 100,
                    isActive: true,
                    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop']
                }
            ]).onConflictDoNothing().returning();
            
            console.log(`Inserted ${insertedProducts.length} products.`);
        } else {
            console.log("Skipping product seed: Categories not found.");
        }
        
        process.exit(0);
    } catch (error) {
        console.error("Database test failed:", error);
        process.exit(1);
    }
}

verifyConnection();
