/**
 * MiniMap — vista de pájaro del canvas en la esquina inferior izquierda.
 * Muestra todos los nodos de primer nivel como rects proporcionales;
 * el rect de vista actual (viewport) se dibuja como borde azul.
 * Arrastrar dentro del minimap mueve el pan del canvas.
 */
import { useRef, useCallback } from "react";
import { useStore } from "../state/store";
import type { Node } from "../core/ir";

const MINIMAP_W = 180;
const MINIMAP_H = 120;
const PAD = 12;

/** Calcula el bbox global de todos los nodos visibles. */
function globalBounds(root: Node): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = 0, minY = 0, maxX = root.style.width, maxY = root.style.height;
  function walk(n: Node) {
    if (n.hidden) return;
    minX = Math.min(minX, n.style.x);
    minY = Math.min(minY, n.style.y);
    maxX = Math.max(maxX, n.style.x + n.style.width);
    maxY = Math.max(maxY, n.style.y + n.style.height);
    for (const c of n.children) walk(c);
  }
  for (const c of root.children) walk(c);
  return { minX, minY, maxX, maxY };
}

export function MiniMap() {
  const root = useStore((s) => s.doc.root);
  const screens = useStore((s) => s.screens);
  const vp = useStore((s) => s.viewport);
  const multiScreenMode = useStore((s) => s.multiScreenMode);
  const ref = useRef<HTMLDivElement>(null);

  const allScreens = multiScreenMode ? [root, ...screens] : [root];

  // Compute bounds of all screens
  let totalMinX = Infinity, totalMinY = Infinity, totalMaxX = -Infinity, totalMaxY = -Infinity;
  for (const screen of allScreens) {
    const b = globalBounds(screen);
    const sx = multiScreenMode ? screen.style.x : 0;
    const sy = multiScreenMode ? screen.style.y : 0;
    totalMinX = Math.min(totalMinX, sx + b.minX);
    totalMinY = Math.min(totalMinY, sy + b.minY);
    totalMaxX = Math.max(totalMaxX, sx + b.maxX);
    totalMaxY = Math.max(totalMaxY, sy + b.maxY);
  }

  const worldW = Math.max(1, totalMaxX - totalMinX);
  const worldH = Math.max(1, totalMaxY - totalMinY);
  const drawW = MINIMAP_W - PAD * 2;
  const drawH = MINIMAP_H - PAD * 2;
  const scale = Math.min(drawW / worldW, drawH / worldH);
  const ox = PAD + (drawW - worldW * scale) / 2;
  const oy = PAD + (drawH - worldH * scale) / 2;

  const toMx = (wx: number) => ox + (wx - totalMinX) * scale;
  const toMy = (wy: number) => oy + (wy - totalMinY) * scale;

  // Viewport rect in world coords
  const vpWorldX = -vp.pan.x / vp.zoom;
  const vpWorldY = -vp.pan.y / vp.zoom;
  const vpWorldW = vp.size.x / vp.zoom;
  const vpWorldH = vp.size.y / vp.zoom;

  // Click/drag handler
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const s = useStore.getState();
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // Convert click to world
    const worldX = (clickX - ox) / scale + totalMinX;
    const worldY = (clickY - oy) / scale + totalMinY;
    // Center viewport on click point
    s.setViewport({
      pan: {
        x: -(worldX - vpWorldW / 2) * s.viewport.zoom,
        y: -(worldY - vpWorldH / 2) * s.viewport.zoom,
      },
    });
  }, [ox, oy, scale, totalMinX, totalMinY, vpWorldW, vpWorldH]);

  // Render screen rects
  const screenRects: React.ReactNode[] = [];
  for (const screen of allScreens) {
    const sx = multiScreenMode ? screen.style.x : 0;
    const sy = multiScreenMode ? screen.style.y : 0;
    const x = toMx(sx + screen.style.x);
    const y = toMy(sy + screen.style.y);
    const w = Math.max(1, screen.style.width * scale);
    const h = Math.max(1, screen.style.height * scale);

    screenRects.push(
      <rect key={screen.id} x={x} y={y} width={w} height={h}
        fill="var(--panel-2)" stroke="var(--border-strong)" strokeWidth={1} rx={2} />
    );

    // Render children as smaller rects (simplified)
    for (const child of screen.children) {
      if (child.hidden) continue;
      const cx = toMx(sx + child.style.x);
      const cy = toMy(sy + child.style.y);
      const cw = Math.max(0.5, child.style.width * scale);
      const ch = Math.max(0.5, child.style.height * scale);
      screenRects.push(
        <rect key={child.id} x={cx} y={cy} width={cw} height={ch}
          fill="var(--text-dim)" opacity={0.25} rx={0.5} />
      );
    }
  }

  // Viewport rect
  const vrx = toMx(vpWorldX);
  const vry = toMy(vpWorldY);
  const vrw = Math.max(2, vpWorldW * scale);
  const vrh = Math.max(2, vpWorldH * scale);

  return (
    <div className="mini-map" ref={ref} onPointerDown={handlePointerDown}>
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        {screenRects}
        <rect x={vrx} y={vry} width={vrw} height={vrh}
          fill="none" stroke="var(--accent)" strokeWidth={1.5} rx={1} />
      </svg>
    </div>
  );
}
