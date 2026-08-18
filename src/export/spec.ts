/**
 * Spec sheet / modo Dev — Fase 7.
 *
 * Genera una ficha HTML autocontenida con las especificaciones exactas del
 * lienzo (o de un nodo y su subárbol): medidas, colores, tipografía, radios,
 * sombras, opacidad y trazos — el clásico entregable "modo Dev" de Figma.
 */
import type { CanvasDoc, Node } from "../core/ir";
import { resolveColor, resolveRadius } from "../core/tokens";
import { downloadBlob, projectFileName } from "./png";
import { escapeHtml } from "./html";

interface SpecEntry {
  name: string;
  rect: { x: number; y: number; width: number; height: number };
  details: string[];
  colors: string[];
}

export function exportSpecSheet(doc: CanvasDoc, nodeId?: string): string {
  const root = nodeId ? findNodeById(doc, nodeId) ?? doc.root : doc.root;
  const entries: SpecEntry[] = [];
  collect(root, doc, entries);

  const colors = new Map<string, string>();
  for (const e of entries) {
    for (const c of e.colors) {
      if (!colors.has(c)) colors.set(c, c);
    }
  }

  const rows = entries
    .map(
      (e) => `<tr>
        <td class="name">${escapeHtml(e.name)}</td>
        <td class="mono">${e.rect.x} · ${e.rect.y} · ${e.rect.width} × ${e.rect.height}</td>
        <td class="detail">${e.details.map(escapeHtml).join("<br/>")}</td>
      </tr>`,
    )
    .join("\n");

  const swatches = Array.from(colors.keys())
    .map(
      (c) =>
        `<span class="sw" title="${escapeHtml(c)}"><i style="background:${escapeHtml(c)}"></i>${escapeHtml(c)}</span>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spec — ${escapeHtml(root.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #0d0f17; color: #e8eaf2; padding: 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #9aa1b5; margin-bottom: 24px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; color: #9aa1b5; font-weight: 600; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.06em; padding: 8px 10px; border-bottom: 1px solid #262a3a; }
  td { padding: 8px 10px; border-bottom: 1px solid #1c2030; vertical-align: top; }
  .name { font-weight: 600; white-space: nowrap; }
  .detail { color: #c6cbe0; }
  .mono { font-family: ui-monospace, Menlo, monospace; color: #b9a6ff; white-space: nowrap; }
  .colors { margin: 20px 0 28px; display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border: 1px solid #262a3a; border-radius: 999px; font-size: 11px; color: #c6cbe0; font-family: ui-monospace, Menlo, monospace; }
  .sw i { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }
</style>
</head>
<body>
  <h1>${escapeHtml(root.name)}</h1>
  <div class="sub">Especificaciones de diseño · ${escapeHtml(doc.root.name)} · ${root.style.width}×${root.style.height}px · generado por Canvas</div>
  <div class="colors">${swatches || "<span class='sub'>Sin colores</span>"}</div>
  <table>
    <thead><tr><th>Elemento</th><th>Posición · tamaño</th><th>Detalle</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>
`;
}

export function exportSpecSheetFile(doc: CanvasDoc, nodeId?: string): void {
  const html = exportSpecSheet(doc, nodeId);
  const blob = new Blob([html], { type: "text/html" });
  downloadBlob(blob, `${projectFileName(doc)}-spec.html`);
}

function collect(node: Node, doc: CanvasDoc, out: SpecEntry[]): void {
  if (node.hidden) return;
  const colors: string[] = [];
  const details: string[] = [];

  const bg = node.style.backgroundColor ? resolveColor(doc.tokens, node.style.backgroundColor) : undefined;
  if (bg) {
    colors.push(bg);
    details.push(`Relleno ${bg}`);
  }
  if (node.style.gradient) {
    for (const s of node.style.gradient.stops) {
      const c = resolveColor(doc.tokens, s.color);
      if (c) colors.push(c);
    }
    details.push(`Gradiente ${node.style.gradient.type} ${node.style.gradient.angle}° (${node.style.gradient.stops.length} stops)`);
  }
  const color = node.style.color ? resolveColor(doc.tokens, node.style.color) : undefined;
  if (color) {
    colors.push(color);
    if (node.type === "text") details.push(`Texto ${color}`);
  }
  const radius = resolveRadius(doc.tokens, node.style.borderRadius);
  if (radius !== undefined) details.push(`Radio ${radius}px`);
  if (node.style.opacity !== undefined) details.push(`Opacidad ${Math.round(node.style.opacity * 100)}%`);
  if (node.style.boxShadow) {
    const c = resolveColor(doc.tokens, node.style.boxShadow.color);
    if (c) colors.push(c);
    details.push(
      `Sombra ${node.style.boxShadow.x}px ${node.style.boxShadow.y}px ${node.style.boxShadow.blur}px${node.style.boxShadow.inset ? " inset" : ""}`,
    );
  }
  if (node.style.stroke) details.push(`Trazo ${node.style.stroke.width}px ${node.style.stroke.color}`);
  if (node.type === "text") {
    const f = node.style;
    details.push(
      `${f.fontSize ?? 16}px · ${f.fontWeight ?? 400} · tracking ${f.letterSpacing ?? 0}px · línea ${f.lineHeight ?? 1.2} · ${f.textAlign ?? "left"}`,
    );
    if (f.fontFamily) details.push(f.fontFamily);
  }

  out.push({
    name: node.name,
    rect: { x: node.style.x, y: node.style.y, width: node.style.width, height: node.style.height },
    details,
    colors,
  });

  for (const child of node.children) collect(child, doc, out);
}

function findNodeById(doc: CanvasDoc, id: string): Node | null {
  const walk = (n: Node): Node | null => {
    if (n.id === id) return n;
    for (const c of n.children) {
      const hit = walk(c);
      if (hit) return hit;
    }
    return null;
  };
  return walk(doc.root);
}
