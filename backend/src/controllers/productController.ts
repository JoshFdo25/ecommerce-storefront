import { Request, Response } from 'express';
import { db } from '../db';
import { products } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Has bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: productId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No image files provided.' });
      return;
    }

    // 0. Cleanup old images to prevent storage bloat
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { images: true }
    });

    if (existingProduct?.images && Array.isArray(existingProduct.images) && existingProduct.images.length > 0) {
      const oldPaths = existingProduct.images.map((url: string) => {
        // Extract the path from the Supabase public URL
        // Example: https://<project>.supabase.co/storage/v1/object/public/products/<productId>/<filename>.webp
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/products/');
        return pathSegments.length > 1 ? pathSegments[1] : null;
      }).filter((path): path is string => path !== null);

      if (oldPaths.length > 0) {
        const { error: removeError } = await supabase.storage.from('products').remove(oldPaths);
        if (removeError) {
          console.error('Failed to remove old product images:', removeError);
        }
      }
    }

    // Dynamic import for ESM file-type
    const { fileTypeFromBuffer } = await import('file-type');

    // 1 & 2 & 3. Process and upload all files concurrently while preserving order
    const imageUrls = await Promise.all(
      files.map(async (file, index) => {
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
        const fileName = `${productId}/${Date.now()}-${index}.webp`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('products')
          .upload(fileName, processedImageBuffer, {
            contentType: 'image/webp',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.originalname}`);
        }

        // Return public URL to preserve array ordering
        const { data: { publicUrl } } = supabase
          .storage
          .from('products')
          .getPublicUrl(fileName);

        return publicUrl;
      })
    );

    // 4. Update Database (Replaces existing)
    await db.update(products)
      .set({ images: imageUrls })
      .where(eq(products.id, productId));

    res.status(200).json({
      message: 'Product images uploaded successfully',
      images: imageUrls
    });

  } catch (error: any) {
    console.error('Error uploading product images:', error);
    res.status(500).json({ error: error.message || 'Internal server error during upload.' });
  }
};
