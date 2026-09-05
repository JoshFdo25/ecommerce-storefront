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

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(fileName);

    // 4. Update Database
    await db.update(userProfiles)
      .set({ avatarUrl: publicUrl, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));

    res.status(200).json({
      message: 'Avatar updated successfully',
      avatarUrl: publicUrl
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Internal server error during upload.' });
  }
};
