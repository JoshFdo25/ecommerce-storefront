import algoliasearch from 'algoliasearch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
const adminKey = process.env.ALGOLIA_ADMIN_KEY || '';

export const algoliaClient = algoliasearch(appId, adminKey);
