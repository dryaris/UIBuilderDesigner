/**
 * Importador de Figma (formato JSON de la API de Figma).
 *
 * Soporta el JSON que devuelve la API de Figma (GET /v1/files/:key)
 * con la estructura: document → children → pages → frames → nodos.
 *
 * Limitaciones conocidas:
 * - No importa componentes de Figma (los convierte a frames).
 * - No importa estilos de Figma (los convierte a valores inline).
 * - No importa auto-layout de Figma (lo ignora, usa posición absoluta).
 * - No importa masks, blend modes avanzados, o efectos complejos.
 */
import type { Node, Style } from "../core/ir";
import { uid } from "../core/tree";

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    opacity?: number;
    gradientStops?: Array<{ color: { r: number; g: number; b: number; a?: number }; position: number }>;
    gradientHandlePositions?: Array<{ x: number; y: number }>;
  }>;
  strokes?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    opacity?: number;
  }>;
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  effects?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    offset?: { x: number; y: number };
    radius?: number;
    spread?: number;
    visible?: boolean;
  }>;
  opacity?: number;
  characters?: string;
  style?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    letterSpacing?: number;
    lineHeightPx?: number;
    textAlignHorizontal?: string;
  };
  children?: FigmaNode[];
}

interface FigmaDocument {
  document?: FigmaNode;
  name?: string;
}

function figmaColorToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const a = c.a ?? 1;
  if (a < 1) {
    return `rgba(${r},${g},${b},${a.toFixed(2)})`;
  }
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function figmaNodeToIR(node: FigmaNode, parentX: number, parentY: number): Node | null {
  if (node.visible === false) return null;

  const box = node.absoluteBoundingBox;
  if (!box) return null;

  const x = Math.round(box.x - parentX);
  const y = Math.round(box.y - parentY);
  const width = Math.round(box.width);
  const height = Math.round(box.height);

  if (width <= 0 || height <= 0) return null;

  const style: Style = { x, y, width, height };

  // Fills
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === "SOLID" && fill.color) {
      style.backgroundColor = figmaColorToHex(fill.color);
      if (fill.opacity !== undefined && fill.opacity < 1) {
        style.opacity = fill.opacity;
      }
    } else if (fill.type === "GRADIENT_LINEAR" && fill.gradientStops) {
      const stops = fill.gradientStops.map((s) => ({
        pos: s.position,
        color: figmaColorToHex(s.color),
      }));
      // Calcular ángulo desde gradientHandlePositions.
      let angle = 180;
      if (fill.gradientHandlePositions && fill.gradientHandlePositions.length >= 2) {
        const h0 = fill.gradientHandlePositions[0];
        const h1 = fill.gradientHandlePositions[1];
        angle = Math.round((Math.atan2(h1.y - h0.y, h1.x - h0.x) * 180) / Math.PI + 90);
      }
      style.gradient = { type: "linear", angle, stops };
    }
  }

  // Strokes
  if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
    const stroke = node.strokes[0];
    if (stroke.color) {
      style.stroke = {
        color: figmaColorToHex(stroke.color),
        width: node.strokeWeight,
      };
    }
  }

  // Corner radius
  if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
    style.borderRadius = node.cornerRadius;
  } else if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    if (tl === tr && tr === br && br === bl && tl > 0) {
      style.borderRadius = tl;
    }
  }

  // Effects (shadow)
  if (node.effects) {
    const shadow = node.effects.find(
      (e) => e.type === "DROP_SHADOW" && e.visible !== false && e.color && e.offset,
    );
    if (shadow && shadow.color && shadow.offset) {
      style.boxShadow = {
        x: shadow.offset.x,
        y: shadow.offset.y,
        blur: shadow.radius ?? 0,
        spread: shadow.spread,
        color: figmaColorToHex(shadow.color),
      };
    }
  }

  // Opacity
  if (node.opacity !== undefined && node.opacity < 1) {
    style.opacity = node.opacity;
  }

  // Text
  let text: string | undefined;
  let type: Node["type"] = "frame";
  if (node.type === "TEXT" && node.characters) {
    type = "text";
    text = node.characters;
    if (node.style) {
      if (node.style.fontFamily) style.fontFamily = node.style.fontFamily;
      if (node.style.fontWeight) style.fontWeight = node.style.fontWeight;
      if (node.style.fontSize) style.fontSize = node.style.fontSize;
      if (node.style.letterSpacing) style.letterSpacing = node.style.letterSpacing;
      if (node.style.lineHeightPx) style.lineHeight = node.style.lineHeightPx / (node.style.fontSize ?? 16);
      if (node.style.textAlignHorizontal) {
        const align = node.style.textAlignHorizontal.toLowerCase();
        if (align === "center" || align === "left" || align === "right" || align === "justified") {
          style.textAlign = align === "justified" ? "justify" : (align as Style["textAlign"]);
        }
      }
    }
  } else if (node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION" || node.type === "STAR" || node.type === "POLYGON" || node.type === "LINE") {
    type = "vector";
    // Los vectores de Figma se importan como rectángulos con el fill color.
  } else if (node.type === "ELLIPSE") {
    type = "shape";
    (style as any).shape = "ellipse";
  } else if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.type === "INSTANCE" || node.type === "GROUP" || node.type === "SECTION") {
    type = "frame";
  } else if (node.type === "RECTANGLE") {
    type = "shape";
    (style as any).shape = "rect";
  }

  // Children
  const children: Node[] = [];
  if (node.children) {
    for (const child of node.children) {
      const ir = figmaNodeToIR(child, box.x, box.y);
      if (ir) children.push(ir);
    }
  }

  return {
    id: uid(),
    type,
    name: node.name || type,
    style,
    text,
    children,
  };
}

/**
 * Parsea un JSON de Figma (API format) y devuelve un nodo raíz IR.
 * Devuelve { root, warnings } o lanza un error.
 */
export function parseFigmaJson(json: string): { root: Node; warnings: string[] } {
  const data = JSON.parse(json) as FigmaDocument;
  const warnings: string[] = [];

  if (!data.document) {
    throw new Error("No se encontró el campo 'document' en el JSON de Figma.");
  }

  // Buscar el primer page con contenido.
  const doc = data.document;
  let page: FigmaNode | undefined;
  if (doc.children && doc.children.length > 0) {
    // Preferir un page que tenga frames.
    for (const child of doc.children) {
      if (child.type === "CANVAS" && child.children && child.children.length > 0) {
        page = child;
        break;
      }
    }
    if (!page) page = doc.children[0];
  }

  if (!page || !page.children || page.children.length === 0) {
    throw new Error("El documento de Figma no contiene pantallas con contenido.");
  }

  // Tomar el primer frame como pantalla principal.
  const frame = page.children.find(
    (c) => c.type === "FRAME" || c.type === "COMPONENT" || c.type === "GROUP",
  ) ?? page.children[0];

  if (!frame.absoluteBoundingBox) {
    throw new Error("El frame de Figma no tiene dimensions (absoluteBoundingBox).");
  }

  const root = figmaNodeToIR(frame, frame.absoluteBoundingBox.x, frame.absoluteBoundingBox.y);
  if (!root) {
    throw new Error("No se pudo convertir el frame de Figma.");
  }

  root.name = frame.name || data.name || "Figma Import";

  // Importar frames adicionales como pantallas del prototipo.
  const additionalFrames = page.children.filter((c) => c !== frame);
  const screens: Node[] = [];
  for (const f of additionalFrames) {
    if (!f.absoluteBoundingBox) continue;
    const screen = figmaNodeToIR(f, f.absoluteBoundingBox.x, f.absoluteBoundingBox.y);
    if (screen) {
      screen.name = f.name || "Pantalla";
      screens.push(screen);
    }
  }

  if (screens.length > 0) {
    (root as any)._screens = screens;
  }

  if (additionalFrames.length > 1) {
    warnings.push(`${additionalFrames.length} pantallas adicionales detectadas.`);
  }

  return { root, warnings };
}

/** Comprueba si un archivo parece un JSON de Figma. */
export function isFigmaJson(text: string): boolean {
  try {
    const data = JSON.parse(text);
    return Boolean(data.document || data.nodes || data.components);
  } catch {
    return false;
  }
}
