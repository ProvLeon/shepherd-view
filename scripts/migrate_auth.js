// Migration script for authentication and follow-up tables
// Run with: node scripts/migrate_auth.js

import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL)

async function migrate() {
    console.log('🚀 Starting authentication tables migration...')

    try {
        // Create user_role enum
        console.log('Creating user_role enum...')
        await sql`
            DO $$ BEGIN
                CREATE TYPE user_role AS ENUM ('Admin', 'Leader', 'Shepherd');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `

        // Create follow_up_type enum
        console.log('Creating follow_up_type enum...')
        await sql`
            DO $$ BEGIN
                CREATE TYPE follow_up_type AS ENUM ('Call', 'WhatsApp', 'Prayer', 'Visit', 'Other');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `

        // Create follow_up_outcome enum
        console.log('Creating follow_up_outcome enum...')
        await sql`
            DO $$ BEGIN
                CREATE TYPE follow_up_outcome AS ENUM ('Reached', 'NoAnswer', 'ScheduledCallback');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `

        // Create users table
        console.log('Creating users table...')
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                role user_role NOT NULL DEFAULT 'Shepherd',
                member_id UUID REFERENCES members(id),
                camp_id UUID REFERENCES camps(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `

        // Create follow_ups table
        console.log('Creating follow_ups table...')
        await sql`
            CREATE TABLE IF NOT EXISTS follow_ups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                member_id UUID NOT NULL REFERENCES members(id),
                user_id UUID NOT NULL REFERENCES users(id),
                type follow_up_type NOT NULL,
                notes TEXT,
                outcome follow_up_outcome,
                scheduled_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `

        // Create member_assignments table
        console.log('Creating member_assignments table...')
        await sql`
            CREATE TABLE IF NOT EXISTS member_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                member_id UUID NOT NULL REFERENCES members(id),
                shepherd_id UUID NOT NULL REFERENCES users(id),
                assigned_at TIMESTAMP DEFAULT NOW()
            );
        `

        // Create indexes for performance
        console.log('Creating indexes...')
        await sql`CREATE INDEX IF NOT EXISTS idx_follow_ups_member ON follow_ups(member_id);`
        await sql`CREATE INDEX IF NOT EXISTS idx_follow_ups_user ON follow_ups(user_id);`
        await sql`CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(scheduled_at) WHERE completed_at IS NULL;`
        await sql`CREATE INDEX IF NOT EXISTS idx_member_assignments_member ON member_assignments(member_id);`
        await sql`CREATE INDEX IF NOT EXISTS idx_member_assignments_shepherd ON member_assignments(shepherd_id);`

        console.log('✅ Migration completed successfully!')
    } catch (error) {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    } finally {
        await sql.end()
    }
}

migrate()
