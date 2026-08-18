/**
 * Canvas — el lienzo del editor.
 *
 * Un div .world aplica translate(pan) scale(zoom) y todos los nodos viven
 * dentro en unidades de diseño (px del proyecto). La conversión a pantalla
 * ocurre en los handlers (toWorld) y en Gizmos (toScreen).
 */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useStore } from "../state/store";
import { NodeView } from "./NodeView";
import { Gizmos } from "./Gizmos";
import { useCanvasPointer, canvasElement, handleCursor, hitAtClient } from "./pointer";

export function Canvas({
  openContextMenu,
}: {
  openContextMenu: (menu: { x: number; y: number; nodeId: string | null }) => void;
}) {
  const viewport = useStore((s) => s.viewport);
  const tool = useStore((s) => s.tool);
  const spaceDown = useStore((s) => s.spaceDown);
  const previewMode = useStore((s) => s.previewMode);
  const previewScreen = useStore((s) => s.previewScreen);
  const previewTransitionMs = useStore((s) => s.previewTransitionMs);
  const drag = useStore((s) => s.drag);
  const root = useStore((s) => s.doc.root);
  const activeRoot = previewMode && previewScreen ? previewScreen : root;
  const { onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick } = useCanvasPointer();

  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Mantiene el tamaño del canvas en el store (para fit y zoom-marquee).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      useStore.getState().updateCanvasSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cursor = previewMode
    ? "default"
    : drag?.kind === "pan"
      ? "grabbing"
      : spaceDown
        ? "grab"
      : tool === "hand"
        ? "grab"
        : tool === "select"
          ? handleCursor() ?? "default"
          : tool === "text"
            ? "text"
            : tool === "zoom"
              ? "zoom-in"
              : "crosshair";

  const spacing = Math.max(8, 24 * viewport.zoom);

  return (
    <div
      className="canvas"
      style={{
        cursor,
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
      }}
      ref={(el) => {
        ref.current = el;
        canvasElement.current = el;
        if (el) setReady(true);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => useStore.getState().setHover(null)}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e: MouseEvent) => {
        e.preventDefault();
        if (previewMode) return;
        const hit = hitAtClient(e.clientX, e.clientY);
        openContextMenu({ x: e.clientX, y: e.clientY, nodeId: hit ? hit.id : null });
      }}
    >
      <div
        className="world"
        style={{
          transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
        }}
      >
        <div
          key={activeRoot.id}
          className="screen-fade"
          style={{
            animationDuration:
              previewMode && previewTransitionMs ? `${previewTransitionMs}ms` : undefined,
          }}
        >
          <NodeView node={activeRoot} />
        </div>
      </div>
      {ready && <Gizmos canvasRef={ref} />}
    </div>
  );
}
