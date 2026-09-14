import { db } from '../db';
import { products, categories } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { algoliaClient } from '../lib/algolia';

export async function syncAllProductsToSearch() {
  try {
    console.log('Starting full product sync to Algolia...');
    
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

    // 1. Fetch dynamic attribute keys for Algolia facets
    const uniqueKeysResult = await db.execute(
      sql`SELECT DISTINCT jsonb_object_keys(attributes) as key FROM products WHERE attributes IS NOT NULL`
    );
    const dynamicAttributeKeys = uniqueKeysResult.rows.map((row: any) => row.key);

    const index = algoliaClient.initIndex('products');
    
    // 2. Update Algolia Index Settings & Replicas
    const standardFilterableAttributes = [
      'category_id',
      'category_name',
      'category_slug',
      'price',
      'is_active',
      'stock_quantity'
    ];
    
    const attributesForFaceting = [
      ...standardFilterableAttributes,
      ...dynamicAttributeKeys
    ];
    
    await index.setSettings({
      attributesForFaceting: attributesForFaceting,
      searchableAttributes: [
        'name',
        'description',
        'category_name'
      ],
      replicas: [
        'products_price_asc',
        'products_price_desc'
      ]
    });
    console.log(`Updated attributesForFaceting with dynamic keys: ${dynamicAttributeKeys.join(', ')}`);

    // 3. Configure Replica Indices
    const replicaAsc = algoliaClient.initIndex('products_price_asc');
    await replicaAsc.setSettings({
      ranking: [
        'asc(price)',
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom'
      ]
    });
    
    const replicaDesc = algoliaClient.initIndex('products_price_desc');
    await replicaDesc.setSettings({
      ranking: [
        'desc(price)',
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom'
      ]
    });
    console.log('Configured Replica Indices for sorting.');

    // 4. Map Drizzle products to Algolia docs (must include objectID)
    const docs = allProducts.map(({ product: p, categoryName, categorySlug }) => {
      const baseDoc = {
        objectID: p.id, // Algolia strictly requires objectID
        id: p.id, // Retain original id for frontend compatibility
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

    const response = await index.saveObjects(docs);
    console.log(`Pushed ${docs.length} products to Algolia.`);
    
  } catch (error) {
    console.error('Failed to sync products to Algolia:', error);
  }
}

// Run directly if invoked via CLI
if (require.main === module) {
  syncAllProductsToSearch().then(() => process.exit(0));
}
