import { Router } from 'express';
import { searchProducts } from '../controllers/searchController';
import { getProductBySlug, getCategories, uploadCategoryImage } from '../controllers/catalogController';
import { validateQuery } from '../middleware/validate';
import { SearchQuerySchema } from '../schemas';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = Router();

router.get('/search', validateQuery(SearchQuerySchema), searchProducts);
router.get('/products/:slug', getProductBySlug);
router.get('/categories', getCategories);
router.post(
  '/categories/:id/image',
  requireAuth(['manager', 'admin']),
  upload.single('image'),
  uploadCategoryImage
);

export default router;
