import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

async function runDeltaMigration() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        process.exit(1);
    }

    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
        console.log('Running delta migration...');

        // 1. Create camps table if it doesn't exist
        await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "camps" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "leader_id" uuid,
        "created_at" timestamp DEFAULT now()
      );
    `);
        console.log('Checked/Created camps table.');

        // 2. Add camp_id to members if it doesn't exist
        // We check existence first to avoid error
        await sql.unsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='camp_id') THEN
            ALTER TABLE "members" ADD COLUMN "camp_id" uuid REFERENCES "camps"("id");
        END IF;
      END $$;
    `);
        console.log('Checked/Added camp_id column.');

        // 3. Update Role Enum to include 'Shepherd'
        // Postgres allows adding values to enums safely
        await sql.unsafe(`
      ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'Shepherd';
    `);
        console.log('Updated role enum.');

        console.log('Delta validation complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sql.end();
    }
}

runDeltaMigration();
