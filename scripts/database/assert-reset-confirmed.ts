if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run prisma migrate reset with NODE_ENV=production.");
  process.exit(1);
}

// RESET_CONFIRM is a local destructive-operation guard for migration replay.
// It must never be set in production environments.
if (process.env.RESET_CONFIRM !== "true") {
  console.error("Set RESET_CONFIRM=true to confirm the destructive empty migration replay.");
  process.exit(1);
}
