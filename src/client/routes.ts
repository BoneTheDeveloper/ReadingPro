import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/marketing.tsx"),
  route("login", "routes/login.tsx"),
  layout("routes/dashboard-layout.tsx", [
    route("study", "routes/study/route.tsx"),
    route("vocabulary", "routes/vocabulary.tsx"),
    route("review", "routes/review.tsx"),
    route("account", "routes/account.tsx"),
  ]),
] satisfies RouteConfig;
