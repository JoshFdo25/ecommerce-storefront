import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { uploadProductImages } from '../controllers/productController';

const router = Router();

// Configure multer to store files in memory and limit size to 5MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Only managers and admins can upload product images
router.post(
  '/:id/images',
  requireAuth(['manager', 'admin']),
  upload.array('images', 5),
  uploadProductImages
);

export default router;
