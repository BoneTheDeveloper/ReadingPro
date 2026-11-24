import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/marketing.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  // Full-page checkout, outside the app chrome like a hosted payment page.
  route("checkout/:orderId", "routes/checkout.tsx"),
  layout("routes/dashboard-layout.tsx", [
    route("study", "routes/study/route.tsx"),
    route("vocabulary", "routes/vocabulary.tsx"),
    route("review", "routes/review.tsx"),
    route("account", "routes/account/layout.tsx", [
      index("routes/account/general.tsx"),
      route("billing", "routes/account/billing.tsx"),
      route("usage", "routes/account/usage.tsx"),
    ]),
    route("pricing", "routes/pricing.tsx"),
  ]),
] satisfies RouteConfig;
