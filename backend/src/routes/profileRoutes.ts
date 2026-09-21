import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { uploadAvatar, getProfile } from '../controllers/profileController';

const router = Router();

// Configure multer to store file in memory and limit size to 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/avatar', requireAuth(), upload.single('avatar'), uploadAvatar);
router.get('/', requireAuth(), getProfile);

export default router;
