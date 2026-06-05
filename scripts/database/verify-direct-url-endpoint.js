const fs = require("node:fs");

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error("Missing DIRECT_URL.");
  process.exit(1);
}

const directHost = new URL(directUrl).hostname;
const body = JSON.parse(fs.readFileSync("neon-endpoints.json", "utf8"));
const endpoints = body.endpoints ?? [];
const hosts = endpoints.flatMap((ep) =>
  [ep.host, ep.proxy_host].filter(Boolean),
);

if (!hosts.includes(directHost)) {
  console.error(
    `DIRECT_URL host ${directHost} does not match production branch endpoint hosts: ${hosts.join(", ") || "none"}`,
  );
  process.exit(1);
}

if (directHost.includes("-pooler.")) {
  console.error(
    "DIRECT_URL must use a direct Neon endpoint, not a pooled endpoint.",
  );
  process.exit(1);
}

console.log(`Verified DIRECT_URL host ${directHost} belongs to the production branch.`);
