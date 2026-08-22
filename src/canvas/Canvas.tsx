/**
 * Canvas — el lienzo del editor.
 *
 * Un div .world aplica translate(pan) scale(zoom) y todos los nodos viven
 * dentro en unidades de diseño (px del proyecto). La conversión a pantalla
 * ocurre en los handlers (toWorld) y en Gizmos (toScreen).
 */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useStore } from "../state/store";
import { toWorld } from "./transform";
import { NodeView } from "./NodeView";
import { Gizmos } from "./Gizmos";
import { useCanvasPointer, canvasElement, handleCursor } from "./pointer";
import { ProfilingOverlay } from "../ui/ProfilingOverlay";
import { isFigmaJson } from "../import/figma";
import { MiniMap } from "../ui/MiniMap";

export function Canvas() {
  const viewport = useStore((s) => s.viewport);
  const tool = useStore((s) => s.tool);
  const spaceDown = useStore((s) => s.spaceDown);
  const previewMode = useStore((s) => s.previewMode);
  const annotateMode = useStore((s) => s.annotateMode);
  const previewScreen = useStore((s) => s.previewScreen);
  const previewTransitionMs = useStore((s) => s.previewTransitionMs);
  const previewTransitionKind = useStore((s) => s.previewTransitionKind);
  const drag = useStore((s) => s.drag);
  const root = useStore((s) => s.doc.root);
  const screens = useStore((s) => s.screens);
  const multiScreenMode = useStore((s) => s.multiScreenMode);
  const activeRoot = previewMode && previewScreen ? previewScreen : root;
  const { onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick } = useCanvasPointer();

  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Mantiene el tamaño del canvas en el store (para fit y zoom-marquee)
  // y marca el canvas como "ready" cuando el ref está montado.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    canvasElement.current = el;
    setReady(true);
    const ro = new ResizeObserver(() => {
      useStore.getState().updateCanvasSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cursor = previewMode
    ? "default"
    : annotateMode
      ? "crosshair"
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
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => useStore.getState().setHover(null)}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onDragOver={(e) => {
        if (previewMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (previewMode) return;
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          useStore.getState().showToast("Archivo demasiado grande (máx 5 MB)");
          return;
        }
        const isImage = file.type.startsWith("image/");
        const isSvg = file.name.endsWith(".svg") || file.type === "image/svg+xml";
        const isFigma = file.name.endsWith(".json") || file.name.endsWith(".fig.json");
        const canvas = canvasElement.current;
        if (!canvas) return;
        const st = useStore.getState();
        const wp = toWorld(canvas, e.clientX, e.clientY, st.viewport);
        if (isImage && !isSvg) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result ?? "");
            // Crear imagen temporal para obtener dimensiones originales.
            const img = new Image();
            img.onload = () => {
              const maxDim = 600;
              let w = img.naturalWidth;
              let h = img.naturalHeight;
              if (w > maxDim || h > maxDim) {
                const scale = maxDim / Math.max(w, h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
              }
              useStore.getState().addImage(dataUrl, wp, file.name.replace(/\.[^.]+$/, ""), w, h);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        } else if (isFigma) {
          const reader = new FileReader();
          reader.onload = () => {
            const text = String(reader.result ?? "");
            if (isFigmaJson(text)) {
              const err = st.importFigma(text, file.name.replace(/\.fig?\.json$/i, ""));
              if (err) st.showToast(err);
            }
          };
          reader.readAsText(file);
        } else if (isSvg) {
          const reader = new FileReader();
          reader.onload = () => {
            const text = String(reader.result ?? "");
            const err = st.importSvg(text, wp, file.name.replace(/\.svg$/i, ""));
            if (err) st.showToast(err);
          };
          reader.readAsText(file);
        }
      }}
      onContextMenu={(e: MouseEvent) => {
        // Clic derecho = paneo (estilo Unity/Godot), no menú contextual.
        e.preventDefault();
      }}
    >
      <div
        className="world"
        style={{
          transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
        }}
      >
        {multiScreenMode && !previewMode ? (
          <MultiScreenView root={root} screens={screens} />
        ) : (
          <div
            key={activeRoot.id}
            className={`screen-fade${previewMode && previewTransitionKind ? ` screen-transition-${previewTransitionKind}` : ""}`}
            style={{
              animationDuration:
                previewMode && previewTransitionMs ? `${previewTransitionMs}ms` : undefined,
            }}
          >
            <NodeView node={activeRoot} />
          </div>
        )}
      </div>
      {ready && <Gizmos canvasRef={ref} />}
      {!previewMode && <MiniMap />}
      {!previewMode && <ProfilingOverlay />}
    </div>
  );
}

/** Vista multi-pantalla: muestra todas las pantallas lado a lado. */
function MultiScreenView({ root, screens }: { root: import("../core/ir").Node; screens: import("../core/ir").Node[] }) {
  const gap = 60;
  const allScreens = [root, ...screens];
  let xOffset = 0;

  return (
    <>
      {allScreens.map((screen) => {
        const x = xOffset;
        xOffset += screen.style.width + gap;
        return (
          <div key={screen.id} style={{ position: "absolute", left: x, top: 0 }}>
            <div
              className="multi-screen-label"
              style={{
                position: "absolute",
                top: -24,
                left: 0,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-dim)",
                whiteSpace: "nowrap",
              }}
            >
              {screen.name}
            </div>
            <div style={{
              position: "relative",
              width: screen.style.width,
              height: screen.style.height,
              background: screen.style.backgroundColor ?? "#1a1c26",
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}>
              <NodeView node={screen} />
            </div>
          </div>
        );
      })}
    </>
  );
}
