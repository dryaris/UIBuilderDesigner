import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Plugin que elimina el atributo crossorigin de los tags <script> y <link>
 * en el HTML de producción. En hosts estáticos (Vercel, GitHub Pages),
 * crossorigin fuerza CORS y puede bloquear assets si el CDN no envía
 * los headers correctos.
 */
function stripCrossOrigin() {
  return {
    name: "strip-crossorigin",
    enforce: "post" as const,
    transformIndexHtml(html: string) {
      return html
        .replace(/(<script[^>]*?)\s+crossorigin(=["'][^"']*["'])?/g, "$1")
        .replace(/(<link[^>]*?)\s+crossorigin(=["'][^"']*["'])?/g, "$1")
        .replace(/\s{2,}/g, " ");
    },
  };
}

// Nota de plataforma: Freebuff requiere HMR deshabilitado y que el servidor
// escuche en 0.0.0.0 con el puerto inyectado por el entorno (PORT).
// No modificar server.hmr: false ni el bloque server sin motivo explícito.
export default defineConfig({
  plugins: [react(), stripCrossOrigin()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 5173),
    hmr: false,
  },
  build: {
    outDir: "dist",
    modulePreload: false,
  },
});
