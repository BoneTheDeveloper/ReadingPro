import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Dev targets .env.local by default. Prod-from-local commands set
// PRISMA_ENV_FILE=.env.prod to point the same CLI at the production branch.
dotenv.config({ path: process.env.PRISMA_ENV_FILE ?? ".env.local" });
export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
