import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 3000,
    strictPort: true,
    // The API runs on `nitro dev --port 3001`; proxying keeps the browser on
    // one origin, which better-auth's host and origin allowlists expect.
    proxy: { "/api": "http://localhost:3001" },
  },
});
