/**
 * AlignToolbar — barra flotante de alineación y distribución estilo Figma.
 * Aparece encima de la selección cuando hay 2+ nodos seleccionados.
 */
import {
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  GripHorizontal,
  GripVertical,
} from "lucide-react";
import { useStore, type AlignKind } from "../state/store";

const ALIGN_BTNS: { kind: AlignKind; icon: typeof AlignStartHorizontal; tip: string; shortcut: string }[] = [
  { kind: "left", icon: AlignStartHorizontal, tip: "Alinear izquierda", shortcut: "Alt+A" },
  { kind: "centerH", icon: AlignCenterHorizontal, tip: "Centrar horizontal", shortcut: "Alt+C" },
  { kind: "right", icon: AlignEndHorizontal, tip: "Alinear derecha", shortcut: "Alt+D" },
  { kind: "top", icon: AlignStartVertical, tip: "Alinear arriba", shortcut: "Alt+W" },
  { kind: "centerV", icon: AlignCenterVertical, tip: "Centrar vertical", shortcut: "Alt+M" },
  { kind: "bottom", icon: AlignEndVertical, tip: "Alinear abajo", shortcut: "Alt+S" },
];

export function AlignToolbar() {
  const selection = useStore((s) => s.selection);
  const alignSelection = useStore((s) => s.alignSelection);
  const distributeSelection = useStore((s) => s.distributeSelection);
  const previewMode = useStore((s) => s.previewMode);

  if (previewMode || selection.length < 2) return null;

  return (
    <div className="align-toolbar">
      {ALIGN_BTNS.map((btn) => {
        const Icon = btn.icon;
        return (
          <button
            key={btn.kind}
            className="align-btn"
            title={`${btn.tip} (${btn.shortcut})`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => alignSelection(btn.kind)}
          >
            <Icon size={14} strokeWidth={1.8} />
          </button>
        );
      })}
      <div className="align-sep" />
      <button
        className="align-btn"
        title="Distribuir horizontal (Alt+Shift+H)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => distributeSelection("h")}
      >
        <GripHorizontal size={14} strokeWidth={1.8} />
      </button>
      <button
        className="align-btn"
        title="Distribuir vertical (Alt+Shift+V)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => distributeSelection("v")}
      >
        <GripVertical size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}
