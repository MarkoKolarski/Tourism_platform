import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("pages/HomePage.tsx"),
  route("users", "pages/UsersPage.tsx"),
  route("followers", "pages/FollowersPage.tsx"),
  route("purchase", "pages/PurchasePage.tsx"),
] satisfies RouteConfig;
