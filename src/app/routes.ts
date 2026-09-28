import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/marketing.tsx"),
  route("login", "routes/login.tsx"),
  layout("routes/dashboard-layout.tsx", [
    route("study", "routes/study.tsx"),
    route("vocabulary", "routes/vocabulary.tsx"),
    route("account", "routes/account.tsx"),
  ]),
] satisfies RouteConfig;
