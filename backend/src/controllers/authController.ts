import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import { users, userProfiles, cartItems, products } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { redisClient } from '../lib/redis';
import { withUserTransaction } from '../db/utils';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

// Helper to generate tokens
const generateTokens = (user: { id: string, role: string }) => {
    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    return { accessToken, refreshToken };
};

// Helper to set cookies
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        domain: process.env.COOKIE_DOMAIN || 'localhost',
    };
    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15m
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 14 * 24 * 60 * 60 * 1000 }); // 14d
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Transaction to create User and Profile
        const newUser = await db.transaction(async (tx) => {
            const [user] = await tx.insert(users).values({ email, passwordHash }).returning({ id: users.id, role: users.role });
            
            await tx.insert(userProfiles).values({
                userId: user.id,
                firstName: firstName || null,
                lastName: lastName || null,
            });
            
            return user;
        });

        const { accessToken, refreshToken } = generateTokens(newUser);
        
        // Hash refresh token for storage
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await redisClient.set(`refresh_token:${newUser.id}`, hashedToken, 'EX', 1209600); // 14 days

        setAuthCookies(res, accessToken, refreshToken);
        return res.status(201).json({ accessToken, refreshToken, user: newUser });
    } catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password, guestSessionId } = req.body;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (!user || user.isDeleted) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(user);
        
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await redisClient.set(`refresh_token:${user.id}`, hashedToken, 'EX', 1209600);

        // Guest Cart Migration logic utilizing the RLS context wrapper
        if (guestSessionId) {
            const redisKey = `guest_cart:${guestSessionId}`;
            const guestCart = await redisClient.hgetall(redisKey);

            if (Object.keys(guestCart).length > 0) {
                // Must use withUserTransaction to inject auth.uid() into the Postgres context
                await withUserTransaction(user.id, async (tx) => {
                    for (const [productId, dataStr] of Object.entries(guestCart)) {
                        const data = JSON.parse(dataStr);
                        
                        // FOR UPDATE lock to prevent inventory race conditions during cart migration
                        const productResult = await tx.execute(sql`
                            SELECT stock_quantity FROM products WHERE id = ${productId} FOR UPDATE
                        `);
                        const availableStock = productResult.rows[0]?.stock_quantity || 0;
                        
                        if (availableStock > 0) {
                            await tx.execute(sql`
                                INSERT INTO cart_items (user_id, product_id, quantity)
                                VALUES (${user.id}, ${productId}, LEAST(${data.quantity}::int, ${availableStock}::int))
                                ON CONFLICT (user_id, product_id)
                                DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, ${availableStock}::int)
                            `);
                        }
                    }
                });
                await redisClient.del(redisKey);
            }
        }

        setAuthCookies(res, accessToken, refreshToken);
        return res.json({ accessToken, refreshToken, user: { id: user.id, role: user.role } });
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const { refreshToken, userId } = req.body; 
        // In a real app, you might extract the token from cookies.
        // We'll allow either body or cookie for flexibility
        const tokenToVerify = refreshToken || req.cookies?.refresh_token;

        if (!tokenToVerify || !userId) {
            return res.status(400).json({ error: 'Missing token or user ID' });
        }

        const hashedToken = crypto.createHash('sha256').update(tokenToVerify).digest('hex');
        const storedToken = await redisClient.get(`refresh_token:${userId}`);

        if (!storedToken || storedToken !== hashedToken) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Fetch user to re-issue
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user || user.isDeleted) {
            return res.status(401).json({ error: 'User not found or deleted' });
        }

        const newTokens = generateTokens(user);
        
        // Rotate token
        const newHashedToken = crypto.createHash('sha256').update(newTokens.refreshToken).digest('hex');
        await redisClient.set(`refresh_token:${user.id}`, newHashedToken, 'EX', 1209600);

        setAuthCookies(res, newTokens.accessToken, newTokens.refreshToken);
        return res.json({ accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken });
    } catch (error) {
        console.error('Refresh Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (user && !user.isDeleted) {
            const token = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            
            await redisClient.set(`reset_token:${email}`, hashedToken, 'EX', 900); // 15 mins

            // Calculate frontend URL. In dev, NEXT_PUBLIC_API_URL is http://localhost:5000/api/v1
            // So we default to http://localhost:3000 if not easily parseable.
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
            
            await resend.emails.send({
                from: 'Acme Store <onboarding@resend.dev>',
                to: email,
                subject: 'Password Reset Request',
                html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.</p>`
            });
        }

        // Generic response
        return res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, token, newPassword } = req.body;

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const storedToken = await redisClient.get(`reset_token:${email}`);

        if (!storedToken || storedToken !== hashedToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        
        await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.email, email));
        await redisClient.del(`reset_token:${email}`);

        return res.json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
