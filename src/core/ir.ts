/**
 * IR — Intermediate Representation
 * ================================
 * La ÚNICA fuente de verdad del editor. Todo lo demás (canvas, exportadores,
 * preview, autosave) lee y escribe este modelo.
 *
 * Reglas:
 *  - `version` usa SemVer. Al abrir un archivo, `migrate()` aplica migraciones
 *    PURAS en memoria hasta alcanzar `CURRENT_VERSION`. Nunca se muta el archivo.
 *  - Los tokens se referencian como strings "$nombre" (ej: backgroundColor: "$primary").
 *  - Un nodo puede ser Frame, Text, Image, Component, Shape o Vector.
 *  - Los campos de layout (flexbox), estados y animaciones YA están tipados aquí
 *    aunque su UI llegue en fases posteriores: el formato no cambia, solo crece.
 */

export const CURRENT_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Tipos base
// ---------------------------------------------------------------------------

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Tokens del sistema de diseño
// ---------------------------------------------------------------------------

export interface Tokens {
  colors: Record<string, string>;
  radii: Record<string, number>;
  spacing: Record<string, number>;
  /** Tipografías reutilizables (fuente, tamaño, peso, tracking, alto de línea). */
  typography: Record<string, Typography>;
  /** Sombras reutilizables (string CSS listo para box-shadow). */
  shadows: Record<string, string>;
  /** Curvas de easing reutilizables (CSS cubic-bezier). */
  easings: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Style — flexbox + visual, sin jerga técnica para el usuario final
// ---------------------------------------------------------------------------

export type FlexDirection = "row" | "column";
export type Justify =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";
export type AlignY = "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
export type TextAlign = "left" | "center" | "right" | "justify";
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Shadow {
  color: string;
  x: number;
  y: number;
  blur: number;
  spread?: number;
  inset?: boolean;
}

export interface GradientStop {
  pos: number; // 0..1
  color: string;
}

export interface Gradient {
  type: "linear" | "radial";
  /** Ángulo en grados (lineal). */
  angle: number;
  stops: GradientStop[];
}

export interface Typography {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  textTransform?: TextTransform;
}

export interface Style {
  // ---- caja ----
  x: number;
  y: number;
  width: number;
  height: number;

  // ---- layout (auto-layout / flexbox) — UI en Fase 3, tipado ya en el IR ----
  flexDirection?: FlexDirection;
  justifyContent?: Justify;
  alignItems?: AlignY;
  gap?: number;
  padding?: Padding;

  // ---- visual ----
  /** Color sólido, o referencia "$token" (ej. "$primary"). */
  backgroundColor?: string;
  gradient?: Gradient;
  /** Relleno de texto, o referencia "$token". */
  color?: string;
  opacity?: number;
  scale?: number;
  translate?: Vec;
  /** Número o referencia "$token" de radii (ej. "$radius-md"). */
  borderRadius?: number | string;
  boxShadow?: Shadow;
  /** CSS mix-blend-mode: normal, multiply, screen, overlay, … */
  blendMode?: string;
  filters?: { blur?: number };

  // ---- tipografía ----
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  textTransform?: TextTransform;

  // ---- trazo (formas, líneas) ----
  stroke?: { color: string; width: number };
}

// ---------------------------------------------------------------------------
// Nodo
// ---------------------------------------------------------------------------

export type NodeType = "frame" | "text" | "image" | "component" | "shape" | "vector";
export type ShapeKind = "rect" | "ellipse" | "line";

/** Estados interactivos de un nodo (Fase 3). */
export type StateKey = "default" | "hover" | "pressed" | "disabled" | "focused";

export interface NodeState {
  /** Overrides parciales de style para este estado. */
  style: Partial<Style>;
  /** Transición al entrar/salir del estado: easing = token "$easing" o curva CSS. */
  transition?: { durationMs: number; easing: string };
}

/** Disparadores de animación (Fase 4). */
export type AnimTriggerKind = "onLoad" | "onHover" | "onPress" | "onEvent";

export interface AnimationTrigger {
  trigger: AnimTriggerKind;
  timelineId: string;
}

/** Comportamiento responsive por nodo (Fase 3). */
export interface Constraints {
  horizontal: "min" | "max" | "stretch" | "center" | "scale";
  vertical: "min" | "max" | "stretch" | "center" | "scale";
}

export interface Keyframe {
  /** Posición en el tiempo 0..1 */
  t: number;
  nodeId: string;
  properties: Partial<Style>;
  easing?: string;
}

export interface Timeline {
  id: string;
  name: string;
  durationMs: number;
  loop: boolean;
  playMode: "forward" | "reverse" | "pingpong";
  keyframes: Keyframe[];
}

export interface Asset {
  id: string;
  /** SHA-256 del binario, como clave de deduplicación. */
  hash: string;
  name: string;
  mime: string;
}

export interface LibraryComponent {
  id: string;
  name: string;
  type: NodeType;
  root: Node;
}

export interface Library {
  components: Record<string, LibraryComponent>;
  variants: Record<string, { componentId: string; props: Record<string, string> }>;
}

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  /** "$token" o referencia a componente/variante de la librería. */
  ref?: string;
  style: Style;
  /** Overrides parciales por estado interactivo (Fase 3). */
  states?: Partial<Record<StateKey, NodeState>>;
  /** Animaciones disparadas por triggers (Fase 4). */
  animations?: AnimationTrigger[];
  /** Constraints/responsive (Fase 3). */
  constraints?: Constraints;
  /** Guías de diseño del frame (Fase 1: solo el frame raíz del proyecto). */
  guides?: { vertical: number[]; horizontal: number[] };
  /** Áreas seguras TV/consola como fracción del tamaño (Fase 1). */
  safeArea?: { title: number; action: number };
  /** Para nodos type === "shape". */
  shape?: ShapeKind;
  /** Para nodos type === "text". */
  text?: string;
  /** Oculto del render y del export (ojo en layers). */
  hidden?: boolean;
  children: Node[];
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export interface CanvasDoc {
  version: string;
  tokens: Tokens;
  library: Library;
  timelines: Timeline[];
  assets: Asset[];
  /** El frame raíz ES la pantalla/artboard del proyecto. */
  root: Node;
}

// ---------------------------------------------------------------------------
// Migraciones — versionado SemVer, migraciones puras aplicadas en memoria
// ---------------------------------------------------------------------------

export interface Migration {
  from: string;
  to: string;
  migrate: (doc: Record<string, unknown>) => Record<string, unknown>;
}

export const MIGRATIONS: Migration[] = [
  {
    // Prototipos pre-0.1.0 (nunca publicados): normaliza los campos base.
    from: "0.0.0",
    to: "0.1.0",
    migrate: (doc) => ({
      ...doc,
      version: "0.1.0",
      tokens:
        doc.tokens ?? {
          colors: {},
          radii: {},
          spacing: {},
          typography: {},
          shadows: {},
          easings: {},
        },
      library: doc.library ?? { components: {}, variants: {} },
      timelines: doc.timelines ?? [],
      assets: doc.assets ?? [],
    }),
  },
];

/**
 * Aplica migraciones en cadena hasta alcanzar CURRENT_VERSION.
 * Nunca modifica el objeto de entrada: devuelve un documento nuevo.
 */
export function migrate(raw: unknown): CanvasDoc {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Proyecto inválido: no es un objeto JSON.");
  }
  const doc = raw as Record<string, unknown>;
  if (!doc.root) throw new Error("Proyecto inválido: falta el nodo `root`.");
  if (doc.version === CURRENT_VERSION) return doc as unknown as CanvasDoc;

  let current = doc;
  let guard = 0;
  while (current.version !== CURRENT_VERSION) {
    if (guard++ > 32) throw new Error("Demasiadas migraciones encadenadas.");
    const migration = MIGRATIONS.find((m) => m.from === current.version);
    if (!migration) {
      throw new Error(`Versión de proyecto desconocida: ${String(current.version)}`);
    }
    current = migration.migrate(current);
  }
  return current as unknown as CanvasDoc;
}
