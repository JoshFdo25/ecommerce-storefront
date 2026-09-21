import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { stripeWebhook } from './controllers/checkoutController';
import authRoutes from './routes/auth';
import cartRoutes from './routes/cart';
import checkoutRoutes from './routes/checkout';
import catalogRoutes from './routes/catalog';
import webhookRoutes from './routes/webhooks';
import profileRoutes from './routes/profileRoutes';
import productRoutes from './routes/productRoutes';
import { startInventorySweeper } from './jobs/inventorySweeper';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const app = express();
const port = process.env.PORT || 5000;

// Security & Middlewares
app.use(helmet());

// NOTE: Stripe webhooks must use raw body buffer for signature verification
app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

// General parsers
app.use(express.json({ type: ['application/json', 'application/json; charset=utf-8'], limit: '10kb' }));
app.use(cookieParser());

// Strict CORS baseline for Next.js frontend
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // required for HttpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 10000 : 1000, // 1000 requests per IP per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/v1/', apiLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/products', productRoutes);

// Healthcheck
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', message: 'E-Commerce API is running' });
});

// Start Cron Jobs
startInventorySweeper();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
