import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function runMigrations() {
    try {
        console.log('Applying migration 0001 (events columns)...');
        await sql`
            ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meeting_url" text;
        `;
        await sql`
            ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_recurring" text;
        `;
        console.log('Migration 0001 applied.');

        console.log('Applying migration 0002 (settings table)...');
        await sql`
            CREATE TABLE IF NOT EXISTS "settings" (
                "key" text PRIMARY KEY NOT NULL,
                "value" text NOT NULL,
                "updated_at" timestamp DEFAULT now()
            );
        `;
        console.log('Migration 0002 applied.');

        console.log('All migrations applied successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
