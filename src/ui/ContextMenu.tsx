import { useEffect, useRef, type ReactNode } from "react";
import { Copy, ClipboardPaste, Trash2, Frame, Group, Layers, CornerDownRight } from "lucide-react";
import { useStore } from "../state/store";
import { findNode } from "../core/tree";

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string | null;
}

export function ContextMenu({
  menu,
  onClose,
}: {
  menu: ContextMenuState | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
    };
  }, [menu, onClose]);

  if (!menu) return null;
  const st = useStore.getState();
  const node = menu.nodeId ? findNode(st.doc.root, menu.nodeId) : null;
  const hasSelection = st.selection.length > 0;

  const item = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    shortcut?: string,
    danger = false,
  ) => (
    <button
      key={label}
      className={`ctx-item${danger ? " is-danger" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="ctx-icon">{icon}</span>
      <span className="ctx-label">{label}</span>
      {shortcut && <span className="ctx-shortcut">{shortcut}</span>}
    </button>
  );

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: menu.x, top: menu.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {node
        ? [
            item("Duplicar", <Copy size={14} />, () => st.duplicateSelection(), "⌘D"),
            item("Envolver en frame", <CornerDownRight size={14} />, () => st.groupSelection("Frame"), undefined, false),
            item("Agrupar", <Group size={14} />, () => st.groupSelection("Grupo"), "⌘G"),
            item("Copiar estilo", <Copy size={14} />, () => st.copyStyle(), "⇧⌘C"),
            item("Pegar estilo", <ClipboardPaste size={14} />, () => st.pasteStyle(), "⇧⌘V"),
            item("Eliminar", <Trash2 size={14} />, () => st.deleteSelection(), "Supr", true),
          ]
        : [
            item("Seleccionar todo", <Layers size={14} />, () => {
              const s = useStore.getState();
              s.select(s.doc.root.children.filter((n) => !n.hidden).map((n) => n.id));
            }, "⌘A"),
            item("Pegar estilo", <ClipboardPaste size={14} />, () => st.pasteStyle(), "⇧⌘V"),
            item("Nuevo frame", <Frame size={14} />, () => st.setTool("frame")),
          ]}
      {!hasSelection && node && <div className="ctx-divider" />}
      <div className="ctx-hint dim">
        {node ? node.name : "Lienzo"}
      </div>
    </div>
  );
}
