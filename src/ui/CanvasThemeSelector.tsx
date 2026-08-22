/**
 * CanvasThemeSelector — Selector de tema del canvas (dark/light).
 * Cambia el fondo del canvas para diseñar UI de apps móviles sobre fondo claro.
 */
import { useStore } from "../state/store";

export function CanvasThemeSelector() {
  const theme = useStore((s) => s.canvasTheme);

  return (
    <button
      onClick={() => useStore.getState().setCanvasTheme(theme === "dark" ? "light" : "dark")}
      title={`Canvas: ${theme === "dark" ? "oscuro" : "claro"} (clic para cambiar)`}
      style={{
        padding: "2px 6px",
        fontSize: 12,
        background: "transparent",
        color: "var(--text-dim)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
