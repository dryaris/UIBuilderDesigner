import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Nota de plataforma: Freebuff requiere HMR deshabilitado y que el servidor
// escuche en 0.0.0.0 con el puerto inyectado por el entorno (PORT).
// No modificar server.hmr: false ni el bloque server sin motivo explícito.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 5173),
    hmr: false,
  },
  build: {
    outDir: "dist",
  },
});
