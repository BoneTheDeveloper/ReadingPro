"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

export function VercelSpeedInsights() {
  return (
    <SpeedInsights
      beforeSend={(data) => {
        // In a next-intl App Router setup, Next.js will report the route as "/[locale]/..."
        // We strip the locale parameter prefix from the route so that Speed Insights 
        // aggregates metrics for the same logical page across all languages.
        if (data.route) {
          data.route = data.route.replace(/^\/\[locale\]/, "") || "/";
        }
        return data;
      }}
    />
  );
}
