import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include the parsed user payload
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

export const requireAuth = (allowedRoles: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Dual-transport extraction: Bearer token OR HttpOnly Cookie
            const token =
                req.headers.authorization?.split(' ')[1] ||
                req.cookies?.access_token;

            if (!token) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string, role: string };

            if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
};
