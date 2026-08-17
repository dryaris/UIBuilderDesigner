import {
  MousePointer2,
  Frame,
  Type,
  Square,
  Circle,
  Minus,
  Hand,
  ZoomIn,
} from "lucide-react";
import { useStore, type Tool } from "../state/store";

const TOOLS: { id: Tool; label: string; key: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Seleccionar", key: "V", icon: MousePointer2 },
  { id: "frame", label: "Frame / Pantalla", key: "F", icon: Frame },
  { id: "text", label: "Texto", key: "T", icon: Type },
  { id: "rect", label: "Rectángulo", key: "R", icon: Square },
  { id: "ellipse", label: "Elipse", key: "O", icon: Circle },
  { id: "line", label: "Línea", key: "L", icon: Minus },
  { id: "hand", label: "Mano (pan)", key: "H", icon: Hand },
  { id: "zoom", label: "Zoom", key: "Z", icon: ZoomIn },
];

export function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);

  return (
    <nav className="toolbar" aria-label="Herramientas">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className={`tool-btn${tool === t.id ? " is-active" : ""}`}
            title={`${t.label} (${t.key})`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTool(t.id)}
          >
            <Icon size={18} strokeWidth={1.8} />
          </button>
        );
      })}
    </nav>
  );
}
