/**
 * UI Forger — editor visual de UI/UX offline, agnóstico y multi-destino.
 */
import { Editor } from "./editor/Editor";
import { Component, useEffect, type ReactNode } from "react";
import { installGlobalErrorHooks, logGpu } from "./core/logger";

/** Error boundary que captura errores de render y los muestra en pantalla. */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 40,
            color: "#f87171",
            background: "#14161f",
            minHeight: "100vh",
            fontFamily: "monospace",
          }}
        >
          <h1 style={{ color: "#f87171", fontSize: 20 }}>
            ⚠️ Error al cargar UI Forger
          </h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#1b1e2a",
              padding: 16,
              borderRadius: 8,
              marginTop: 16,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    installGlobalErrorHooks();
  }, []);

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
      // Silently ignore
    }
  }, []);

  return (
    <ErrorBoundary>
      <Editor />
    </ErrorBoundary>
  );
}
