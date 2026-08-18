import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Frame, Type, Square, Circle, Minus, Layers as LayersIcon, ArrowUp, ArrowDown } from "lucide-react";
import { useStore } from "../state/store";
import type { Node } from "../core/ir";

export function Layers() {
  const root = useStore((s) => s.doc.root);
  const selection = useStore((s) => s.selection);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startRename = (id: string, name: string) => {
    setRenaming(id);
    setEditingName(name);
  };

  const commitRename = () => {
    if (renaming) useStore.getState().setNodeName(renaming, editingName.trim() || "Sin nombre");
    setRenaming(null);
  };

  const rows: ReactNode[] = [];
  const walk = (node: Node, depth: number) => {
    for (const child of node.children) {
      rows.push(
        <LayerRow
          key={child.id}
          node={child}
          depth={depth}
          selected={selection.includes(child.id)}
          renaming={renaming === child.id}
          editingName={editingName}
          onEditingName={setEditingName}
          onStartRename={startRename}
          onCommitRename={commitRename}
        />,
      );
      if (!child.hidden || child.children.length > 0) walk(child, depth + 1);
    }
  };
  walk(root, 0);

  return (
    <aside className="panel layers">
      <div className="panel-title">Capas</div>
      <div className="layers-body">{rows}</div>
    </aside>
  );
}

function LayerRow({
  node,
  depth,
  selected,
  renaming,
  editingName,
  onEditingName,
  onStartRename,
  onCommitRename,
}: {
  node: Node;
  depth: number;
  selected: boolean;
  renaming: boolean;
  editingName: string;
  onEditingName: (v: string) => void;
  onStartRename: (id: string, name: string) => void;
  onCommitRename: () => void;
}) {
  const st = useStore.getState();
  const Icon = typeIcon(node);
  return (
    <div
      className={`layer-row${selected ? " is-selected" : ""}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onPointerDown={(e) => {
        if (e.shiftKey) {
          const sel = useStore.getState().selection;
          useStore.getState().select(
            sel.includes(node.id) ? sel.filter((id) => id !== node.id) : [...sel, node.id],
          );
        } else {
          useStore.getState().select([node.id]);
        }
      }}
      onDoubleClick={() => onStartRename(node.id, node.name)}
    >
      <button
        className="layer-eye"
        title={node.hidden ? "Mostrar" : "Ocultar"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => st.toggleHidden(node.id)}
      >
        {node.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <span className={`layer-icon${node.hidden ? " dim" : ""}`}>
        <Icon size={13} strokeWidth={1.8} />
      </span>
      {renaming ? (
        <input
          className="layer-rename"
          autoFocus
          value={editingName}
          spellCheck={false}
          onChange={(e) => onEditingName(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCommitRename();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={`layer-name${node.hidden ? " dim" : ""}`}>{node.name}</span>
      )}
      {node.ref?.startsWith("comp:") && (
        <span className="layer-comp-badge" title="Instancia de componente">◆</span>
      )}
      {selected && (
        <span className="layer-reorder">
          <button
            className="icon-btn"
            title="Subir en el orden (auto-layout)"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              useStore.getState().reorderNode(node.id, -1);
            }}
          >
            <ArrowUp size={12} />
          </button>
          <button
            className="icon-btn"
            title="Bajar en el orden (auto-layout)"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              useStore.getState().reorderNode(node.id, 1);
            }}
          >
            <ArrowDown size={12} />
          </button>
        </span>
      )}
    </div>
  );
}

function typeIcon(node: Node) {
  switch (node.type) {
    case "text":
      return Type;
    case "shape":
      return node.shape === "ellipse" ? Circle : node.shape === "line" ? Minus : Square;
    case "frame":
      return node.children.length > 0 && node.name.startsWith("Grupo") ? LayersIcon : Frame;
    default:
      return Frame;
  }
}
