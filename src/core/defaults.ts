/**
 * Defaults — tokens semilla, presets de pantallas y proyectos starter.
 * La regla de los 10 minutos vive aquí: abrir un starter debe verse bien
 * desde el primer segundo.
 */
import type { CanvasDoc, Node, Rect, Tokens } from "./ir";
import { CURRENT_VERSION } from "./ir";
import { uid } from "./tree";

// ---------------------------------------------------------------------------
// Tokens semilla (edición visual de tokens llega en Fase 2)
// ---------------------------------------------------------------------------

export const DEFAULT_TOKENS: Tokens = {
  colors: {
    bg: "#0B0E1A",
    surface: "#161B2E",
    primary: "#7C5CFF",
    accent: "#FF6B9D",
    text: "#F5F7FF",
    textMuted: "#8A93B8",
    success: "#3DDC97",
    warning: "#FFC857",
    danger: "#FF5C7A",
  },
  radii: {
    sm: 8,
    md: 14,
    lg: 24,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
  },
  typography: {
    title: {
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: 900,
      fontSize: 128,
      letterSpacing: 6,
      textTransform: "uppercase",
    },
    button: {
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: 900,
      fontSize: 30,
      letterSpacing: 8,
      textTransform: "uppercase",
    },
  },
  shadows: {
    card: "0 12px 40px rgba(0, 0, 0, 0.35)",
    glow: "0 0 60px rgba(124, 92, 255, 0.45)",
  },
  easings: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
};

// ---------------------------------------------------------------------------
// Presets de pantallas + áreas seguras
// ---------------------------------------------------------------------------

export interface FramePreset {
  id: string;
  label: string;
  category: "Game / TV" | "Mobile" | "Web";
  width: number;
  height: number;
  /** Fracciones del tamaño para safe areas TV/consola (title/action). */
  safeArea?: { title: number; action: number };
  icon: "tv" | "smartphone" | "monitor";
}

export const FRAME_PRESETS: FramePreset[] = [
  { id: "tv1080", label: "TV 1080p", category: "Game / TV", width: 1920, height: 1080, safeArea: { title: 0.05, action: 0.1 }, icon: "tv" },
  { id: "tv4k", label: "TV 4K", category: "Game / TV", width: 3840, height: 2160, safeArea: { title: 0.05, action: 0.1 }, icon: "tv" },
  { id: "tv720", label: "TV 720p", category: "Game / TV", width: 1280, height: 720, safeArea: { title: 0.05, action: 0.1 }, icon: "tv" },
  { id: "wide21", label: "Ultrawide 21:9", category: "Game / TV", width: 2560, height: 1080, safeArea: { title: 0.05, action: 0.1 }, icon: "tv" },
  { id: "iphone", label: "iPhone 15", category: "Mobile", width: 393, height: 852, icon: "smartphone" },
  { id: "android", label: "Android", category: "Mobile", width: 412, height: 915, icon: "smartphone" },
  { id: "web", label: "Web desktop", category: "Web", width: 1440, height: 900, icon: "monitor" },
];

export function presetById(id: string): FramePreset | undefined {
  return FRAME_PRESETS.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Constructores de nodos
// ---------------------------------------------------------------------------

export function frameNode(name: string, rect: Rect, extra?: Partial<Node>): Node {
  return {
    id: uid(),
    type: "frame",
    name,
    style: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    children: [],
    ...extra,
  };
}

export function textNode(
  name: string,
  rect: Rect,
  text: string,
  style: Partial<Node["style"]> = {},
): Node {
  return {
    id: uid(),
    type: "text",
    name,
    text,
    style: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: 500,
      fontSize: 28,
      color: "$text",
      lineHeight: 1.2,
      ...style,
    },
    children: [],
  };
}

export function shapeNode(
  shape: "rect" | "ellipse" | "line",
  name: string,
  rect: Rect,
): Node {
  const isLine = shape === "line";
  return {
    id: uid(),
    type: "shape",
    shape,
    name,
    style: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: isLine ? Math.max(4, rect.height) : rect.height,
      backgroundColor: "#7C5CFF",
      borderRadius: isLine ? 2 : 0,
    },
    children: [],
  };
}

/** Crea un botón (frame + texto hijo) con la pinta del starter. */
function button(
  name: string,
  rect: Rect,
  opts: {
    label: string;
    bg?: string;
    color?: string;
    stroke?: { color: string; width: number };
    shadow?: { color: string; x: number; y: number; blur: number };
  },
): Node {
  return frameNode(name, rect, {
    style: {
      ...rect,
      backgroundColor: opts.bg,
      color: opts.color,
      borderRadius: "$radius-lg",
      boxShadow: opts.shadow,
      stroke: opts.stroke,
    },
    children: [
      textNode(name, { x: 0, y: 0, width: rect.width, height: rect.height }, opts.label, {
        color: opts.color ?? "$text",
        fontSize: 30,
        fontWeight: 900,
        letterSpacing: 8,
        textTransform: "uppercase",
        textAlign: "center",
        lineHeight: 1.2,
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Starters
// ---------------------------------------------------------------------------

/** Starter "Menú de juego" — pantalla 1080p con gradientes, glows y botones. */
export function buildGameMenuStarter(): CanvasDoc {
  const root = frameNode(
    "Menú principal",
    { x: 0, y: 0, width: 1920, height: 1080 },
    {
      style: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        gradient: {
          type: "linear",
          angle: 160,
          stops: [
            { pos: 0, color: "#0B0E1A" },
            { pos: 0.55, color: "#1A1238" },
            { pos: 1, color: "#331556" },
          ],
        },
      },
      guides: { vertical: [960], horizontal: [540] },
      safeArea: { title: 0.05, action: 0.1 },
      children: [
        // Glows decorativos (blend mode screen + blur = luz real)
        frameNode("Glow superior", { x: 1120, y: 60, width: 560, height: 560 }, {
          style: {
            x: 1120, y: 60, width: 560, height: 560,
            backgroundColor: "#7C5CFF", opacity: 0.4, borderRadius: 999,
            filters: { blur: 140 }, blendMode: "screen",
          },
        }),
        frameNode("Glow inferior", { x: 220, y: 640, width: 480, height: 480 }, {
          style: {
            x: 220, y: 640, width: 480, height: 480,
            backgroundColor: "#FF6B9D", opacity: 0.32, borderRadius: 999,
            filters: { blur: 130 }, blendMode: "screen",
          },
        }),
        // Título con gradiente de texto
        textNode("Título", { x: 260, y: 230, width: 1400, height: 170 }, "NEBULA RUN", {
          fontSize: 132, fontWeight: 900, letterSpacing: 10, textTransform: "uppercase",
          textAlign: "center", lineHeight: 1.15,
          gradient: {
            type: "linear", angle: 90,
            stops: [
              { pos: 0, color: "#7C5CFF" },
              { pos: 0.5, color: "#C084FC" },
              { pos: 1, color: "#FF6B9D" },
            ],
          },
        }),
        textNode("Subtítulo", { x: 260, y: 430, width: 1400, height: 60 }, "Una aventura de carreras a través de la galaxia", {
          fontSize: 34, fontWeight: 500, color: "$textMuted", textAlign: "center", lineHeight: 1.4,
        }),
        button("Botón Jugar", { x: 730, y: 560, width: 460, height: 96 }, {
          label: "Jugar",
          bg: "$primary",
          shadow: { color: "rgba(124, 92, 255, 0.45)", x: 0, y: 12, blur: 40 },
        }),
        button("Botón Ajustes", { x: 730, y: 680, width: 460, height: 96 }, {
          label: "Ajustes",
          bg: "$surface",
          stroke: { color: "#3A4168", width: 2 },
        }),
        button("Botón Salir", { x: 730, y: 800, width: 460, height: 96 }, {
          label: "Salir",
          bg: "rgba(255, 255, 255, 0.04)",
          color: "$textMuted",
          stroke: { color: "rgba(138, 147, 184, 0.35)", width: 2 },
        }),
        textNode("Pie", { x: 260, y: 1020, width: 1400, height: 30 }, "v0.1.0 · Plantilla de menú · Hecho en Canvas", {
          fontSize: 20, fontWeight: 400, color: "$textMuted", textAlign: "center",
        }),
      ],
    },
  );

  return {
    version: CURRENT_VERSION,
    tokens: DEFAULT_TOKENS,
    library: { components: {}, variants: {} },
    timelines: [],
    assets: [],
    root,
  };
}

/** Starter "HUD móvil" — health bar, score, minimapa, joystick. */
export function buildHudStarter(): CanvasDoc {
  const root = frameNode(
    "HUD móvil",
    { x: 0, y: 0, width: 393, height: 852 },
    {
      style: { x: 0, y: 0, width: 393, height: 852, backgroundColor: "#0A0E1A" },
      children: [
        // Barra de vida
        frameNode("Barra de vida", { x: 20, y: 28, width: 150, height: 12 }, {
          style: {
            x: 20, y: 28, width: 150, height: 12,
            backgroundColor: "rgba(255, 255, 255, 0.12)", borderRadius: 999,
          },
          children: [
            frameNode("Vida", { x: 2, y: 2, width: 106, height: 8 }, {
              style: { x: 2, y: 2, width: 106, height: 8, backgroundColor: "$success", borderRadius: 999 },
            }),
          ],
        }),
        textNode("Munición", { x: 20, y: 50, width: 120, height: 22 }, "24 / 96", {
          fontSize: 16, fontWeight: 600, color: "$textMuted", letterSpacing: 1,
          fontFamily: "'Courier New', monospace",
        }),
        textNode("Puntuación", { x: 203, y: 28, width: 170, height: 24 }, "SCORE 012345", {
          fontSize: 16, fontWeight: 700, color: "$text", letterSpacing: 2, textAlign: "right",
        }),
        // Minimapa
        frameNode("Minimapa", { x: 289, y: 28, width: 84, height: 84 }, {
          style: {
            x: 289, y: 28, width: 84, height: 84,
            backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 999,
            stroke: { color: "#3A4168", width: 1.5 },
          },
          children: [
            frameNode("Jugador", { x: 37, y: 37, width: 10, height: 10 }, {
              style: { x: 37, y: 37, width: 10, height: 10, backgroundColor: "$accent", borderRadius: 999 },
            }),
          ],
        }),
        // Botón de pausa
        frameNode("Pausa", { x: 165, y: 720, width: 64, height: 64 }, {
          style: {
            x: 165, y: 720, width: 64, height: 64,
            backgroundColor: "$surface", borderRadius: 999,
            stroke: { color: "#3A4168", width: 1.5 },
          },
          children: [
            textNode("Icono pausa", { x: 0, y: 0, width: 64, height: 64 }, "II", {
              fontSize: 22, fontWeight: 700, color: "$text", textAlign: "center", lineHeight: 3,
            }),
          ],
        }),
        // Joystick
        frameNode("Joystick", { x: 24, y: 700, width: 120, height: 120 }, {
          style: {
            x: 24, y: 700, width: 120, height: 120,
            backgroundColor: "rgba(255, 255, 255, 0.06)", borderRadius: 999,
            stroke: { color: "rgba(58, 65, 104, 0.8)", width: 1.5 },
          },
          children: [
            frameNode("Palanca", { x: 32, y: 32, width: 56, height: 56 }, {
              style: { x: 32, y: 32, width: 56, height: 56, backgroundColor: "rgba(255, 255, 255, 0.16)", borderRadius: 999 },
            }),
          ],
        }),
      ],
    },
  );

  return {
    version: CURRENT_VERSION,
    tokens: DEFAULT_TOKENS,
    library: { components: {}, variants: {} },
    timelines: [],
    assets: [],
    root,
  };
}

/** Proyecto en blanco con el preset elegido. */
export function buildBlankDoc(preset: FramePreset): CanvasDoc {
  const root = frameNode("Pantalla sin título", { x: 0, y: 0, width: preset.width, height: preset.height }, {
    style: { x: 0, y: 0, width: preset.width, height: preset.height, backgroundColor: "#10131F" },
    safeArea: preset.safeArea,
    guides: preset.safeArea ? { vertical: [preset.width / 2], horizontal: [preset.height / 2] } : undefined,
  });

  return {
    version: CURRENT_VERSION,
    tokens: DEFAULT_TOKENS,
    library: { components: {}, variants: {} },
    timelines: [],
    assets: [],
    root,
  };
}

export type StarterKind = "game" | "hud" | "blank";

export function newDoc(kind: StarterKind, preset?: FramePreset): CanvasDoc {
  if (kind === "game") return buildGameMenuStarter();
  if (kind === "hud") return buildHudStarter();
  return buildBlankDoc(preset ?? FRAME_PRESETS[0]);
}
