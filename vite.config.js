import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend fijo: su subdominio en Render (se escribe "ultal"). Va aquí para que la
// dirección no dependa de las variables del hosting (Cloudflare Pages / Vercel).
const API_URL = "https://traumatologiaultalservices.icarticular.cl";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(API_URL),
  },
});
