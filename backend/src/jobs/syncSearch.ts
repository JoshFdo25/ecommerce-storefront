import { db } from '../db';
import { products, categories } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { meiliClient, setupMeiliIndex } from '../lib/meilisearch';

export async function syncAllProductsToSearch() {
  try {
    console.log('Starting full product sync to Meilisearch...');
    
    await setupMeiliIndex();

    // Fetch all products with their categories
    const allProducts = await db
      .select({
        product: products,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));
    
    if (allProducts.length === 0) {
      console.log('No products found in DB to sync.');
      return;
    }

    // 1. Fetch dynamic attribute keys for Meilisearch facets
    const uniqueKeysResult = await db.execute(
      sql`SELECT DISTINCT jsonb_object_keys(attributes) as key FROM products WHERE attributes IS NOT NULL`
    );
    const dynamicAttributeKeys = uniqueKeysResult.rows.map((row: any) => row.key);

    const index = meiliClient.index('products');
    
    // 2. Dynamically update Meilisearch filterable attributes
    const standardFilterableAttributes = [
      'category_id',
      'category_name',
      'category_slug',
      'price',
      'is_active',
      'stock_quantity'
    ];
    await index.updateFilterableAttributes([
      ...standardFilterableAttributes,
      ...dynamicAttributeKeys
    ]);
    console.log(`Updated filterable attributes with dynamic keys: ${dynamicAttributeKeys.join(', ')}`);

    // 3. Map Drizzle products to Meilisearch docs
    const docs = allProducts.map(({ product: p, categoryName, categorySlug }) => {
      const baseDoc = {
        id: p.id,
        category_id: p.categoryId,
        category_name: categoryName,
        category_slug: categorySlug,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        stock_quantity: p.stockQuantity,
        images: p.images,
        is_active: p.isActive,
        created_at: p.createdAt ? p.createdAt.getTime() : Date.now()
      };
      
      // Spread attributes at root level for dynamic faceting
      const attributes = typeof p.attributes === 'object' && p.attributes !== null 
        ? p.attributes 
        : {};

      return {
        ...baseDoc,
        ...attributes
      };
    });

    const response = await index.addDocuments(docs);
    console.log(`Pushed ${docs.length} products to Meilisearch. Task UID: ${response.taskUid}`);
    
  } catch (error) {
    console.error('Failed to sync products to Meilisearch:', error);
  }
}

// Run directly if invoked via CLI
if (require.main === module) {
  syncAllProductsToSearch().then(() => process.exit(0));
}
