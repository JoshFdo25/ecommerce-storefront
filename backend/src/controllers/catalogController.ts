import { Request, Response } from 'express';
import { db } from '../db';
import { products, categories } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const getProductBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;

        const result = await db
            .select({
                id: products.id,
                name: products.name,
                slug: products.slug,
                description: products.description,
                price: products.price,
                stock_quantity: products.stockQuantity,
                attributes: products.attributes,
                images: products.images,
                category_name: categories.name,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(eq(products.slug, slug), eq(products.isActive, true)))
            .limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.json(result[0]);
    } catch (error) {
        console.error('Error fetching product by slug:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
