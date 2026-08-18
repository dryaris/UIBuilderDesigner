/**
 * Sesiones de puntero — la lógica de interacción del canvas.
 *
 * Un solo juego de handlers (pointerdown/move/up sobre el canvas) cubre todas
 * las herramientas. Cada sesión vive en `drag` del store; el documento solo se
 * muta al soltar (un commit = una entrada de historial).
 *
 * Memoria muscular de Figma:
 *  - Espacio (mantenido) = pan
 *  - Cmd/Ctrl + scroll = zoom hacia el cursor
 *  - Click en nodo = seleccionar; Shift+click = sumar/quitar
 *  - Drag en vacío = marquee; Shift+drag = añadir al marquee
 *  - Frame tool: rubber band; click = frame 120×120
 *  - Doble clic en texto = editar inline; doble clic en nodo = color picker
 */
import type React from "react";
import { useStore, type Handle, type SpacingHint } from "../state/store";
import type { CanvasDoc, Node, Rect, Vec } from "../core/ir";
import { findNode, findParent, hitTest, nodeRect, bbox, rectsIntersect } from "../core/tree";
import { hasAutoLayout, worldRect } from "../core/layout";
import { frameNode, shapeNode, textNode } from "../core/defaults";
import { toWorld } from "./transform";
import { normRect, resizeRect, snapMove, snapResize } from "./snapping";

/** Referencia mutable al elemento canvas (registrada por Canvas.tsx). */
export const canvasElement: { current: HTMLDivElement | null } = { current: null };

/** Raíz activa: la pantalla navegada en preview, o la del editor. */
export function activeRoot(s = useStore.getState()): Node {
  return s.previewScreen ?? s.doc.root;
}

function getCanvas(): HTMLDivElement {
  return canvasElement.current as HTMLDivElement;
}

function worldOf(clientX: number, clientY: number): Vec {
  const s = useStore.getState();
  return toWorld(getCanvas(), clientX, clientY, s.viewport);
}

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_CURSOR: Record<Handle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

export function useCanvasPointer() {
  // ---------------------------------------------------------------- pointerdown
  function onPointerDown(e: React.PointerEvent) {
    const s = useStore.getState();
    const target = e.target as HTMLElement;
    // Clic dentro del editor de texto inline: lo deja pasar.
    if (target.isContentEditable) return;
    // Clic sobre una línea de guía: el drag lo gestiona la propia guía.
    if (target.closest?.(".guide-line")) return;

    // Pan: espacio mantenido o herramienta Mano (también en preview).
    if (s.spaceDown || s.tool === "hand") {
      s.setDrag({ kind: "pan", start: { x: e.clientX, y: e.clientY }, startPan: s.viewport.pan });
      s.setHover(null);
      return;
    }

    // Modo Preview (Fase 4): sin selección ni edición; hover/press en vivo.
    if (s.previewMode) {
      const wp = worldOf(e.clientX, e.clientY);
      const hit = hitTest(activeRoot(s), wp.x, wp.y);
      s.setPreviewHoverId(hit?.id ?? null);
      s.setPreviewPressId(hit?.id ?? null);
      return;
    }

    const wp = worldOf(e.clientX, e.clientY);

    // Modo anotación (Fase 7): clic coloca un pin en la pantalla (como el
    // comentario de Figma) y vuelve a Select para escribir la nota en el panel.
    if (s.annotateMode) {
      const hit = hitTest(s.doc.root, wp.x, wp.y);
      s.addAnnotation(wp.x, wp.y, hit?.id);
      s.setAnnotateMode(false);
      return;
    }

    switch (s.tool) {
      case "zoom":
        s.setDrag({ kind: "zoom-marquee", start: wp, current: wp });
        return;
      case "frame":
      case "rect":
      case "ellipse":
      case "line":
        s.setDrag({ kind: "create", shape: s.tool, start: wp, current: wp });
        return;
      case "text":
        startTextEdit(wp);
        return;
      case "select":
        selectDown(e, wp);
        return;
    }
  }

  function selectDown(e: React.PointerEvent, wp: Vec) {
    const s = useStore.getState();

    // ¿Clic sobre una guía? → arrastrarla (o soltarla fuera para borrarla).
    if (s.showGuides) {
      const guide = hitGuide(wp);
      if (guide) {
        beginGuideDrag(guide.axis, guide.pos, guide.pos);
        return;
      }
    }

    // ¿Clic sobre un handle de resize (selección única)? Los hijos de un
    // auto-layout no se redimensionan a mano (su tamaño lo decide el layout).
    if (s.selection.length === 1) {
      const selNode = findNode(s.doc.root, s.selection[0]);
      const selParent = selNode ? findParent(s.doc.root, selNode.id) : null;
      const handle = selParent && hasAutoLayout(selParent.parent) ? null : hitHandle(e.clientX, e.clientY);
      if (handle) {
        const node = selNode;
        if (node) {
          s.setDrag({
            kind: "resize",
            id: node.id,
            handle,
            start: wp,
            startRect: nodeRect(node),
            rect: nodeRect(node),
            lines: [],
          });
          return;
        }
      }
    }

    const hit = hitTest(s.doc.root, wp.x, wp.y);
    if (hit) {
      // Selección estilo Figma: se aplica al bajar; el drag mueve la selección.
      const next = s.selection.includes(hit.id)
        ? e.shiftKey
          ? s.selection.filter((id) => id !== hit.id)
          : s.selection
        : e.shiftKey
          ? [...s.selection, hit.id]
          : [hit.id];
      if (next.length !== s.selection.length || next[0] !== s.selection[0]) s.select(next);
      // Hijos de auto-layout: su posición la decide el layout (Figma); solo
      // se seleccionan. Reordenar: flechas en el panel Capas.
      const parent = findParent(s.doc.root, hit.id);
      if (parent && hasAutoLayout(parent.parent)) return;
      s.setDrag({
        kind: "move",
        ids: next,
        start: wp,
        current: wp,
        dx: 0,
        dy: 0,
        lockedAxis: null,
        lines: [],
        hints: [],
      });
      return;
    }

    // Vacío → marquee (Shift suma a la selección).
    s.setDrag({ kind: "marquee", start: wp, current: wp, additive: e.shiftKey });
  }

  // ---------------------------------------------------------------- pointermove
  function onPointerMove(e: React.PointerEvent) {
    const s = useStore.getState();
    s.setCursor({ x: e.clientX, y: e.clientY });

    // En preview, hover en vivo (salvo mientras se panea).
    if (s.previewMode && !s.drag) {
      const wp = worldOf(e.clientX, e.clientY);
      const hit = hitTest(activeRoot(s), wp.x, wp.y);
      s.setPreviewHoverId(hit?.id ?? null);
      return;
    }

    const drag = s.drag;
    if (!drag) {
      // Hover (solo con herramienta Select y sin pan).
      if (!s.spaceDown && s.tool === "select") {
        const wp = worldOf(e.clientX, e.clientY);
        const hit = hitTest(s.doc.root, wp.x, wp.y);
        s.setHover(hit ? hit.id : null);
      } else {
        s.setHover(null);
      }
      return;
    }

    const wp = worldOf(e.clientX, e.clientY);

    switch (drag.kind) {
      case "pan": {
        s.setViewport({
          pan: {
            x: drag.startPan.x + (e.clientX - drag.start.x),
            y: drag.startPan.y + (e.clientY - drag.start.y),
          },
        });
        break;
      }

      case "move": {
        let rawDx = wp.x - drag.start.x;
        let rawDy = wp.y - drag.start.y;
        // Shift durante el arrastre = restringir al eje dominante (Figma).
        let locked = drag.lockedAxis;
        if (e.shiftKey && !locked) locked = Math.abs(rawDx) > Math.abs(rawDy) ? "x" : "y";
        if (locked === "x") rawDy = 0;
        if (locked === "y") rawDx = 0;

        const rects = drag.ids
          .map((id) => findNode(s.doc.root, id))
          .filter((n): n is Node => Boolean(n))
          .map(nodeRect);
        const box = bbox(rects);
        if (!box) return;
        const rawBox = { x: box.x + rawDx, y: box.y + rawDy, width: box.width, height: box.height };
        const snapped = snapMove(rawBox, s.doc, drag.ids, 6 / s.viewport.zoom);
        const movedBox = {
          x: rawBox.x + snapped.dx,
          y: rawBox.y + snapped.dy,
          width: rawBox.width,
          height: rawBox.height,
        };
        s.setDrag({
          ...drag,
          current: wp,
          lockedAxis: locked,
          dx: Math.round(rawDx + snapped.dx),
          dy: Math.round(rawDy + snapped.dy),
          lines: snapped.lines,
          hints: computeSpacingHints(movedBox, s.doc, drag.ids, 180),
        });
        break;
      }

      case "resize": {
        const rawDx = wp.x - drag.start.x;
        const rawDy = wp.y - drag.start.y;
        const snapped = snapResize(
          resizeRect(drag.startRect, drag.handle, rawDx, rawDy),
          drag.handle,
          s.doc,
          6 / s.viewport.zoom,
        );
        s.setDrag({
          ...drag,
          rect: resizeRect(drag.startRect, drag.handle, rawDx + snapped.dx, rawDy + snapped.dy),
          lines: snapped.lines,
        });
        break;
      }

      case "marquee":
      case "create":
      case "zoom-marquee":
        s.setDrag({ ...drag, current: wp });
        break;

      case "guide":
        s.setDrag({ ...drag, pos: drag.axis === "v" ? wp.x : wp.y });
        break;
    }
  }

  // ---------------------------------------------------------------- pointerup
  function onPointerUp() {
    const s = useStore.getState();
    // En preview solo se suelta el "press"; si el nodo pulsado tiene una
    // conexión de prototipo, navega a su pantalla (Fase 7).
    if (s.previewMode && !s.drag) {
      const pressId = s.previewPressId;
      s.setPreviewPressId(null);
      if (pressId) {
        const conn = (s.doc.connections ?? []).find((c) => c.fromNodeId === pressId);
        if (conn) {
          s.previewNavigate(conn.toScreenId, conn.transition?.durationMs ?? null);
        }
      }
      return;
    }
    const drag = s.drag;
    if (!drag) return;
    s.setDrag(null);

    switch (drag.kind) {
      case "move": {
        if (drag.dx !== 0 || drag.dy !== 0) {
          s.apply((d) => {
            for (const id of drag.ids) {
              const n = findNode(d.root, id);
              if (n) {
                n.style.x = Math.round(n.style.x + drag.dx);
                n.style.y = Math.round(n.style.y + drag.dy);
              }
            }
          });
        }
        break;
      }

      case "resize": {
        // Un solo commit (una entrada de undo): tamaño nuevo + constraints de
        // los hijos directos (responsive, Fase 3).
        s.resizeFrame(drag.id, drag.rect, drag.startRect);
        break;
      }

      case "marquee": {
        const rect = normRect(drag.start, drag.current);
        const s2 = useStore.getState();
        if (rect.width < 4 && rect.height < 4) {
          // Click en vacío: dentro del artboard → selecciona el frame raíz
          // (para editar su cuadrícula, guías o áreas seguras); fuera → deselecciona.
          const root = s2.doc.root;
          const r = nodeRect(root);
          const inside =
            drag.start.x >= r.x &&
            drag.start.x <= r.x + r.width &&
            drag.start.y >= r.y &&
            drag.start.y <= r.y + r.height;
          s2.select(inside ? [root.id] : []);
          s2.setSelectedAnnotationId(null);
          return;
        }
        const ids = s2.doc.root.children
          .filter((n) => !n.hidden && rectsIntersect(worldRect(s2.doc.root, n), rect))
          .map((n) => n.id);
        s2.select(drag.additive ? [...s2.selection, ...ids] : ids);
        break;
      }

      case "create": {
        let rect = normRect(drag.start, drag.current);
        if (rect.width < 4 && rect.height < 4) {
          // Click sin arrastre → tamaño por defecto.
          rect = { x: Math.round(drag.start.x), y: Math.round(drag.start.y), width: 120, height: 120 };
        }
        rect = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        };
        const s2 = useStore.getState();
        const node = drag.shape === "frame" ? mkFrame(rect) : mkShape(drag.shape, rect);
        s2.addNode(node);
        s2.select([node.id]);
        break;
      }

      case "zoom-marquee": {
        const rect = normRect(drag.start, drag.current);
        const s2 = useStore.getState();
        const vp = s2.viewport;
        if (rect.width < 10 || rect.height < 10) {
          // Click → zoom in un paso hacia el centro.
          s2.zoomBy(1.25, { x: vp.size.x / 2, y: vp.size.y / 2 });
          return;
        }
        const zoom = Math.min(
          8,
          Math.max(0.05, Math.min(vp.size.x / rect.width, vp.size.y / rect.height)),
        );
        s2.setViewport({
          zoom,
          pan: {
            x: vp.size.x / 2 - (rect.x + rect.width / 2) * zoom,
            y: vp.size.y / 2 - (rect.y + rect.height / 2) * zoom,
          },
        });
        break;
      }

      case "guide": {
        const s2 = useStore.getState();
        const root = s2.doc.root;
        const outside =
          drag.axis === "v"
            ? drag.pos < -60 || drag.pos > root.style.width + 60
            : drag.pos < -60 || drag.pos > root.style.height + 60;
        s2.apply((d) => {
          const g = (d.root.guides ??= { vertical: [], horizontal: [] });
          const list = drag.axis === "v" ? g.vertical : g.horizontal;
          if (drag.existingPos !== undefined) {
            const idx = list.indexOf(drag.existingPos);
            if (idx >= 0) list.splice(idx, 1);
          }
          if (!outside) {
            const pos = Math.round(drag.pos);
            const list2 = drag.axis === "v" ? g.vertical : g.horizontal;
            if (!list2.includes(pos)) list2.push(pos);
          }
        });
        break;
      }

      case "pan":
        break;
    }
  }

  // ---------------------------------------------------------------- wheel
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const s = useStore.getState();
    const rect = getCanvas().getBoundingClientRect();
    const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (e.ctrlKey || e.metaKey) {
      // Cmd/Ctrl + scroll = zoom hacia el cursor (pinch del trackpad incluido).
      s.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, center);
    } else {
      s.setViewport({
        pan: { x: s.viewport.pan.x - e.deltaX, y: s.viewport.pan.y - e.deltaY },
      });
    }
  }

  // ---------------------------------------------------------------- doble clic
  function onDoubleClick(e: React.MouseEvent) {
    const s = useStore.getState();
    const wp = worldOf(e.clientX, e.clientY);
    const hit = hitTest(s.doc.root, wp.x, wp.y);
    if (!hit) return;
    if (hit.type === "text") {
      s.select([hit.id]);
      s.setEditingText(hit.id);
    } else {
      // Doble clic en un nodo → abrir el color picker de su relleno (Figma).
      s.select([hit.id]);
      s.setFocusColorPicker(hit.id);
    }
  }

  // ---------------------------------------------------------------- text tool
  function startTextEdit(wp: Vec) {
    const s = useStore.getState();
    const node = textNode("Texto", { x: Math.round(wp.x), y: Math.round(wp.y), width: 240, height: 40 }, "", {
      fontSize: 32,
      fontWeight: 500,
    });
    s.addNode(node);
    s.select([node.id]);
    s.setEditingText(node.id);
  }

  return { onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick };
}

// ---------------------------------------------------------------------------
// Guías
// ---------------------------------------------------------------------------

function hitGuide(wp: Vec): { axis: "v" | "h"; pos: number } | null {
  const st = useStore.getState();
  const g = st.doc.root.guides;
  if (!g) return null;
  const tol = 5 / st.viewport.zoom;
  for (const v of g.vertical) if (Math.abs(wp.x - v) <= tol) return { axis: "v", pos: v };
  for (const h of g.horizontal) if (Math.abs(wp.y - h) <= tol) return { axis: "h", pos: h };
  return null;
}

/**
 * Arrastre de guía iniciado desde una REGLA (no desde el canvas).
 * Instala listeners en window porque el pointerdown ocurrió fuera del canvas.
 */
export function beginGuideDrag(axis: "v" | "h", pos: number, existingPos?: number) {
  const s = useStore.getState();
  s.setDrag({ kind: "guide", axis, pos, existingPos });

  const onMove = (e: PointerEvent) => {
    const st = useStore.getState();
    const d = st.drag;
    if (!d || d.kind !== "guide") return;
    const wp = worldOf(e.clientX, e.clientY);
    st.setDrag({ ...d, pos: axis === "v" ? wp.x : wp.y });
  };
  const onUp = (e: PointerEvent) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    const st = useStore.getState();
    const d = st.drag;
    if (!d || d.kind !== "guide") return;
    const wp = worldOf(e.clientX, e.clientY);
    st.setDrag(null);
    commitGuide(d.existingPos, axis, wp.x, wp.y);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function commitGuide(existingPos: number | undefined, axis: "v" | "h", wx: number, wy: number) {
  const s = useStore.getState();
  const root = s.doc.root;
  const pos = axis === "v" ? wx : wy;
  const outside =
    axis === "v"
      ? pos < -60 || pos > root.style.width + 60
      : pos < -60 || pos > root.style.height + 60;
  s.apply((d) => {
    const g = (d.root.guides ??= { vertical: [], horizontal: [] });
    const list = axis === "v" ? g.vertical : g.horizontal;
    if (existingPos !== undefined) {
      const idx = list.indexOf(existingPos);
      if (idx >= 0) list.splice(idx, 1);
    }
    if (!outside) {
      const p = Math.round(pos);
      if (!list.includes(p)) list.push(p);
    }
  });
}

// ---------------------------------------------------------------------------
// Handles de resize
// ---------------------------------------------------------------------------

function handleScreenPos(rect: Rect, handle: Handle, zoom: number, pan: Vec): Vec {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const sx = (wx: number) => wx * zoom + pan.x;
  const sy = (wy: number) => wy * zoom + pan.y;
  switch (handle) {
    case "nw": return { x: sx(rect.x), y: sy(rect.y) };
    case "n": return { x: sx(cx), y: sy(rect.y) };
    case "ne": return { x: sx(rect.x + rect.width), y: sy(rect.y) };
    case "e": return { x: sx(rect.x + rect.width), y: sy(cy) };
    case "se": return { x: sx(rect.x + rect.width), y: sy(rect.y + rect.height) };
    case "s": return { x: sx(cx), y: sy(rect.y + rect.height) };
    case "sw": return { x: sx(rect.x), y: sy(rect.y + rect.height) };
    case "w": return { x: sx(rect.x), y: sy(cy) };
  }
}

/** ¿El cursor está sobre un handle de resize? (para cursor + pointerdown). */
export function hitHandle(clientX: number, clientY: number): Handle | null {
  const s = useStore.getState();
  const canvas = getCanvas();
  const rect = canvas.getBoundingClientRect();
  const node = findNode(s.doc.root, s.selection[0]);
  if (!node) return null;
  const r = nodeRect(node);
  const tol = 6;
  for (const h of HANDLES) {
    const p = handleScreenPos(r, h, s.viewport.zoom, s.viewport.pan);
    if (
      Math.abs(clientX - (rect.left + p.x)) <= tol &&
      Math.abs(clientY - (rect.top + p.y)) <= tol
    ) {
      return h;
    }
  }
  return null;
}

/** Cursor contextual sobre los handles (para el estilo del canvas). */
export function handleCursor(): string | null {
  const s = useStore.getState();
  if (s.selection.length !== 1 || !s.cursor) return null;
  const hit = hitHandle(s.cursor.x, s.cursor.y);
  return hit ? HANDLE_CURSOR[hit] : null;
}

// ---------------------------------------------------------------------------
// Creadores de nodos
// ---------------------------------------------------------------------------

function mkFrame(rect: Rect): Node {
  return frameNode("Frame", rect);
}

function mkShape(shape: "rect" | "ellipse" | "line", rect: Rect): Node {
  const names = { rect: "Rectángulo", ellipse: "Elipse", line: "Línea" } as const;
  return shapeNode(shape, names[shape], rect);
}

/** Nodo bajo un punto de pantalla (para menú contextual). */
export function hitAtClient(clientX: number, clientY: number): Node | null {
  const s = useStore.getState();
  const wp = worldOf(clientX, clientY);
  return hitTest(s.doc.root, wp.x, wp.y);
}

// ---------------------------------------------------------------------------
// Spacing hints — medición de distancias al mover (Fase 2)
// ---------------------------------------------------------------------------

/**
 * Calcula las pistas de medición del rect en movimiento contra el frame raíz
 * y sus hermanos (los mismos targets del snapping). Muestra SOLO los huecos
 * más cercanos por dirección (izquierda/derecha/arriba/abajo) dentro del umbral,
 * para no ensuciar el lienzo.
 */
function computeSpacingHints(
  box: Rect,
  doc: CanvasDoc,
  excludeIds: string[],
  threshold: number,
): SpacingHint[] {
  const targets: Rect[] = [nodeRect(doc.root)];
  for (const c of doc.root.children) {
    if (c.hidden || excludeIds.includes(c.id)) continue;
    targets.push(nodeRect(c));
  }

  const cx = box.y + box.height / 2;
  const cy = box.x + box.width / 2;

  type Best = { gap: number; from: number; to: number; at: number };
  let left: Best | null = null;
  let right: Best | null = null;
  let top: Best | null = null;
  let bottom: Best | null = null;

  for (const t of targets) {
    const overlapY = box.y < t.y + t.height && box.y + box.height > t.y;
    if (overlapY) {
      if (t.x >= box.x + box.width) {
        const gap = t.x - (box.x + box.width);
        if (gap <= threshold && (!right || gap < right.gap)) {
          right = { gap, from: box.x + box.width, to: t.x, at: cx };
        }
      } else if (t.x + t.width <= box.x) {
        const gap = box.x - (t.x + t.width);
        if (gap <= threshold && (!left || gap < left.gap)) {
          left = { gap, from: t.x + t.width, to: box.x, at: cx };
        }
      }
    }
    const overlapX = box.x < t.x + t.width && box.x + box.width > t.x;
    if (overlapX) {
      if (t.y >= box.y + box.height) {
        const gap = t.y - (box.y + box.height);
        if (gap <= threshold && (!bottom || gap < bottom.gap)) {
          bottom = { gap, from: box.y + box.height, to: t.y, at: cy };
        }
      } else if (t.y + t.height <= box.y) {
        const gap = box.y - (t.y + t.height);
        if (gap <= threshold && (!top || gap < top.gap)) {
          top = { gap, from: t.y + t.height, to: box.y, at: cy };
        }
      }
    }
  }

  const out: SpacingHint[] = [];
  const push = (b: Best | null, axis: "h" | "v") => {
    if (b) out.push({ axis, from: b.from, to: b.to, at: b.at, value: Math.round(b.gap) });
  };
  push(left, "h");
  push(right, "h");
  push(top, "v");
  push(bottom, "v");
  return out;
}
