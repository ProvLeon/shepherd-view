import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        process.exit(1);
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
        const migrationPath = path.join(__dirname, '../supabase/migrations/0000_bizarre_paibok.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        // Split by statement-breakpoint as per drizzle-kit format
        const statements = migrationSql.split('--> statement-breakpoint');

        console.log('Running migration...');

        for (const statement of statements) {
            const trimmed = statement.trim();
            if (trimmed.length > 0) {
                await sql.unsafe(trimmed);
            }
        }

        console.log('Migration applied successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sql.end();
    }
}

runMigration();
