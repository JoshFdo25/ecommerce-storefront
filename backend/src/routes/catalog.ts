import { Router } from 'express';
import { searchProducts } from '../controllers/searchController';
import { validateQuery } from '../middleware/validate';
import { SearchQuerySchema } from '../schemas';

const router = Router();

router.get('/search', validateQuery(SearchQuerySchema), searchProducts);

export default router;
