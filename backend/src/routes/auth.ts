import { Router } from 'express';
import { register, login, refresh, forgotPassword, resetPassword, verifyEmail, logout } from '../controllers/authController';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, VerifyEmailSchema } from '../schemas';

const router = Router();

router.post('/register', validateRequest(RegisterSchema), register);
router.post('/login', validateRequest(LoginSchema), login);
router.post('/verify-email', validateRequest(VerifyEmailSchema), verifyEmail);
router.post('/refresh', refresh);
router.post('/forgot-password', validateRequest(ForgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(ResetPasswordSchema), resetPassword);
router.post('/logout', requireAuth(), logout);

export default router;
