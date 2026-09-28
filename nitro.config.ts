import { fileURLToPath } from "node:url";
import { defineConfig } from "nitro";
import { securityHeaders } from "./src/server/security-headers";

export default defineConfig({
  // Without this, `nitro build` detects vite.config.ts, switches to the Vite
  // builder, and rebuilds (and empties) the React Router client output.
  builder: "rolldown",
  modules: ["workflow/nitro"],
  alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  routes: { "/api/**": "./src/server/app.ts" },
  devServer: { port: 3001 },
  routeRules: {
    "/**": { headers: securityHeaders(false) },
    // Hashed build output never changes under the same name.
    "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
  },
  // NODE_ENV is unset while `nitro build` loads this file, so the dev CSP
  // relaxations are keyed on the Nitro dev environment instead.
  $development: {
    routeRules: { "/**": { headers: securityHeaders(true) } },
  },
  // Serve the React Router client build (`react-router build` runs first).
  // The renderer is the lowest-priority catch-all, so the SPA fallback only
  // answers paths no API route or static file matched.
  $production: {
    publicAssets: [{ dir: "./build/client", baseURL: "/" }],
    renderer: { template: "./build/client/__spa-fallback.html", static: true },
  },
});
