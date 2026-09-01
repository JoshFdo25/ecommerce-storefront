import { Request, Response } from 'express';
import { meiliClient } from '../lib/meilisearch';

export const searchProducts = async (req: Request, res: Response) => {
    try {
        // The request query has already been validated and parsed by Zod middleware
        // so we can safely cast req.query (or access req.body if it was a POST, but for GET it's req.query)
        // Wait, validateRequest middleware typically replaces req.body.
        // For GET requests with query strings, validateRequest should parse req.query.
        // We will assume req.query holds the validated payload.
        const queryParams: any = req.query;

        const { q, limit, offset, categoryId, minPrice, maxPrice } = queryParams;

        // Build filter array
        const filters: string[] = [];
        filters.push('is_active = true');

        if (categoryId) {
            filters.push(`category_id = "${categoryId}"`);
        }
        if (minPrice !== undefined) {
            filters.push(`price >= ${minPrice}`);
        }
        if (maxPrice !== undefined) {
            filters.push(`price <= ${maxPrice}`);
        }

        const filterString = filters.join(' AND ');

        // Perform search against Meilisearch
        const index = meiliClient.index('products');
        
        const searchRes = await index.search(q || '', {
            limit: Number(limit) || 20,
            offset: Number(offset) || 0,
            filter: filterString,
            facets: ['category_id'] // Always ask for category facets
        });

        return res.json({
            hits: searchRes.hits,
            estimatedTotalHits: searchRes.estimatedTotalHits,
            facets: searchRes.facetDistribution,
            processingTimeMs: searchRes.processingTimeMs
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
        const index = meiliClient.index('products');

        if (payload.type === 'INSERT' || payload.type === 'UPDATE') {
            const record = payload.record;
            // Map to Meilisearch document format
            const doc = {
                id: record.id,
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
            await index.addDocuments([doc]);
            console.log(`[Search Webhook] Upserted product ${record.id}`);
        } else if (payload.type === 'DELETE') {
            const oldRecord = payload.old_record;
            await index.deleteDocument(oldRecord.id);
            console.log(`[Search Webhook] Deleted product ${oldRecord.id}`);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook Sync Error:', error);
        return res.status(500).json({ error: 'Failed to process webhook' });
    }
};
