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
});
