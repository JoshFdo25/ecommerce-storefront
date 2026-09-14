import { Router } from 'express';
import { supabaseWebhook } from '../controllers/searchController';

const router = Router();

// This endpoint is secured via the x-webhook-secret header checked in the controller.
router.post('/supabase', supabaseWebhook);

export default router;
