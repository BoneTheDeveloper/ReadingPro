import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src/app",
  buildDirectory: "build",
  ssr: false,
  // Only the landing page needs SEO; every other path loads the SPA fallback.
  prerender: ["/"],
} satisfies Config;
