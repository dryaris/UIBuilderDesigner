/**
 * UI Forger — editor visual de UI/UX offline, agnóstico y multi-destino.
 * Fase 1: fundamentos tipo Figma (drag & drop, snapping, guías, atajos,
 * presets de pantalla con safe areas TV, undo/redo y autosave).
 */
import { Editor } from "./editor/Editor";
import { useEffect, useState } from "react";

/**
 * Detecta GPUs NVIDIA problemáticas mostrando información del renderer WebGL.
 * Si el renderer contiene "NVIDIA" + driver antiguo, sugerimos desactivar GPU.
 */
function detectGPU(): { isNvidia: boolean; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!ctx) return { isNvidia: false, renderer: "no-webgl" };
    const gl = ctx as WebGLRenderingContext;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return {
      isNvidia: String(renderer).toLowerCase().includes("nvidia"),
      renderer: String(renderer),
    };
  } catch {
    return { isNvidia: false, renderer: "error" };
  }
}

export default function App() {
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [gpuInfo, setGpuInfo] = useState<string>("");

  useEffect(() => {
    // Catch unhandled errors that indicate GPU rendering failure.
    const onError = (e: ErrorEvent) => {
      const msg = e.message || "";
      const isGPU =
        msg.includes("GPU") ||
        msg.includes("render") ||
        msg.includes("webgl") ||
        msg.includes("drawArrays") ||
        msg.includes("paint") ||
        msg.includes("Skia") ||
        msg.includes("OOM");
      if (isGPU) {
        setGpuError(msg);
        const { renderer } = detectGPU();
        setGpuInfo(renderer);
      }
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  // Show GPU error fallback screen
  if (gpuError) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#14161f",
          color: "#e8eaf2",
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 64,
            marginBottom: 16,
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: "0 0 8px",
          }}
        >
          Problema de rendering GPU detectado
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#9aa1b5",
            maxWidth: 560,
            lineHeight: 1.6,
            margin: "0 0 20px",
          }}
        >
          Tu GPU ({gpuInfo}) está causando problemas de rendering. Esto es
          conocido con ciertas GPUs NVIDIA en Windows.
        </p>
        <div
          style={{
            background: "#1b1e2a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "16px 24px",
            maxWidth: 560,
            textAlign: "left",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: "#ff6b9d" }}>Soluciones:</strong>
          <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>
              <strong>Abrir Chrome/Edge con:</strong>{" "}
              <code
                style={{
                  background: "rgba(124,92,255,0.18)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                --disable-gpu --disable-gpu-compositing
              </code>
            </li>
            <li>
              <strong>Actualizar drivers NVIDIA</strong> a versión 535+ desde
              nvidia.com
            </li>
            <li>
              <strong>En NVIDIA Control Panel:</strong> Configuración 3D →
              "Preferencia de procesamiento gráfico" → "Integrada"
            </li>
            <li>
              <strong>Abrir desde terminal con variable:</strong>{" "}
              <code
                style={{
                  background: "rgba(124,92,255,0.18)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                UIFORGER_DISABLE_GPU=1
              </code>
            </li>
          </ol>
        </div>
        <button
          onClick={() => {
            setGpuError(null);
          }}
          style={{
            marginTop: 20,
            padding: "10px 24px",
            background: "#7c5cff",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Intentar de todos modos
        </button>
      </div>
    );
  }

  return <Editor />;
}
