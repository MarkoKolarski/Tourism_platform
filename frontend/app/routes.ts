import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("login", "pages/LoginPage.tsx"),
  index("pages/HomePage.tsx"),
  route("users", "pages/UsersPage.tsx"),
  route("followers", "pages/FollowersPage.tsx"),
  route("purchase", "pages/PurchasePage.tsx"),
  route("admin", "pages/AdminPage.tsx"),
  route("simulator", "pages/SimulatorPage.tsx"),
  route("blogs", "pages/BlogsPage.tsx"),
  route("blogs/create", "pages/CreateBlogPage.tsx"),
  route("blogs/:id", "pages/BlogDetailPage.tsx"),
  route("my-blogs", "pages/MyBlogsPage.tsx"),
  route("tours", "pages/ToursPage.tsx"),
  route("tours/create", "pages/CreateTourPage.tsx"),
  route("my-tours", "pages/MyToursPage.tsx"),
  route("tours/edit/:id", "pages/EditTourPage.tsx"),
  route("tours/:id", "pages/TourDetailPage.tsx"),
] satisfies RouteConfig;
