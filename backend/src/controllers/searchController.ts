import { Request, Response } from 'express';
import { algoliaClient } from '../lib/algolia';

export const searchProducts = async (req: Request, res: Response) => {
    try {
        const queryParams: any = req.query;

        const { q, limit, offset, categoryId, minPrice, maxPrice } = queryParams;

        // Build filter array
        const filters: string[] = [];
        filters.push('is_active:true');

        if (categoryId) {
            filters.push(`category_id:"${categoryId}"`);
        }
        if (minPrice !== undefined) {
            filters.push(`price >= ${minPrice}`);
        }
        if (maxPrice !== undefined) {
            filters.push(`price <= ${maxPrice}`);
        }

        const filterString = filters.join(' AND ');

        // Perform search against Algolia
        const index = algoliaClient.initIndex('products');

        const hitsPerPage = Number(limit) || 20;
        const page = Math.floor((Number(offset) || 0) / hitsPerPage);

        const searchRes = await index.search(q || '', {
            hitsPerPage,
            page,
            filters: filterString,
            facets: ['category_id'] // Always ask for category facets
        });

        return res.json({
            hits: searchRes.hits,
            estimatedTotalHits: searchRes.nbHits,
            facets: searchRes.facets,
            processingTimeMs: searchRes.processingTimeMS
        });
    } catch (error) {
        console.error('Search API Error:', error);
        return res.status(500).json({ error: 'Failed to execute search query' });
    }
};

export const supabaseWebhook = async (req: Request, res: Response) => {
    try {
        // Supabase Database Webhook payload format
        const payload = req.body;
        const index = algoliaClient.initIndex('products');

        if (payload.type === 'INSERT' || payload.type === 'UPDATE') {
            const record = payload.record;
            // Map to Algolia document format
            const doc = {
                objectID: record.id,
                id: record.id, // Retain original id for frontend compatibility
                category_id: record.category_id,
                name: record.name,
                slug: record.slug,
                description: record.description,
                price: record.price,
                stock_quantity: record.stock_quantity,
                attributes: record.attributes,
                images: record.images,
                is_active: record.is_active,
                created_at: new Date(record.created_at).getTime()
            };
            await index.saveObject(doc);
            console.log(`[Search Webhook] Upserted product ${record.id}`);
        } else if (payload.type === 'DELETE') {
            const oldRecord = payload.old_record;
            await index.deleteObject(oldRecord.id);
            console.log(`[Search Webhook] Deleted product ${oldRecord.id}`);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook Sync Error:', error);
        return res.status(500).json({ error: 'Failed to process webhook' });
    }
};
