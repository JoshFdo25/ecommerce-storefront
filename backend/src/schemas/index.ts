import { z } from 'zod';

export const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    guestSessionId: z.string().optional(),
    cfToken: z.string().optional()
}).strict();

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    guestSessionId: z.string().optional(),
    cfToken: z.string().optional()
}).strict();

export const ForgotPasswordSchema = z.object({
    email: z.string().email(),
    cfToken: z.string().optional()
}).strict();

export const VerifyEmailSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    guestSessionId: z.string().optional()
}).strict();

export const ResetPasswordSchema = z.object({
    email: z.string().email(),
    token: z.string(),
    newPassword: z.string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
}).strict();

export const CartItemSchema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
}).strict();

export const CartMutationSchema = z.object({
    guestSessionId: z.string().optional(),
    item: CartItemSchema
}).strict();

export const CheckoutSchema = z.object({
    guestSessionId: z.string().optional(),
    shippingAddress: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string()
    })
    // Note: totalAmount is deliberately EXCLUDED to prevent payload manipulation. 
    // The server calculates the price dynamically.
}).strict();

export const SearchQuerySchema = z.object({
    q: z.string().optional().default(""), // search query string
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    categoryId: z.string().uuid().optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
}).strict();
