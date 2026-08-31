import { db } from './index';
import { sql } from 'drizzle-orm';
import { withUserTransaction } from './utils';
import { users } from './schema';

async function verifyConnection() {
    try {
        console.log("Testing Database Connection...");
        
        // 1. Basic Connection Test
        const result = await db.execute(sql`SELECT current_database(), current_user, version()`);
        console.log("Connection Successful! Info:", result.rows[0]);

        // 2. Test RLS Context Wrapper (if running against real DB with RLS)
        console.log("\nTesting RLS Context Wrapper...");
        const mockUserId = '00000000-0000-0000-0000-000000000000'; // Replace with a real UUID if testing locally
        
        await withUserTransaction(mockUserId, async (tx) => {
            const context = await tx.execute(sql`SELECT current_setting('request.jwt.claim.sub', true)`);
            console.log("Active Transaction User Context:", context.rows[0]);
            if (context.rows[0].current_setting === mockUserId) {
                console.log("SUCCESS: RLS user context successfully injected into transaction!");
            } else {
                console.warn("WARNING: RLS context mismatch.");
            }
        });
        
        process.exit(0);
    } catch (error) {
        console.error("Database test failed:", error);
        process.exit(1);
    }
}

verifyConnection();
