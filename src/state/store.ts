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
import type { CanvasDoc, Node, PrototypeConnection, Rect, StateKey, Style, Timeline, Tokens, Vec } from "../core/ir";
import { findNode, findParent, cloneNode, bbox, nodeRect, rectsIntersect, uid } from "../core/tree";
import { topLevelNodes } from "../core/tree";
import { frameNode } from "../core/defaults";

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

/** Alineación de la selección (respecto a la caja envolvente, como Figma). */
export type AlignKind = "left" | "centerH" | "right" | "top" | "centerV" | "bottom";

/**
 * Pista de medición (spacing hints) durante un drag de movimiento.
 * axis "h" → línea horizontal de (from, at) a (to, at); "v" → vertical.
 */
export interface SpacingHint {
  axis: "h" | "v";
  from: number;
  to: number;
  /** Coordenada del eje perpendicular (la "y" de una línea horizontal). */
  at: number;
  /** Distancia en px del proyecto. */
  value: number;
}

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
  | { kind: "move"; ids: string[]; start: Vec; current: Vec; dx: number; dy: number; lockedAxis: "x" | "y" | null; lines: SnapLine[]; hints: SpacingHint[] }
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
  /** Pestaña activa del panel derecho (Inspector | Diseño | Animar | Prototipo). */
  rightTab: "inspector" | "design" | "animate" | "prototype";
  /** Estado que se previsualiza en el lienzo (Fase 3): nodo + estado. */
  previewState: { nodeId: string; state: StateKey } | null;

  // ---- modo preview y máquina de estados (Fase 4) ----
  previewMode: boolean;
  previewHoverId: string | null;
  previewPressId: string | null;
  /** Reproducción de la línea de tiempo activa (WAAPI). */
  playing: boolean;
  activeTimelineId: string | null;
  /** Pantalla activa en el preview (navegación del prototipo, Fase 7). */
  previewScreen: Node | null;
  /** Duración (ms) de la transición de la última navegación del prototipo. */
  previewTransitionMs: number | null;

  // ---- prototipado entre pantallas (Fase 7) ----
  screens: Node[];
  connections: PrototypeConnection[];
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
  setRightTab: (tab: "inspector" | "design" | "animate" | "prototype") => void;
  setPreviewState: (p: { nodeId: string; state: StateKey } | null) => void;
  setPreviewMode: (v: boolean) => void;
  setPreviewHoverId: (id: string | null) => void;
  setPreviewPressId: (id: string | null) => void;
  setPlaying: (v: boolean) => void;
  setActiveTimelineId: (id: string | null) => void;
  setPreviewScreen: (n: Node | null) => void;
  previewNavigate: (toScreenId: string, durationMs?: number | null) => void;

  // ---- prototipado (Fase 7) ----
  addScreen: () => void;
  duplicateScreen: () => void;
  switchScreen: (screenId: string) => void;
  deleteScreen: (screenId: string) => void;
  addConnection: (fromNodeId: string, toScreenId: string, transition?: PrototypeConnection["transition"]) => void;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, partial: Partial<PrototypeConnection>) => void;
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
  alignSelection: (kind: AlignKind) => void;
  distributeSelection: (kind: "h" | "v") => void;
  setNodeName: (id: string, name: string) => void;
  toggleHidden: (id: string) => void;
  setText: (id: string, text: string, width: number, height: number) => void;
  copyStyle: () => void;
  pasteStyle: () => void;

  // ---- design tokens (Fase 2) ----
  updateTokens: (fn: (tokens: Tokens) => void) => void;
  saveColorAsToken: (color: string, field?: "backgroundColor" | "color") => void;

  // ---- estados interactivos (Fase 3) ----
  setStateOverride: (nodeId: string, state: StateKey, partial: Partial<Style>) => void;
  setStateTransition: (nodeId: string, state: StateKey, transition: { durationMs: number; easing: string }) => void;
  removeState: (nodeId: string, state: StateKey) => void;

  // ---- timelines y keyframes (Fase 4) ----
  addTimeline: (name: string) => void;
  removeTimeline: (id: string) => void;
  updateTimeline: (id: string, partial: Partial<Pick<Timeline, "durationMs" | "loop" | "name">>) => void;
  /** Captura un keyframe de la selección actual en el instante t (0..1). */
  captureKeyframe: (timelineId: string, t: number) => void;
  removeKeyframe: (timelineId: string, index: number) => void;
  setKeyframeEasing: (timelineId: string, index: number, easing: string | undefined) => void;

  // ---- componentes (Fase 2) ----
  createComponent: (name: string) => void;
  insertComponent: (componentId: string) => void;

  // ---- variantes e instancias con overrides (Fase 7) ----
  addVariant: (componentId: string, name: string) => void;
  updateComponent: (componentId: string) => void;

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
  doc: { version: "", tokens: { colors: {}, radii: {}, spacing: {}, typography: {}, shadows: {}, easings: {} }, library: { components: {}, variants: {} }, timelines: [], assets: [], screens: [], connections: [], root: { id: "", type: "frame", name: "", style: { x: 0, y: 0, width: 0, height: 0 }, children: [] } },
  screens: [],
  connections: [],
  history: { past: [], future: [] },
  selection: [],
  hoverId: null,
  tool: "select",
  rightTab: "inspector",
  previewState: null,
  previewMode: false,
  previewHoverId: null,
  previewPressId: null,
  playing: false,
  activeTimelineId: null,
  previewScreen: null,
  previewTransitionMs: null,
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
      doc: { ...doc, screens: doc.screens ?? [], connections: doc.connections ?? [] },
      screens: doc.screens ?? [],
      connections: doc.connections ?? [],
      selection: [],
      history: { past: [], future: [] },
      drag: null,
      editingTextId: null,
      previewMode: false,
      playing: false,
      previewHoverId: null,
      previewPressId: null,
      activeTimelineId: null,
      previewScreen: null,
      previewTransitionMs: null,
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
  setRightTab: (rightTab) => set({ rightTab }),
  setPreviewState: (previewState) => set({ previewState }),
  setPreviewMode: (previewMode) =>
    set((s) => ({
      previewMode,
      playing: previewMode ? s.playing : false,
      previewHoverId: null,
      previewPressId: null,
      previewScreen: previewMode ? s.previewScreen : null,
      previewTransitionMs: previewMode ? s.previewTransitionMs : null,
    })),
  setPreviewHoverId: (previewHoverId) => set({ previewHoverId }),
  setPreviewPressId: (previewPressId) => set({ previewPressId }),
  setPlaying: (playing) => set({ playing }),
  setActiveTimelineId: (activeTimelineId) => set({ activeTimelineId }),
  setPreviewScreen: (previewScreen) => set({ previewScreen }),

  previewNavigate: (toScreenId, durationMs = null) => {
    const s = get();
    if (!s.previewMode) return;
    if (toScreenId === s.doc.root.id) {
      set({ previewScreen: null, previewTransitionMs: durationMs });
      return;
    }
    const target = s.screens.find((sc) => sc.id === toScreenId);
    if (!target) return;
    set({ previewScreen: target, previewTransitionMs: durationMs });
  },

  addScreen: () => {
    const st = get();
    const w = st.doc.root.style.width;
    const h = st.doc.root.style.height;
    const blank = frameNode("Pantalla nueva", { x: 0, y: 0, width: w, height: h }, {
      style: { x: 0, y: 0, width: w, height: h, backgroundColor: "#10131F" },
    });
    get().apply((d) => {
      d.screens = [...(d.screens ?? []), blank];
    });
    get().switchScreen(blank.id);
    get().showToast("Pantalla nueva creada");
  },

  duplicateScreen: () => {
    const clone = cloneNode(get().doc.root);
    remapIds(clone);
    clone.name = `${clone.name} copia`;
    get().apply((d) => {
      d.screens = [...(d.screens ?? []), clone];
    });
    get().switchScreen(clone.id);
    get().showToast("Pantalla duplicada");
  },

  switchScreen: (screenId) => {
    const s = get();
    if (screenId === s.doc.root.id) return;
    const idx = s.screens.findIndex((sc) => sc.id === screenId);
    if (idx < 0) return;
    const target = s.screens[idx];
    get().apply((d) => {
      d.screens = [...(d.screens ?? [])];
      d.screens[idx] = d.root;
      d.root = target;
    });
    set({ selection: [] });
    get().fitTo(nodeRect(get().doc.root));
  },

  deleteScreen: (screenId) => {
    get().apply((d) => {
      d.screens = (d.screens ?? []).filter((sc) => sc.id !== screenId);
      d.connections = (d.connections ?? []).filter((c) => c.toScreenId !== screenId);
    });
  },

  addConnection: (fromNodeId, toScreenId, transition) =>
    get().apply((d) => {
      const conn: PrototypeConnection = {
        id: uid(),
        fromNodeId,
        toScreenId,
        transition,
      };
      d.connections = [...(d.connections ?? []), conn];
    }),

  removeConnection: (id) =>
    get().apply((d) => {
      d.connections = (d.connections ?? []).filter((c) => c.id !== id);
    }),

  updateConnection: (id, partial) =>
    get().apply((d) => {
      d.connections = (d.connections ?? []).map((c) =>
        c.id === id ? { ...c, ...partial } : c,
      );
    }),
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

  alignSelection: (kind) => {
    const ids = get().selection;
    if (ids.length === 0) return;
    get().apply((d) => {
      const nodes = ids
        .map((id) => findNode(d.root, id))
        .filter((n): n is Node => Boolean(n));
      if (nodes.length === 0) return;
      const box = bbox(nodes.map(nodeRect));
      if (!box) return;
      for (const n of nodes) {
        const r = nodeRect(n);
        switch (kind) {
          case "left": n.style.x = Math.round(box.x); break;
          case "centerH": n.style.x = Math.round(box.x + box.width / 2 - r.width / 2); break;
          case "right": n.style.x = Math.round(box.x + box.width - r.width); break;
          case "top": n.style.y = Math.round(box.y); break;
          case "centerV": n.style.y = Math.round(box.y + box.height / 2 - r.height / 2); break;
          case "bottom": n.style.y = Math.round(box.y + box.height - r.height); break;
        }
      }
    });
  },

  distributeSelection: (kind) => {
    const ids = get().selection;
    if (ids.length < 3) {
      get().showToast("Selecciona al menos 3 elementos para distribuir");
      return;
    }
    get().apply((d) => {
      const nodes = ids
        .map((id) => findNode(d.root, id))
        .filter((n): n is Node => Boolean(n));
      if (nodes.length < 3) return;
      const sorted = [...nodes].sort((a, b) =>
        kind === "h" ? a.style.x - b.style.x : a.style.y - b.style.y,
      );
      const [first, last] = [sorted[0], sorted[sorted.length - 1]];
      const inner = sorted.slice(1, -1);
      if (kind === "h") {
        const span = last.style.x + last.style.width - first.style.x;
        const free = span - inner.reduce((sum, n) => sum + n.style.width, 0);
        const gap = free / (sorted.length - 1);
        let pos = first.style.x + first.style.width;
        for (const n of inner) {
          n.style.x = Math.round(pos + gap);
          pos = n.style.x + n.style.width;
        }
      } else {
        const span = last.style.y + last.style.height - first.style.y;
        const free = span - inner.reduce((sum, n) => sum + n.style.height, 0);
        const gap = free / (sorted.length - 1);
        let pos = first.style.y + first.style.height;
        for (const n of inner) {
          n.style.y = Math.round(pos + gap);
          pos = n.style.y + n.style.height;
        }
      }
    });
  },

  updateTokens: (fn) => get().apply((d) => fn(d.tokens)),

  setStateOverride: (nodeId, state, partial) =>
    get().apply((d) => {
      const n = findNode(d.root, nodeId);
      if (!n) return;
      const states = (n.states ??= {});
      const entry = (states[state] ??= { style: {} });
      entry.style = { ...entry.style, ...partial };
    }),

  setStateTransition: (nodeId, state, transition) =>
    get().apply((d) => {
      const n = findNode(d.root, nodeId);
      if (!n) return;
      const states = (n.states ??= {});
      const entry = (states[state] ??= { style: {} });
      entry.transition = transition;
    }),

  removeState: (nodeId, state) =>
    get().apply((d) => {
      const n = findNode(d.root, nodeId);
      if (!n || !n.states) return;
      delete n.states[state];
    }),

  addTimeline: (name) => {
    const tl: Timeline = {
      id: uid(),
      name: name || "Línea de tiempo",
      durationMs: 1000,
      loop: true,
      playMode: "forward",
      keyframes: [],
    };
    get().apply((d) => {
      d.timelines.push(tl);
    });
    get().setActiveTimelineId(tl.id);
    get().setRightTab("animate");
  },

  removeTimeline: (id) => {
    get().apply((d) => {
      d.timelines = d.timelines.filter((t) => t.id !== id);
    });
    if (get().activeTimelineId === id) {
      set({ activeTimelineId: null, playing: false });
    }
  },

  updateTimeline: (id, partial) =>
    get().apply((d) => {
      const tl = d.timelines.find((t) => t.id === id);
      if (tl) Object.assign(tl, partial);
    }),

  captureKeyframe: (timelineId, t) =>
    get().apply((d) => {
      const tl = d.timelines.find((x) => x.id === timelineId);
      if (!tl) return;
      const ids = get().selection;
      if (ids.length === 0) return;
      const tClamped = Math.min(1, Math.max(0, t));
      for (const id of ids) {
        const n = findNode(d.root, id);
        if (!n) continue;
        const props = pickAnimatedProps(n.style);
        const existing = tl.keyframes.find(
          (k) => k.nodeId === id && Math.abs(k.t - tClamped) < 0.0001,
        );
        if (existing) existing.properties = props;
        else tl.keyframes.push({ t: tClamped, nodeId: id, properties: props });
      }
    }),

  removeKeyframe: (timelineId, index) =>
    get().apply((d) => {
      const tl = d.timelines.find((t) => t.id === timelineId);
      if (tl) tl.keyframes.splice(index, 1);
    }),

  setKeyframeEasing: (timelineId, index, easing) =>
    get().apply((d) => {
      const tl = d.timelines.find((t) => t.id === timelineId);
      const kf = tl?.keyframes[index];
      if (kf) kf.easing = easing;
    }),

  saveColorAsToken: (color, field = "backgroundColor") => {
    if (!color) return;
    get().apply((d) => {
      const colors = d.tokens.colors;
      let i = 1;
      let name = `color${i}`;
      while (colors[name] !== undefined) {
        i += 1;
        name = `color${i}`;
      }
      colors[name] = color;
      const ids = get().selection;
      for (const id of ids) {
        const n = findNode(d.root, id);
        if (n) n.style[field] = `$${name}`;
      }
    });
    get().showToast("Color guardado como token y aplicado");
  },

  createComponent: (name) => {
    const ids = get().selection;
    if (ids.length === 0) return;
    if (ids.length > 1) {
      get().groupSelection("Componente");
      const sel = useStore.getState().selection;
      if (sel.length !== 1) return;
      get().createComponent(name);
      return;
    }
    get().apply((d) => {
      const n = findNode(d.root, ids[0]);
      if (!n) return;
      const libId = uid();
      const template = cloneNode(n);
      remapIds(template);
      // Normaliza el template a (0,0): los hijos son relativos a la caja del
      // padre, así que el componente queda independiente de dónde se creó
      // (previews limpios en la librería y colocación al insertar).
      template.style.x = 0;
      template.style.y = 0;
      d.library.components[libId] = {
        id: libId,
        name: name || n.name,
        type: n.type,
        root: template,
      };
      n.ref = `comp:${libId}`;
    });
    get().showToast("Componente creado en tu librería");
  },

  insertComponent: (componentId) => {
    const comp = get().doc.library.components[componentId];
    if (!comp) return;
    const clone = cloneNode(comp.root);
    remapIds(clone);
    clone.ref = `comp:${componentId}`;
    const vp = get().viewport;
    const cx = (vp.size.x / 2 - vp.pan.x) / vp.zoom;
    const cy = (vp.size.y / 2 - vp.pan.y) / vp.zoom;
    clone.style.x = Math.round(cx - clone.style.width / 2);
    clone.style.y = Math.round(cy - clone.style.height / 2);
    get().apply((d) => {
      d.root.children.push(clone);
    });
    get().select([clone.id]);
    get().showToast(`Instancia de “${comp.name}” insertada`);
  },

  addVariant: (componentId, name) => {
    const comp = get().doc.library.components[componentId];
    if (!comp) return;
    const template = cloneNode(comp.root);
    remapIds(template);
    template.style.x = 0;
    template.style.y = 0;
    const variantId = uid();
    get().apply((d) => {
      d.library.components[variantId] = {
        id: variantId,
        name: `${comp.name} · ${name}`,
        type: comp.type,
        root: template,
        variantOf: componentId,
      };
    });
    get().showToast(`Variante “${name}” creada`);
  },

  updateComponent: (componentId) => {
    const comp = get().doc.library.components[componentId];
    const ids = get().selection;
    const sel = ids.length === 1 ? findNode(get().doc.root, ids[0]) : null;
    if (!comp || !sel) {
      get().showToast("Selecciona una instancia del componente");
      return;
    }
    const template = cloneNode(sel);
    remapIds(template);
    template.style.x = 0;
    template.style.y = 0;
    get().apply((d) => {
      const c = d.library.components[componentId];
      if (!c) return;
      c.root = template;
      c.name = sel.name || c.name;
    });
    get().showToast("Componente actualizado (futuras instancias heredarán los cambios)");
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

/** Propiedades animables de un estilo (las que entiende WAAPI). */
function pickAnimatedProps(s: Style): Partial<Style> {
  const out: Partial<Style> = {};
  if (s.x !== undefined) out.x = s.x;
  if (s.y !== undefined) out.y = s.y;
  if (s.width !== undefined) out.width = s.width;
  if (s.height !== undefined) out.height = s.height;
  if (s.opacity !== undefined) out.opacity = s.opacity;
  if (s.scale !== undefined) out.scale = s.scale;
  if (s.translate) out.translate = { ...s.translate };
  if (s.backgroundColor) out.backgroundColor = s.backgroundColor;
  if (s.color) out.color = s.color;
  if (s.fontSize !== undefined) out.fontSize = s.fontSize;
  if (s.letterSpacing !== undefined) out.letterSpacing = s.letterSpacing;
  if (s.filters?.blur !== undefined) out.filters = { blur: s.filters.blur };
  return out;
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
