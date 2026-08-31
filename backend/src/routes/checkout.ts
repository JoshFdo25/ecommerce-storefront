import { Router, Request, Response } from 'express';
import { createCheckoutSession, stripeWebhook } from '../controllers/checkoutController';
import { validateRequest } from '../middleware/validate';
import { CheckoutSchema } from '../schemas';
import jwt from 'jsonwebtoken';

const router = Router();

const optionalAuth = (req: Request, res: Response, next: any) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.access_token;
        if (token) {
            req.user = jwt.verify(token, process.env.JWT_SECRET!) as any;
        }
    } catch (e) {
        // ignore error
    }
    next();
};

router.post('/create', optionalAuth, validateRequest(CheckoutSchema), createCheckoutSession);

export default router;
