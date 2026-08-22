/**
 * UI Forger — editor visual de UI/UX offline, agnóstico y multi-destino.
 * Fase 1: fundamentos tipo Figma (drag & drop, snapping, guías, atajos,
 * presets de pantalla con safe areas TV, undo/redo y autosave).
 */
import { Editor } from "./editor/Editor";
import { useEffect } from "react";
import { installGlobalErrorHooks, logGpu } from "./core/logger";

export default function App() {
  // Instalar hooks de logging globales al montar
  useEffect(() => { installGlobalErrorHooks(); }, []);

  // Log GPU renderer info for diagnostics (does NOT block the app).
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (ctx) {
        const gl = ctx as WebGLRenderingContext;
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        const vendor = ext
          ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
          : gl.getParameter(gl.VENDOR);
        logGpu(
          `GPU detected: ${String(renderer)} (${String(vendor)})`,
          "gpu-detection",
        );
      }
    } catch {
      // Silently ignore — web app works regardless of GPU detection.
    }
  }, []);

  return <Editor />;
}
