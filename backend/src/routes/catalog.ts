import { Router } from 'express';
import { searchProducts } from '../controllers/searchController';
import { getProductBySlug } from '../controllers/catalogController';
import { validateQuery } from '../middleware/validate';
import { SearchQuerySchema } from '../schemas';

const router = Router();

router.get('/search', validateQuery(SearchQuerySchema), searchProducts);
router.get('/products/:slug', getProductBySlug);

export default router;
