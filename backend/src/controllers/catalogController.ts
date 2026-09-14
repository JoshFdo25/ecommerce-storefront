import { Request, Response } from 'express';
import { db } from '../db';
import { products, categories } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Has bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

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
                category_slug: categories.slug,
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

export const getCategories = async (req: Request, res: Response) => {
    try {
        const result = await db.select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            parentId: categories.parentId,
            imageUrl: categories.imageUrl,
        }).from(categories);

        return res.json(result);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const uploadCategoryImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: categoryId } = req.params;
        const file = req.file as Express.Multer.File;

        if (!file) {
            res.status(400).json({ error: 'No image file provided.' });
            return;
        }

        // 0. Cleanup old image to prevent storage bloat
        const existingCategory = await db.query.categories.findFirst({
            where: eq(categories.id, categoryId),
            columns: { imageUrl: true }
        });

        if (existingCategory?.imageUrl) {
            const urlObj = new URL(existingCategory.imageUrl);
            const pathSegments = urlObj.pathname.split('/categories/');
            const oldPath = pathSegments.length > 1 ? pathSegments[1] : null;

            if (oldPath) {
                const { error: removeError } = await supabase.storage.from('categories').remove([oldPath]);
                if (removeError) {
                    console.error('Failed to remove old category image:', removeError);
                }
            }
        }

        // Dynamic import for ESM file-type
        const { fileTypeFromBuffer } = await import('file-type');

        // Verify Magic Numbers
        const type = await fileTypeFromBuffer(file.buffer);
        if (!type || !type.mime.startsWith('image/')) {
            throw new Error(`Invalid file type for file ${file.originalname}`);
        }

        // Sanitize and Compress with Sharp
        const processedImageBuffer = await sharp(file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();

        // Upload to Supabase Storage
        const fileName = `${categoryId}/${Date.now()}.webp`;
        
        const { error: uploadError } = await supabase
            .storage
            .from('categories')
            .upload(fileName, processedImageBuffer, {
                contentType: 'image/webp',
                upsert: false
            });

        if (uploadError) {
            throw new Error(`Failed to upload ${file.originalname}`);
        }

        // Return public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('categories')
            .getPublicUrl(fileName);

        // Update Database
        await db.update(categories)
            .set({ imageUrl: publicUrl })
            .where(eq(categories.id, categoryId));

        res.status(200).json({
            message: 'Category image uploaded successfully',
            imageUrl: publicUrl
        });

    } catch (error: any) {
        console.error('Error uploading category image:', error);
        res.status(500).json({ error: error.message || 'Internal server error during upload.' });
    }
};
