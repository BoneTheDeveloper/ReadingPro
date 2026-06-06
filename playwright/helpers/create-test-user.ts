import { clerkClient } from "@clerk/nextjs/server";
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(__dirname, "../../.env.local") });
dotenv.config({ path: resolve(__dirname, "../../.env.test") });

// E2E_TEST_USER_* are Playwright helper inputs, normally stored in .env.test or
// CI secrets. They are not required by the application runtime.
const testUserEmail = process.env.E2E_TEST_USER_EMAIL;
const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;

if (!process.env.CLERK_SECRET_KEY || !testUserEmail || !testUserPassword) {
  console.error(
    "Missing CLERK_SECRET_KEY, E2E_TEST_USER_EMAIL, or E2E_TEST_USER_PASSWORD.",
  );
  process.exit(1);
}

async function createTestUser() {
  const client = await clerkClient();
  const existing = await client.users.getUserList({
    emailAddress: [testUserEmail!],
    limit: 1,
  });

  if (existing.data.length > 0) {
    console.log(`Test user already exists: ${testUserEmail}`);
    return;
  }

  const user = await client.users.createUser({
    emailAddress: [testUserEmail!],
    password: testUserPassword!,
    skipPasswordChecks: true,
  });

  console.log(`Created Clerk test user: ${user.primaryEmailAddress?.emailAddress}`);
}

createTestUser();
