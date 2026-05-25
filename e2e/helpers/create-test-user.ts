import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local for Supabase connection + .env.test for user creds
dotenv.config({ path: resolve(__dirname, '../../.env.local') })
dotenv.config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const testUserEmail = process.env.E2E_TEST_USER_EMAIL
const testUserPassword = process.env.E2E_TEST_USER_PASSWORD

if (!supabaseUrl || !serviceRoleKey || !testUserEmail || !testUserPassword) {
  console.error(
    'Missing required env vars. Ensure .env.local and .env.test are configured.',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function createTestUser() {
  // Check if user already exists
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existing = users.find((u) => u.email === testUserEmail)

  if (existing) {
    console.log(`Test user already exists: ${testUserEmail}`)
    return
  }

  // Create user with auto-confirmed email
  const { data, error } = await supabase.auth.admin.createUser({
    email: testUserEmail,
    password: testUserPassword,
    email_confirm: true,
  })

  if (error) {
    console.error('Failed to create test user:', error.message)
    process.exit(1)
  }

  console.log(`Created test user: ${data.user.email}`)
}

createTestUser()
