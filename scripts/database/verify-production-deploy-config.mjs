const host = process.env.PRODUCTION_URL;
if (!host || host.includes("://")) {
  console.error("PRODUCTION_URL must be a bare host such as app.example.com.");
  process.exit(1);
}
new URL(`https://${host}`);
