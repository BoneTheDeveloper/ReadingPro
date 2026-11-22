// Creates the local test accounts used by `pnpm test:e2e`, for manual checks
// in the browser too. Refuses any database that is not on this machine.
//
//   pnpm db:seed-test-accounts
import { TEST_ACCOUNTS, TEST_PASSWORD, seedTestAccounts } from "../e2e/test-accounts.ts";

seedTestAccounts()
  .then(() => {
    console.log("Test accounts ready (password for all: " + TEST_PASSWORD + "):");
    for (const account of Object.values(TEST_ACCOUNTS)) {
      console.log(`  ${account.tier.padEnd(4)}  ${account.login}  (${account.email})`);
    }
    console.log("Note: `pnpm test` deletes them; run this again afterwards.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
