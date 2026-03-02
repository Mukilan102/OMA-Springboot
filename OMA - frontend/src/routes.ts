import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import InstructionPage from "./pages/InstructionPage";
import Survey from "./pages/Survey";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/instructions",
    Component: InstructionPage,
  },
  {
    path: "/survey",
    Component: Survey,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
]);
