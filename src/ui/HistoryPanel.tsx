/**
 * HistoryPanel — panel visual de undo/redo.
 *
 * Muestra las entradas pasadas y futuras del historial, estilo Photoshop.
 * Cada entrada seuestra con un label legible (no la diff raw de Immer).
 * Permite saltar a cualquier punto del historial con un clic.
 */
import { memo, useCallback } from "react";
import { useStore } from "../state/store";

interface HistoryEntry {
  label: string;
  kind: "past" | "future";
  index: number;
}

/** Genera un label legible a partir de los patches de Immer. */
function describePatches(patches: { path: (string | number)[]; op: string }[]): string {
  if (patches.length === 0) return "Sin cambios";
  // Tomar el primer patch significativo para generar el label.

  // Navegar los patches para encontrar la acción más relevante.
  for (const p of patches) {
    const key = p.path[0];
    if (key === "root") {
      if (p.path.includes("children") && p.op === "add") return "Añadir nodo";
      if (p.path.includes("children") && p.op === "remove") return "Eliminar nodo";
      if (p.path.includes("style")) {
        const field = p.path[p.path.length - 1];
        if (typeof field === "string") {
          if (field === "x" || field === "y") return "Mover nodo";
          if (field === "width" || field === "height") return "Redimensionar";
          if (field.includes("color") || field === "backgroundColor") return "Cambiar color";
          if (field.includes("radius")) return "Cambiar radio";
          if (field === "opacity") return "Cambiar opacidad";
          return `Editar ${field}`;
        }
      }
    }
    if (key === "tokens") return "Editar tokens";
    if (key === "screens") return "Editar pantallas";
    if (key === "connections") return "Editar conexiones";
    if (key === "annotations") return "Editar anotaciones";
    if (key === "timelines") return "Editar timeline";
    if (key === "library") return "Editar librería";
    if (key === "themes") return "Editar temas";
  }

  // Fallback: descripción genérica.
  const ops = new Set(patches.map((p) => p.op));
  if (ops.has("add") && ops.has("remove")) return "Reordenar";
  if (ops.has("add")) return "Añadir";
  if (ops.has("remove")) return "Eliminar";
  if (ops.has("replace")) return "Editar";
  return "Cambios";
}

export const HistoryPanel = memo(function HistoryPanel() {
  const past = useStore((s) => s.history.past);
  const future = useStore((s) => s.history.future);
  const historyPanelOpen = useStore((s) => s.historyPanelOpen);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setHistoryPanelOpen = useStore((s) => s.setHistoryPanelOpen);

  const jumpTo = useCallback(
    (target: { kind: "past" | "future"; index: number }) => {
      const st = useStore.getState();
      if (target.kind === "past") {
        // Retroceder desde el final hasta el índice target.
        const stepsToUndo = st.history.past.length - target.index - 1;
        for (let i = 0; i < stepsToUndo; i++) st.undo();
      } else {
        // Avanzar desde el principio hasta el índice target.
        const stepsToRedo = st.history.future.length - target.index;
        for (let i = 0; i < stepsToRedo; i++) st.redo();
      }
    },
    [],
  );

  if (!historyPanelOpen) return null;

  const entries: HistoryEntry[] = [
    ...past.map((_, i) => ({ label: describePatches(past[i].patches), kind: "past" as const, index: i })),
    ...future.map((_, i) => ({ label: describePatches(future[i].patches), kind: "future" as const, index: i })),
  ];



  return (
    <div className="history-panel">
      <div className="history-header">
        <span className="history-title">Historial</span>
        <button
          className="history-close"
          onClick={() => setHistoryPanelOpen(false)}
          title="Cerrar historial"
        >
          ×
        </button>
      </div>
      <div className="history-list">
        {entries.length === 0 && (
          <div className="history-empty">Sin acciones</div>
        )}
        {entries.map((entry) => {
          const isCurrent = entry.kind === "past" && entry.index === past.length - 1;
          const isFuture = entry.kind === "future";
          return (
            <button
              key={`${entry.kind}-${entry.index}`}
              className={`history-item${isCurrent ? " history-current" : ""}${isFuture ? " history-future" : ""}`}
              onClick={() => jumpTo(entry)}
              title={isFuture ? "Saltar a esta acción (rehace)" : "Saltar a esta acción (deshace)"}
            >
              <span className="history-icon">{isFuture ? "○" : "●"}</span>
              <span className="history-label">{entry.label}</span>
            </button>
          );
        })}
      </div>
      <div className="history-footer">
        <button
          className="history-btn"
          onClick={undo}
          disabled={past.length === 0}
          title="Deshacer (Cmd+Z)"
        >
          ↶
        </button>
        <span className="history-count">
          {past.length} / {past.length + future.length}
        </span>
        <button
          className="history-btn"
          onClick={redo}
          disabled={future.length === 0}
          title="Rehacer (Cmd+Shift+Z)"
        >
          ↷
        </button>
      </div>
    </div>
  );
});
