import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsedBody = schema.parse(req.body);
            // Replace request body with stripped and validated payload
            req.body = parsedBody;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: 'Invalid request data',
                    details: error.errors
                });
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};

export const validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsedQuery = schema.parse(req.query);
            req.query = parsedQuery;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: error.errors
                });
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};
