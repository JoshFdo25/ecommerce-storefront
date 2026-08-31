import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const app = express();
const port = process.env.PORT || 5000;

// Security & Middlewares
app.use(helmet());

// NOTE: We will need a specific route with express.raw() for Stripe webhooks before this generic JSON parser
app.use(express.json({ type: ['application/json', 'application/json; charset=utf-8'], limit: '10kb' }));

// Strict CORS baseline for Next.js frontend
const corsOptions = {
    origin: process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/v1/', apiLimiter);

// Healthcheck
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', message: 'E-Commerce API is running' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
