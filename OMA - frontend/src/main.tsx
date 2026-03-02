
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  // Clean up old localStorage tokens (migration from localStorage to httpOnly cookies)
  localStorage.removeItem("auth_token");
  localStorage.removeItem("token");
  localStorage.removeItem("jwt");

  createRoot(document.getElementById("root")!).render(<App />);
  