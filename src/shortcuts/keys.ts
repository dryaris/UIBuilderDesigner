/**
 * Atajos de teclado — memoria muscular de Figma (requisito de Fase 1):
 *  - Espacio (mantenido) = pan
 *  - Cmd/Ctrl + scroll = zoom (manejado en Canvas)
 *  - Flechas = nudge 1px · Shift+Flechas = 10px
 *  - Cmd/Ctrl + D = duplicar · Cmd/Ctrl + Z = undo · Cmd/Ctrl + Shift+Z / Y = redo
 *  - Cmd/Ctrl + A = seleccionar todo · Cmd/Ctrl + G = agrupar · Shift+G = desagrupar
 *  - Cmd/Ctrl + Shift + C / V = copiar / pegar estilo
 *  - Cmd/Ctrl + K = palette de acciones · Cmd/Ctrl + S = guardar .canvas
 *  - V/F/T/R/O/L/H/Z = herramientas · Shift+1 = fit · Shift+0 = 100%
 */
import { useEffect } from "react";
import { useStore } from "../state/store";
import { nodeRect } from "../core/tree";
import { saveProjectFile, openProjectFile } from "../export/project";

const TOOL_KEYS: Record<string, "select" | "frame" | "text" | "rect" | "ellipse" | "line" | "hand" | "zoom"> = {
  v: "select",
  f: "frame",
  t: "text",
  r: "rect",
  o: "ellipse",
  l: "line",
  h: "hand",
  z: "zoom",
};

export function useKeyboard(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const st = useStore.getState();
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl+K siempre disponible (incluso escribiendo).
      if (mod && key === "k") {
        e.preventDefault();
        st.setPaletteOpen(!st.paletteOpen);
        return;
      }
      if (typing) {
        if (e.key === "Escape") (target as HTMLElement).blur();
        return;
      }

      if (e.code === "Space") {
        if (!e.repeat) {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur?.();
          st.setSpaceDown(true);
        }
        return;
      }

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        st.duplicateSelection();
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        st.select(st.doc.root.children.filter((n) => !n.hidden).map((n) => n.id));
        return;
      }
      if (mod && key === "g") {
        e.preventDefault();
        if (e.shiftKey) st.ungroupSelection();
        else st.groupSelection(groupName());
        return;
      }
      if (mod && e.shiftKey && key === "c") {
        e.preventDefault();
        st.copyStyle();
        return;
      }
      if (mod && e.shiftKey && key === "v") {
        e.preventDefault();
        st.pasteStyle();
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        void saveProjectFile(st.doc);
        st.showToast("Proyecto .canvas guardado");
        return;
      }
      if (mod && e.shiftKey && key === "o") {
        e.preventDefault();
        void openProjectAndReplace();
        return;
      }

      if (e.key === "Escape") {
        st.setDrag(null);
        if (st.paletteOpen) st.setPaletteOpen(false);
        else if (st.editingTextId) st.setEditingText(null);
        else st.select([]);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        st.deleteSelection();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        st.nudgeSelection(dx, dy);
        return;
      }
      if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        st.fitTo(nodeRect(st.doc.root));
        return;
      }
      if (e.shiftKey && e.key === "0") {
        e.preventDefault();
        st.zoomTo(1, { x: st.viewport.size.x / 2, y: st.viewport.size.y / 2 });
        return;
      }
      const tool = TOOL_KEYS[key];
      if (tool && !mod) {
        st.setTool(tool);
        return;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") useStore.getState().setSpaceDown(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}

function groupName(): string {
  const st = useStore.getState();
  const n = st.selection.length > 1 ? "Grupo" : "Frame";
  return `${n} ${st.doc.root.children.length + 1}`;
}

async function openProjectAndReplace(): Promise<void> {
  try {
    const doc = await openProjectFile();
    useStore.getState().replaceDoc(doc);
    useStore.getState().fitTo(nodeRect(doc.root));
    useStore.getState().showToast("Proyecto abierto");
  } catch (err) {
    useStore.getState().showToast(err instanceof Error ? err.message : "No se pudo abrir el proyecto");
  }
}
