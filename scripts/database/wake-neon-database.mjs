import net from "node:net";

function parseHost(connectionUrl) {
  try {
    const u = new URL(connectionUrl);
    return { host: u.hostname, port: parseInt(u.port) || 5432 };
  } catch {
    return null;
  }
}

const config = parseHost(process.env.DIRECT_URL);
if (!config) {
  console.error("DIRECT_URL is not set or invalid.");
  process.exit(1);
}

const maxAttempts = 15;
const delayMs = 2000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  process.stdout.write(`Wake attempt ${attempt}/${maxAttempts}... `);
  const reached = await new Promise((resolve) => {
    const sock = net.createConnection(config.port, config.host, () => {
      sock.end();
      resolve(true);
    });
    sock.setTimeout(5000, () => {
      sock.destroy();
      resolve(false);
    });
    sock.on("error", () => {
      sock.destroy();
      resolve(false);
    });
  });

  if (reached) {
    console.log("OK — TCP reachable.");
    console.log("Waiting 3s for PostgreSQL to finish initializing...");
    await new Promise((r) => setTimeout(r, 3000));
    process.exit(0);
  }

  console.log("not ready.");
  if (attempt < maxAttempts) {
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

console.error(`Database not reachable after ${maxAttempts} attempts.`);
process.exit(1);
