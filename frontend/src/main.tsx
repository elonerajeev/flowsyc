import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root")!;

if (rootElement.innerHTML.trim()) {
  // Hydrate if SSR content exists
  hydrateRoot(rootElement, <App />);
} else {
  // Create root for CSR
  createRoot(rootElement).render(<App />);
}
