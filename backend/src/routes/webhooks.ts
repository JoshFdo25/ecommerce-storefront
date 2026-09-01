import { Router } from 'express';
import { supabaseWebhook } from '../controllers/searchController';

const router = Router();

// In a real production environment, you should secure this webhook endpoint 
// using a secret header (e.g., x-webhook-secret) configured in Supabase.
router.post('/supabase', supabaseWebhook);

export default router;
