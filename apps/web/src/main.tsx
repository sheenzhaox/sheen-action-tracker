import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Dark is the default; follow the system preference until a manual toggle exists (MASTER §2).
const light = window.matchMedia("(prefers-color-scheme: light)");
const applyTheme = () => document.documentElement.classList.toggle("dark", !light.matches);
applyTheme();
light.addEventListener("change", applyTheme);

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
