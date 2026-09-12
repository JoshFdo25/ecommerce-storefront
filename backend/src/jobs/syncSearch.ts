import { db } from '../db';
import { products, categories } from '../db/schema';
import { eq } from 'drizzle-orm';
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
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));
    
    if (allProducts.length === 0) {
      console.log('No products found in DB to sync.');
      return;
    }

    const index = meiliClient.index('products');
    
    // Map Drizzle products to Meilisearch docs
    const docs = allProducts.map(({ product: p, categoryName }) => ({
      id: p.id,
      category_id: p.categoryId,
      category_name: categoryName,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      stock_quantity: p.stockQuantity,
      attributes: p.attributes, // Store JSON directly
      images: p.images,
      is_active: p.isActive,
      created_at: p.createdAt ? p.createdAt.getTime() : Date.now()
    }));

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
