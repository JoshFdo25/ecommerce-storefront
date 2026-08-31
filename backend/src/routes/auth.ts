import { Router } from 'express';
import { register, login, refresh } from '../controllers/authController';
import { validateRequest } from '../middleware/validate';
import { RegisterSchema, LoginSchema } from '../schemas';

const router = Router();

router.post('/register', validateRequest(RegisterSchema), register);
router.post('/login', validateRequest(LoginSchema), login);
router.post('/refresh', refresh);

export default router;
