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
            // Seed 15 Products
            const productTemplates = [
                { cat: electronicsCat, name: 'Premium Wireless Headphones', basePrice: 29999, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop' },
                { cat: electronicsCat, name: 'Mechanical Keyboard', basePrice: 14999, img: 'https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=1000&auto=format&fit=crop' },
                { cat: apparelCat, name: 'Minimalist Cotton T-Shirt', basePrice: 2999, img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop' },
                { cat: electronicsCat, name: 'Ultra-Wide Gaming Monitor', basePrice: 49999, img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1000&auto=format&fit=crop' },
                { cat: apparelCat, name: 'Vintage Denim Jacket', basePrice: 8999, img: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=1000&auto=format&fit=crop' },
                { cat: electronicsCat, name: 'Smart Home Hub', basePrice: 12999, img: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?q=80&w=1000&auto=format&fit=crop' },
                { cat: apparelCat, name: 'Classic Leather Sneakers', basePrice: 11999, img: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=1000&auto=format&fit=crop' },
                { cat: electronicsCat, name: 'Noise-Cancelling Earbuds', basePrice: 19999, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=1000&auto=format&fit=crop' },
                { cat: apparelCat, name: 'Cozy Knit Sweater', basePrice: 5999, img: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1000&auto=format&fit=crop' },
                { cat: electronicsCat, name: '4K Action Camera', basePrice: 34999, img: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1000&auto=format&fit=crop' },
                { cat: apparelCat, name: 'Athletic Running Shorts', basePrice: 3499, img: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1000&auto=format&fit=crop' },
                { cat: electronicsCat, name: 'Portable SSD 1TB', basePrice: 15999, img: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?q=80&w=1000&auto=format&fit=crop' },
                { cat: apparelCat, name: 'Everyday Chino Pants', basePrice: 4999, img: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1000&auto=format&fit=crop' },
                { cat: electronicsCat, name: 'Wireless Charging Pad', basePrice: 3999, img: 'https://images.unsplash.com/photo-1601524909162-ae8725290836?q=80&w=1000&auto=format&fit=crop' },
                { cat: apparelCat, name: 'Waterproof Winter Coat', basePrice: 19999, img: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=1000&auto=format&fit=crop' },
            ];

            const productsToInsert = productTemplates.map((p, index) => ({
                categoryId: p.cat.id,
                name: p.name,
                slug: p.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '') + '-' + index,
                description: `<p>This is a premium <strong>${p.name}</strong> designed for maximum comfort and utility. Experience the best in class.</p>`,
                price: p.basePrice,
                stockQuantity: Math.floor(Math.random() * 100) + 10,
                isActive: true,
                images: [p.img]
            }));

            const insertedProducts = await db.insert(products).values(productsToInsert).onConflictDoNothing().returning();
            
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
