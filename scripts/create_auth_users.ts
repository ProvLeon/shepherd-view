
import { createClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const connectionString = process.env.DATABASE_URL!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const client = postgres(connectionString, { prepare: false })
const db = drizzle(client)

async function main() {
    console.log('Synchronizing Auth Users...')

    try {
        const publicUsers = await db.select().from(users)

        for (const pUser of publicUsers) {
            console.log(`Processing ${pUser.email} (Current ID: ${pUser.id})`)

            // 1. Try to create Auth User
            const { data: authData, error: createError } = await supabase.auth.admin.createUser({
                email: pUser.email,
                password: 'Shepherd123',
                email_confirm: true,
                user_metadata: { role: pUser.role }
            })

            let authId = authData.user?.id

            if (createError) {
                console.log(`> Auth user creation note: ${createError.message}`)
                // If already exists, fetch ID
                if (createError.message.includes("already registered")) {
                    const { data: listData } = await supabase.auth.admin.listUsers() // simplified for small list
                    const found = listData.users.find(u => u.email === pUser.email)
                    if (found) authId = found.id
                }
            } else {
                console.log(`> Created Auth User: ${pUser.email}`)
            }

            if (authId) {
                console.log(`> Auth ID is: ${authId}`)

                if (authId !== pUser.id) {
                    console.log(`> Mismatch detected! Updating public.users ID...`)
                    // We need to update the ID.
                    // This requires updating children first if foreign keys exist?
                    // Or we use a raw query to update with cascade if configured?
                    // Drizzle update of PK:
                    // "Update users set id = authId where id = pUser.id"

                    // Note: If standard Supabase triggers are ON, they might have auto-inserted the user on creation?
                    // If so, we might have duplicate rows? unique constraint on email should prevent it.
                    // If `public.users.email` is unique, then `createUser` -> trigger -> insert public.user (fail? or valid?)
                    // If our auto-sync script already inserted it, the trigger interaction depends on implementation.

                    // Assuming we need to fix the ID:
                    try {
                        await client`UPDATE users SET id = ${authId}::uuid WHERE id = ${pUser.id}::uuid`
                        console.log(`> ID updated successfully.`)
                    } catch (updateErr: any) {
                        console.error(`> Failed to update ID: ${updateErr.message}`)
                        // Fallback: If violation (e.g. authId row already exists in public.users), 
                        // then maybe we should delete the 'temp' row and use the 'auth' row?
                        // But we want to keep the metadata (memberId, campId) we set.
                    }
                } else {
                    console.log(`> IDs match.`)
                }
            }
        }

    } catch (error) {
        console.error('Sync failed:', error)
    }

    console.log('Done. Default password is: password123')
    process.exit(0)
}

main()
