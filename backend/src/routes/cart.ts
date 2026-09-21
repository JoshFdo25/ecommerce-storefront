import { Router } from 'express';
import { addItem, getCart, updateItem, removeItem, clearCart } from '../controllers/cartController';
import { validateRequest } from '../middleware/validate';
import { CartMutationSchema } from '../schemas';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Middleware that optionally parses the user if a token exists, but doesn't reject if missing
import jwt from 'jsonwebtoken';
const optionalAuth = (req: any, res: any, next: any) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.access_token;
        if (token) {
            req.user = jwt.verify(token, process.env.JWT_SECRET!);
        }
    } catch (e) {
        // ignore error, remain unauthenticated
    }
    next();
};

router.post('/add', optionalAuth, validateRequest(CartMutationSchema), addItem);
router.get('/', optionalAuth, getCart);
router.put('/update', optionalAuth, validateRequest(CartMutationSchema), updateItem);
router.delete('/remove/:productId', optionalAuth, removeItem);
router.delete('/clear', optionalAuth, clearCart);

export default router;
