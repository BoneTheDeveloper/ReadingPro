import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({ path: process.env.PRISMA_ENV_FILE ?? ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
