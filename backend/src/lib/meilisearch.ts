import { Meilisearch } from 'meilisearch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

export const meiliClient = new Meilisearch({
  host: process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700',
  apiKey: process.env.MEILISEARCH_ADMIN_KEY || 'masterKey',
});

// Helper function to setup the index
export async function setupMeiliIndex() {
  const index = meiliClient.index('products');
  
  // Filterable attributes are now set dynamically in jobs/syncSearch.ts
  
  // Set sortable attributes
  await index.updateSortableAttributes([
    'price',
    'stock_quantity',
    'created_at'
  ]);
  
  console.log('Meilisearch index settings updated.');
}
