import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("login", "pages/LoginPage.tsx"),
  index("pages/HomePage.tsx"),
  route("users", "pages/UsersPage.tsx"),
  route("followers", "pages/FollowersPage.tsx"),
  route("purchase", "pages/PurchasePage.tsx"),
  route("admin", "pages/AdminPage.tsx"),
] satisfies RouteConfig;
