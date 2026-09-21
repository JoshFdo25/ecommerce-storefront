import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, forgotPassword, resetPassword, verifyEmail, logout } from '../controllers/authController';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, VerifyEmailSchema } from '../schemas';

const router = Router();

// Strict Rate Limiter specifically for Login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', validateRequest(RegisterSchema), register);
router.post('/login', loginLimiter, validateRequest(LoginSchema), login);
router.post('/verify-email', validateRequest(VerifyEmailSchema), verifyEmail);
router.post('/refresh', refresh);
router.post('/forgot-password', validateRequest(ForgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(ResetPasswordSchema), resetPassword);
router.post('/logout', requireAuth(), logout);

export default router;
