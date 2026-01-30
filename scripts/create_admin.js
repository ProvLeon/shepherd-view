// Script to create the first admin user
// Run with: node scripts/create_admin.js

import postgres from 'postgres'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import readline from 'readline'

const sql = postgres(process.env.DATABASE_URL)

// Get Supabase admin client
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Need service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  console.error('')
  console.error('Please add these to your .env file.')
  console.error('You can find the Service Role Key in Supabase Dashboard → Settings → API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function createAdmin() {
  console.log('🔐 Shepherd\'s View - Admin User Setup')
  console.log('=====================================\n')

  try {
    // Check if any admin exists
    const existingAdmins = await sql`
            SELECT * FROM users WHERE role = 'Admin' LIMIT 1
        `

    if (existingAdmins.length > 0) {
      console.log('⚠️  An admin user already exists:', existingAdmins[0].email)
      const proceed = await prompt('Create another admin? (y/n): ')
      if (proceed.toLowerCase() !== 'y') {
        console.log('Cancelled.')
        process.exit(0)
      }
    }

    // Get admin details
    const email = await prompt('Admin Email: ')
    const password = await prompt('Password (min 6 chars): ')

    if (!email || !password) {
      console.error('❌ Email and password are required')
      process.exit(1)
    }

    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters')
      process.exit(1)
    }

    console.log('\nCreating admin user...')

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error('❌ Auth error:', authError.message)
      process.exit(1)
    }

    console.log('✓ Auth user created')

    // Create user record in our database
    await sql`
            INSERT INTO users (id, email, role)
            VALUES (${authData.user.id}, ${email}, 'Admin')
        `

    console.log('✓ Database record created')

    console.log('\n✅ Admin user created successfully!')
    console.log('=====================================')
    console.log('Email:', email)
    console.log('Role: Admin')
    console.log('\nYou can now log in at /login')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    rl.close()
    await sql.end()
  }
}

createAdmin()
