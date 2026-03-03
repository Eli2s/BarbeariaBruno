import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { mountVercelToolbar } from '@vercel/toolbar';

// Force dark mode
document.documentElement.classList.add('dark');

if (import.meta.env.VITE_VERCEL_ENV !== 'production') {
  mountVercelToolbar();
}

createRoot(document.getElementById("root")!).render(<App />);
