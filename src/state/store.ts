/**
 * Store global — Zustand + Immer con undo/redo por patches (produceWithPatches).
 *
 * Regla de oro de las sesiones de drag (mover, redimensionar, crear):
 * durante el arrastre NO se muta el documento; la UI muestra una vista previa
 * a través de `drag`, y al soltar se hace UN solo commit con `apply()`, lo que
 * genera una única entrada de historial. Así el undo no se llena de micro-estados.
 */
import { create } from "zustand";
import { applyPatches, produceWithPatches, type Patch } from "immer";
import type { CanvasDoc, Node, Rect, Style, Vec } from "../core/ir";
import { findNode, findParent, cloneNode, bbox, nodeRect, rectsIntersect, uid } from "../core/tree";
import { topLevelNodes } from "../core/tree";

export type Tool =
  | "select"
  | "frame"
  | "text"
  | "rect"
  | "ellipse"
  | "line"
  | "hand"
  | "zoom";

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface Viewport {
  /** Desplazamiento en px de pantalla: screen = world * zoom + pan. */
  pan: Vec;
  zoom: number;
  /** Tamaño del área de canvas en px de pantalla. */
  size: Vec;
}

export interface SnapLine {
  axis: "x" | "y";
  /** Posición (world) de la línea. */
  pos: number;
  /** Segmento visible (world) perpendicular a la línea. */
  from: number;
  to: number;
}

export type DragSession =
  | { kind: "move"; ids: string[]; start: Vec; current: Vec; dx: number; dy: number; lockedAxis: "x" | "y" | null; lines: SnapLine[] }
  | { kind: "resize"; id: string; handle: Handle; start: Vec; startRect: Rect; rect: Rect; lines: SnapLine[] }
  | { kind: "marquee"; start: Vec; current: Vec; additive: boolean }
  | { kind: "create"; shape: "frame" | "rect" | "ellipse" | "line"; start: Vec; current: Vec }
  | { kind: "pan"; start: Vec; startPan: Vec }
  | { kind: "zoom-marquee"; start: Vec; current: Vec }
  | { kind: "guide"; axis: "v" | "h"; pos: number; existingPos?: number };

interface HistoryEntry {
  patches: Patch[];
  inverse: Patch[];
}

interface EditorState {
  // ---- documento (con historial) ----
  doc: CanvasDoc;
  history: { past: HistoryEntry[]; future: HistoryEntry[] };
  apply: (recipe: (draft: CanvasDoc) => void) => void;
  replaceDoc: (doc: CanvasDoc) => void;
  undo: () => void;
  redo: () => void;

  // ---- selección y UI ----
  selection: string[];
  hoverId: string | null;
  tool: Tool;
  spaceDown: boolean;
  viewport: Viewport;
  cursor: Vec | null;
  showRulers: boolean;
  showGuides: boolean;
  showSafeAreas: boolean;
  showGrid: boolean;
  drag: DragSession | null;
  editingTextId: string | null;
  focusColorPicker: string | null;
  paletteOpen: boolean;
  newProjectOpen: boolean;
  toast: string | null;

  // ---- acciones de UI ----
  select: (ids: string[], additive?: boolean) => void;
  setTool: (t: Tool) => void;
  setHover: (id: string | null) => void;
  setSpaceDown: (v: boolean) => void;
  setViewport: (p: Partial<Viewport>) => void;
  setDrag: (d: DragSession | null) => void;
  setEditingText: (id: string | null) => void;
  setFocusColorPicker: (id: string | null) => void;
  setPaletteOpen: (v: boolean) => void;
  setNewProjectOpen: (v: boolean) => void;
  setCursor: (c: Vec | null) => void;
  toggle: (k: "showRulers" | "showGuides" | "showSafeAreas" | "showGrid") => void;
  showToast: (msg: string) => void;

  // ---- acciones de documento reutilizables (menús, atajos, palette) ----
  addNode: (node: Node, parentId?: string) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  nudgeSelection: (dx: number, dy: number) => void;
  groupSelection: (name: string) => void;
  ungroupSelection: () => void;
  setNodeName: (id: string, name: string) => void;
  toggleHidden: (id: string) => void;
  setText: (id: string, text: string, width: number, height: number) => void;
  copyStyle: () => void;
  pasteStyle: () => void;
  fitTo: (rect: Rect) => void;
  zoomBy: (factor: number, center: Vec) => void;
  zoomTo: (zoom: number, center: Vec) => void;
  updateCanvasSize: (w: number, h: number) => void;
}

/** Estilo copiado para "Copiar/Pegar estilo" (Figma: Cmd+Shift+C / Cmd+Shift+V). */
let copiedStyle: Partial<Style> | null = null;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const MAX_HISTORY = 100;

function clampZoom(z: number): number {
  return Math.min(8, Math.max(0.05, z));
}

export const useStore = create<EditorState>()((set, get) => ({
  doc: { version: "", tokens: { colors: {}, radii: {}, spacing: {}, typography: {}, shadows: {}, easings: {} }, library: { components: {}, variants: {} }, timelines: [], assets: [], root: { id: "", type: "frame", name: "", style: { x: 0, y: 0, width: 0, height: 0 }, children: [] } },
  history: { past: [], future: [] },
  selection: [],
  hoverId: null,
  tool: "select",
  spaceDown: false,
  viewport: { pan: { x: 0, y: 0 }, zoom: 1, size: { x: 800, y: 600 } },
  cursor: null,
  showRulers: true,
  showGuides: true,
  showSafeAreas: true,
  showGrid: true,
  drag: null,
  editingTextId: null,
  focusColorPicker: null,
  paletteOpen: false,
  newProjectOpen: false,
  toast: null,

  apply: (recipe) => {
    const [next, patches, inverse] = produceWithPatches(get().doc, recipe);
    if (patches.length === 0) return;
    const past = [...get().history.past, { patches, inverse }];
    set({
      doc: next,
      history: { past: past.slice(-MAX_HISTORY), future: [] },
    });
  },

  replaceDoc: (doc) =>
    set({
      doc,
      selection: [],
      history: { past: [], future: [] },
      drag: null,
      editingTextId: null,
    }),

  undo: () => {
    const { past, future } = get().history;
    const entry = past[past.length - 1];
    if (!entry) return;
    const doc = applyPatches(get().doc, entry.inverse);
    set({ doc, history: { past: past.slice(0, -1), future: [...future, entry] } });
  },

  redo: () => {
    const { past, future } = get().history;
    const entry = future[future.length - 1];
    if (!entry) return;
    const doc = applyPatches(get().doc, entry.patches);
    set({ doc, history: { past: [...past, entry], future: future.slice(0, -1) } });
  },

  // ------------------------------------------------------------------ UI

  select: (ids, additive = false) =>
    set((s) => ({
      selection: additive ? Array.from(new Set([...s.selection, ...ids])) : ids,
    })),

  setTool: (tool) => set({ tool }),
  setHover: (hoverId) => set({ hoverId }),
  setSpaceDown: (spaceDown) => set({ spaceDown }),
  setViewport: (p) => set((s) => ({ viewport: { ...s.viewport, ...p } })),
  setDrag: (drag) => set({ drag }),
  setEditingText: (editingTextId) => set({ editingTextId }),
  setFocusColorPicker: (focusColorPicker) => set({ focusColorPicker }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setNewProjectOpen: (newProjectOpen) => set({ newProjectOpen }),
  setCursor: (cursor) => set({ cursor }),
  toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<EditorState>),

  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2400);
  },

  // ------------------------------------------------------------- documento

  addNode: (node, parentId) =>
    get().apply((d) => {
      const parent = parentId ? findNode(d.root, parentId) : d.root;
      if (!parent) return;
      parent.children.push(node);
    }),

  deleteSelection: () => {
    const ids = get().selection;
    if (ids.length === 0) return;
    get().apply((d) => {
      for (const id of ids) {
        const p = findParent(d.root, id);
        if (p) p.parent.children.splice(p.index, 1);
      }
    });
    set({ selection: [] });
  },

  duplicateSelection: () => {
    const ids = get().selection;
    if (ids.length === 0) return;
    const clones: Node[] = [];
    get().apply((d) => {
      for (const id of ids) {
        const p = findParent(d.root, id);
        if (!p) continue;
        const original = p.parent.children[p.index];
        const clone = cloneNode(original);
        remapIds(clone);
        clone.style.x += 16;
        clone.style.y += 16;
        p.parent.children.splice(p.index + 1, 0, clone);
        clones.push(clone);
      }
    });
    if (clones.length > 0) set({ selection: clones.map((c) => c.id) });
  },

  nudgeSelection: (dx, dy) => {
    const ids = get().selection;
    if (ids.length === 0) return;
    get().apply((d) => {
      for (const id of ids) {
        const n = findNode(d.root, id);
        if (n) {
          n.style.x = Math.round(n.style.x + dx);
          n.style.y = Math.round(n.style.y + dy);
        }
      }
    });
  },

  groupSelection: (name) => {
    const ids = get().selection;
    if (ids.length < 1) return;
    let groupId: string | null = null;
    get().apply((d) => {
      const nodes = ids
        .map((id) => findNode(d.root, id))
        .filter((n): n is Node => Boolean(n));
      if (nodes.length === 0) return;
      // Todos deben compartir el mismo padre (Fase 1: todo vive bajo el root).
      const parents = nodes.map((n) => findParent(d.root, n.id));
      const p0 = parents[0];
      if (!p0 || !parents.every((p) => p && p.parent.id === p0.parent.id)) return;

      const box = bbox(nodes.map(nodeRect));
      if (!box) return;
      const group: Node = {
        id: uid(),
        type: "frame",
        name,
        style: { x: box.x, y: box.y, width: box.width, height: box.height },
        children: [],
      };
      const idxs = nodes
        .map((n) => p0.parent.children.findIndex((c) => c.id === n.id))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b);
      for (const n of nodes) {
        const i = p0.parent.children.findIndex((c) => c.id === n.id);
        if (i >= 0) p0.parent.children.splice(i, 1);
        n.style.x -= box.x;
        n.style.y -= box.y;
        group.children.push(n);
      }
      p0.parent.children.splice(Math.min(...idxs), 0, group);
      groupId = group.id;
    });
    if (groupId) set({ selection: [groupId] });
  },

  ungroupSelection: () => {
    const ids = get().selection;
    if (ids.length === 0) return;
    get().apply((d) => {
      for (const id of ids) {
        const p = findParent(d.root, id);
        if (!p) continue;
        const frame = p.parent.children[p.index];
        if (frame.type !== "frame" || frame.children.length === 0) continue;
        const kids = [...frame.children];
        for (const k of kids) {
          k.style.x += frame.style.x;
          k.style.y += frame.style.y;
        }
        p.parent.children.splice(p.index, 1, ...kids);
      }
    });
  },

  setNodeName: (id, name) =>
    get().apply((d) => {
      const n = findNode(d.root, id);
      if (n) n.name = name;
    }),

  toggleHidden: (id) =>
    get().apply((d) => {
      const n = findNode(d.root, id);
      if (n) n.hidden = !n.hidden;
    }),

  setText: (id, text, width, height) =>
    get().apply((d) => {
      const n = findNode(d.root, id);
      if (!n || n.type !== "text") return;
      n.text = text;
      if (width > 0) n.style.width = Math.round(width);
      if (height > 0) n.style.height = Math.round(height);
    }),

  copyStyle: () => {
    const n = findNode(get().doc.root, get().selection[0]);
    if (!n) return;
    const s = n.style;
    copiedStyle = {
      backgroundColor: s.backgroundColor,
      gradient: s.gradient,
      color: s.color,
      opacity: s.opacity,
      scale: s.scale,
      borderRadius: s.borderRadius,
      boxShadow: s.boxShadow,
      blendMode: s.blendMode,
      filters: s.filters,
      stroke: s.stroke,
      fontFamily: s.fontFamily,
      fontWeight: s.fontWeight,
      fontSize: s.fontSize,
      letterSpacing: s.letterSpacing,
      lineHeight: s.lineHeight,
      textAlign: s.textAlign,
      textTransform: s.textTransform,
    };
    get().showToast("Estilo copiado");
  },

  pasteStyle: () => {
    if (!copiedStyle) {
      get().showToast("No hay ningún estilo copiado");
      return;
    }
    const style = copiedStyle;
    const ids = get().selection;
    if (ids.length === 0) return;
    get().apply((d) => {
      for (const id of ids) {
        const n = findNode(d.root, id);
        if (n) n.style = { ...n.style, ...style };
      }
    });
    get().showToast("Estilo pegado");
  },

  // -------------------------------------------------------------- viewport

  fitTo: (rect) => {
    const vp = get().viewport;
    const pad = 80;
    const zoom = clampZoom(
      Math.min((vp.size.x - pad * 2) / Math.max(rect.width, 1), (vp.size.y - pad * 2) / Math.max(rect.height, 1)),
    );
    set({
      viewport: {
        ...vp,
        zoom,
        pan: {
          x: vp.size.x / 2 - (rect.x + rect.width / 2) * zoom,
          y: vp.size.y / 2 - (rect.y + rect.height / 2) * zoom,
        },
      },
    });
  },

  zoomBy: (factor, center) => {
    const vp = get().viewport;
    const zoom = clampZoom(vp.zoom * factor);
    set({
      viewport: {
        ...vp,
        zoom,
        pan: {
          x: center.x - (center.x - vp.pan.x) * (zoom / vp.zoom),
          y: center.y - (center.y - vp.pan.y) * (zoom / vp.zoom),
        },
      },
    });
  },

  zoomTo: (zoom, center) => {
    const vp = get().viewport;
    const z = clampZoom(zoom);
    set({
      viewport: {
        ...vp,
        zoom: z,
        pan: {
          x: center.x - (center.x - vp.pan.x) * (z / vp.zoom),
          y: center.y - (center.y - vp.pan.y) * (z / vp.zoom),
        },
      },
    });
  },

  updateCanvasSize: (w, h) =>
    set((s) => ({ viewport: { ...s.viewport, size: { x: w, y: h } } })),
}));

function remapIds(node: Node): void {
  node.id = uid();
  for (const child of node.children) remapIds(child);
}

/** Nodos de primer nivel (hijos del root) para selección con Cmd+A. */
export function selectAllNodes(): void {
  const s = useStore.getState();
  const ids = topLevelNodes(s.doc.root).map((n) => n.id);
  s.select(ids);
}

/** Selección actual como rects (para marquee y fit). */
export function selectedRects(): Rect[] {
  const s = useStore.getState();
  return s.selection
    .map((id) => findNode(s.doc.root, id))
    .filter((n): n is Node => Boolean(n))
    .map(nodeRect);
}

/** Comprueba si un nodo está en la selección actual. */
export function isSelected(id: string): boolean {
  return useStore.getState().selection.includes(id);
}

/** Selección tras un marquee (intersección con el rect). */
export function nodesInRect(rect: Rect, additive: string[]): string[] {
  const s = useStore.getState();
  const hit = s.doc.root.children
    .filter((n) => !n.hidden && rectsIntersect(nodeRect(n), rect))
    .map((n) => n.id);
  return additive ? Array.from(new Set([...additive, ...hit])) : hit;
}
