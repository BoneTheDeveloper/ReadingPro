# Supabase + Playwright E2E Testing Implementation Guide

**Sources:**
- [Supawright GitHub Repository](https://github.com/isaacharrisholt/supawright)
- [Supabase Community E2E Tests](https://github.com/supabase-community/e2e)

## 1. Programmatic User Creation

### Option A: Admin API (Recommended for CI)

```typescript
// tests/utils/setup.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.SUPABASE_SERVICE_ROLE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function createTestUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email confirmation for tests
    user_metadata: { is_test_user: true }
  })
  
  if (error) throw new Error(`Failed to create test user: ${error.message}`)
  
  return data.user
}
```

### Option B: Direct Signup (Development Only)

```typescript
export async function createTestUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: 'http://localhost:3000/auth/callback' }
  })
  
  if (error && !error.message.includes('already registered')) {
    throw error
  }
  
  return data.user
}
```

## 2. Authentication Setup in Playwright

### Test Configuration

```typescript
// tests/auth.setup.ts
import { createBrowserContext } from './utils/playwright'

export async function setupAuthenticatedUser(email: string, password: string) {
  // Create test user
  const user = await createTestUser(email, password)
  
  // Sign in via API to get session
  const { data } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (!data.session) throw new Error('Failed to create session')
  
  // Inject session into browser
  const context = await createBrowserContext()
  await context.addInitScript((session) => {
    document.cookie = `supabase-auth-token=${session.access_token}; path=/;`
  }, data.session)
  
  return { context, user }
}
```

### Storage State Pattern

```typescript
// tests/utils/auth.ts
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

export async function createAuthStorageState(email: string, password: string) {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  
  // Navigate to sign-in page
  await context.goto('/en/sign-in')
  
  // Fill and submit form
  await context.fill('input[type="email"]', email)
  await context.fill('input[type="password"]', password)
  await context.click('button[type="submit"]')
  
  // Wait for navigation
  await context.waitForURL('/')
  
  // Save storage state
  const storageState = await context.storageState()
  writeFileSync(`./tests/storage/${email.replace(/[^a-zA-Z0-9]/g, '-')}.json`, JSON.stringify(storageState))
  
  await browser.close()
  return storageState
}
```

## 3. Session Management

### Cookie-Based Session Injection

```typescript
// tests/utils/session.ts
import { readFileSync } from 'fs'

export async function injectSession(context: BrowserContext, userEmail: string) {
  const storageState = JSON.parse(readFileSync(`./tests/storage/${userEmail}.json`, 'utf-8'))
  
  // Inject cookies
  for (const cookie of storageState.cookies) {
    await context.addCookie(cookie)
  }
  
  // Inject localStorage items
  await context.addInitScript((storage) => {
    Object.entries(storage).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value))
    })
  }, storageState.origins[0]?.localStorage || {})
}
```

## 4. Test Data Seeding

### Prisma + Supabase Integration

```typescript
// tests/utils/seeds.ts
import { prisma } from '@/lib/prisma'

export async function seedTestData(userId: string) {
  // Create test passages
  const passages = await prisma.passage.createMany({
    data: [
      {
        title: 'Test Passage 1',
        content: 'This is a test passage for E2E testing...',
        originalLevel: 'A1',
        wordCount: 50,
        userId
      },
      {
        title: 'Test Passage 2',
        content: 'Another test passage with more complex content...',
        originalLevel: 'C1',
        wordCount: 100,
        userId
      }
    ]
  })
  
  // Create test flashcards
  const flashcards = await prisma.flashcard.createMany({
    data: [
      {
        question: 'What is the capital of France?',
        correctAnswer: 'Paris',
        wrongAnswers: ['London', 'Berlin', 'Madrid'],
        passageId: (await prisma.passage.findFirst({ where: { userId } }))?.id || ''
      }
    ]
  })
  
  return { passages, flashcards }
}
```

## 5. Local vs Remote Testing

### Local Development (supabase start)

```bash
# Start local Supabase
supabase start

# Use local database URL in tests
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Remote Test Project

```typescript
// .env.test
SUPABASE_TEST_URL=your-test-project-url
SUPABASE_TEST_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 6. Test Examples

### Complete Auth Flow Test

```typescript
// tests/auth.test.ts
import { test, expect } from '@playwright/test'
import { setupAuthenticatedUser, seedTestData } from './utils/auth'

test.describe('User Authentication', () => {
  test('complete user flow', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    
    // Setup authenticated user
    const { context } = await setupAuthenticatedUser(testEmail, testPassword)
    const page = await context.newPage()
    
    // Seed test data
    await seedTestData(/* user ID from setup */)
    
    // Test authenticated routes
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Test study functionality
    await page.goto('/study')
    await page.fill('textarea', 'Test passage content for E2E...')
    await page.click('button:has-text("Continue")')
    
    // Verify analysis results
    await expect(page.locator('.passage-title')).toContainText('Pasted Text')
    await expect(page.locator('.question-card')).toBeVisible()
  })
})
```

## 7. Cleanup

```typescript
// tests/utils/cleanup.ts
export async function cleanupTestUsers() {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  
  for (const user of users.users) {
    if (user.user_metadata?.is_test_user) {
      await supabaseAdmin.auth.admin.deleteUser(user.id)
    }
  }
}
```

## Key Recommendations

1. **Use Admin API for CI**: More reliable than browser automation
2. **Storage State Pattern**: Fast test setup via saved authentication state
3. **Local Development**: Use `supabase start` for local testing
4. **User Metadata**: Mark test users with `is_test_user: true` for cleanup
5. **Session Injection**: Use `addInitScript` for complex auth flows
6. **Environment Separation**: Use `.env.test` for test credentials