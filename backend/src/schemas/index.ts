import { z } from 'zod';

export const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
}).strict();

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    guestSessionId: z.string().optional()
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
