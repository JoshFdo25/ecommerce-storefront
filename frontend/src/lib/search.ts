import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';

const MEILISEARCH_URL = process.env.NEXT_PUBLIC_MEILISEARCH_URL || 'http://127.0.0.1:7700';
const MEILISEARCH_SEARCH_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY || '';

export const { searchClient } = instantMeiliSearch(
  MEILISEARCH_URL,
  MEILISEARCH_SEARCH_KEY,
  {
    primaryKey: 'id',
  }
);
