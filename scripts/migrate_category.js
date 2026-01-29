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
        console.log('Applying migration 0003 (category enum and column)...');

        // Create Type if not exists
        await sql`
            DO $$ BEGIN
                CREATE TYPE category AS ENUM ('Student', 'Workforce', 'NSS', 'Alumni');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        // Add column
        await sql`
            ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "category" category DEFAULT 'Student';
        `;

        console.log('Migration 0003 applied.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
