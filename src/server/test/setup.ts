import { afterAll } from "vitest";
import { pool } from "@/server/lib/db";

// An open pool keeps the worker alive after the file's tests finish.
afterAll(() => pool.end());
