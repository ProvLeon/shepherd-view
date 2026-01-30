import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function runMigration() {
    console.log('Running manual migration to add "guardian" column...');
    try {
        await client`ALTER TABLE members ADD COLUMN IF NOT EXISTS guardian text;`;
        console.log('Successfully added "guardian" column.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.end();
    }
}

runMigration();
