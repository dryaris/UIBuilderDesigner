import { useStore } from "../state/store";
import { canvasElement } from "../canvas/pointer";
import { toWorld } from "../canvas/transform";

export function StatusBar() {
  const cursor = useStore((s) => s.cursor);
  const viewport = useStore((s) => s.viewport);
  const selection = useStore((s) => s.selection);
  const tool = useStore((s) => s.tool);
  const previewMode = useStore((s) => s.previewMode);
  const playing = useStore((s) => s.playing);
  const annotateMode = useStore((s) => s.annotateMode);
  const doc = useStore((s) => s.doc);
  const hasConnections = (doc.connections ?? []).length > 0;

  let world = null;
  const canvas = canvasElement.current;
  if (cursor && canvas) {
    world = toWorld(canvas, cursor.x, cursor.y, viewport);
  }

  return (
    <footer className="statusbar">
      <span className="status-hint">
        {annotateMode
          ? "Haz clic en la pantalla para colocar un pin de anotación · Esc cancela"
          : previewMode
            ? playing
              ? "Reproduciendo animación · pasea el cursor para probar estados · Esc para salir"
              : hasConnections
                ? "Pulsa un nodo conectado para navegar entre pantallas · Esc para salir"
                : "Modo preview · pasea el cursor para probar estados · Esc para salir"
            : tool === "select" && selection.length > 0
              ? "⌘D duplicar · ⌥A/D/W/S alinear · ⇧⌘C copiar estilo · Supr eliminar"
              : tool === "select" && "Selecciona, arrastra y suelta · doble clic edita texto"}
        {tool === "frame" && "Arrastra para crear una pantalla · click para un frame 120×120"}
        {tool === "text" && "Haz clic para escribir · Esc termina"}
        {tool === "hand" && "Arrastra para panear el lienzo"}
        {tool === "zoom" && "Arrastra para ampliar una zona · click para acercar"}
        {(tool === "rect" || tool === "ellipse" || tool === "line") && "Arrastra para dibujar la forma"}
      </span>
      <span className="status-spacer" />
      <span className="status-item">
        {selection.length === 1 ? doc.root.children.find((c) => c.id === selection[0])?.name ?? "1 nodo" : `${selection.length} nodos`}
      </span>
      <span className="status-item mono">
        {world ? `${Math.round(world.x)}, ${Math.round(world.y)}` : "—"}
      </span>
      <span className="status-item">{Math.round(viewport.zoom * 100)}%</span>
      <span className="status-hint dim">100% offline · autosave cada 3s</span>
    </footer>
  );
}
