import { sql } from 'drizzle-orm';
import { db } from './index';

/**
 * Executes a transaction while setting the PostgreSQL configuration for the current RLS context.
 * This is crucial for Supabase RLS policies to evaluate `auth.uid()` correctly.
 * 
 * @param userId - The UUID of the authenticated user
 * @param callback - The transaction callback to execute
 */
export async function withUserTransaction<T>(
    userId: string,
    callback: (tx: any) => Promise<T>
): Promise<T> {
    return await db.transaction(async (tx) => {
        // Set the user ID in the transaction scope for RLS policies
        // true = local to this transaction only
        await tx.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`);
        
        return await callback(tx);
    });
}
