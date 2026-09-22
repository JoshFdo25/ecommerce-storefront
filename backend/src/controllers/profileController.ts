import { Request, Response } from 'express';
import { db } from '../db';
import { userProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id; // Using requireAuth populated req.user.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }

    // 1. Verify Magic Numbers to ensure it's a real image (Dynamic import for ESM)
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(req.file.buffer);
    
    if (!type || !type.mime.startsWith('image/')) {
      res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
      return;
    }

    // 2. Sanitize and Compress with Sharp
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // 3. Upload to Supabase Storage
    // Use a static path per user to overwrite previous avatars and prevent storage bloat
    const fileName = `${userId}/avatar.webp`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(fileName, processedImageBuffer, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      res.status(500).json({ error: 'Failed to upload image to storage.' });
      return;
    }

    // Get public URL and append a timestamp to bust browser cache
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(fileName);

    const cacheBustedUrl = `${publicUrl}?t=${new Date().getTime()}`;

    // 4. Update Database
    await db.update(userProfiles)
      .set({ avatarUrl: cacheBustedUrl, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));

    res.status(200).json({
      message: 'Avatar updated successfully',
      avatarUrl: cacheBustedUrl
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Internal server error during upload.' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { users } = await import('../db/schema');
    const profile = await db.select({
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      phone: userProfiles.phone,
      avatarUrl: userProfiles.avatarUrl,
      shippingAddress: userProfiles.shippingAddress,
      email: users.email
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(eq(userProfiles.userId, userId))
    .limit(1);

    if (profile.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { firstName, lastName, phone, shippingAddress } = req.body;

    await db.update(userProfiles)
      .set({ 
        firstName, 
        lastName, 
        phone, 
        shippingAddress, 
        updatedAt: new Date() 
      })
      .where(eq(userProfiles.userId, userId));

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { orders, orderItems, products } = await import('../db/schema');
    const { desc, eq } = await import('drizzle-orm');

    // Fetch orders for this user
    const userOrders = await db.select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    // For each order, fetch items with product images
    const enrichedOrders = await Promise.all(userOrders.map(async (order) => {
      const items = await db.select({
        id: orderItems.id,
        productId: orderItems.productId,
        productNameAtPurchase: orderItems.productNameAtPurchase,
        quantity: orderItems.quantity,
        priceAtPurchase: orderItems.priceAtPurchase,
        images: products.images
      })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    }));

    res.json(enrichedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
