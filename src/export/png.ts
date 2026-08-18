/**
 * Export de assets — PNG 1x/2x/3x y paquete completo (HTML + PNGs).
 *
 * Renderiza la pantalla a imagen con un DOM fuera de pantalla envuelto en un
 * SVG <foreignObject>: el mismo motor que el canvas del editor y que el
 * exportador HTML, así que el resultado es WYSIWYG exacto (gradientes,
 * sombras, blend modes y texto incluidos).
 */
import JSZip from "jszip";
import type { CanvasDoc, Node, Tokens } from "../core/ir";
import { exportHtml, styleToCss, escapeHtml } from "./html";

/**
 * Renderiza la pantalla (frame raíz) como PNG al `scale` indicado.
 * scale 1 = tamaño de diseño; 2 y 3 = assets 1x/2x/3x.
 */
export async function exportPng(doc: CanvasDoc, scale: number): Promise<Blob> {
  const root = doc.root;
  const w = Math.max(1, root.style.width);
  const h = Math.max(1, root.style.height);

  const inner = `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden">${nodeHtml(root, doc.tokens)}</div>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}" viewBox="0 0 ${w} ${h}">` +
    `<foreignObject width="${w}" height="${h}">${inner}</foreignObject></svg>`;

  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo de exportación");
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar el PNG"))), "image/png");
  });
}

function nodeHtml(node: Node, tokens: Tokens): string {
  if (node.hidden) return "";
  const css = styleToCss(node.style, tokens);
  const inner =
    node.type === "text"
      ? escapeHtml(node.text ?? "")
      : node.children.map((c) => nodeHtml(c, tokens)).join("");
  return `<div style="${css}">${inner}</div>`;
}

/** Descarga un blob con nombre de archivo (helper compartido con la UI). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Nombre de archivo sano a partir del nombre del proyecto. */
export function projectFileName(doc: CanvasDoc): string {
  return (doc.root.name || "proyecto").replace(/[^\w\- ]+/g, "").trim() || "proyecto";
}

/** Descarga un PNG del frame raíz a la escala indicada. */
export async function exportPngFile(doc: CanvasDoc, scale: number): Promise<void> {
  const blob = await exportPng(doc, scale);
  downloadBlob(blob, `${projectFileName(doc)}@${scale}x.png`);
}

/**
 * Paquete listo para publicar: index.html autocontenido + pantalla en
 * 1x/2x/3x, en un solo .zip.
 */
export async function exportBundle(doc: CanvasDoc): Promise<Blob> {
  const zip = new JSZip();
  zip.file("index.html", exportHtml(doc));
  const name = projectFileName(doc);
  for (const scale of [1, 2, 3]) {
    zip.file(`${name}@${scale}x.png`, await exportPng(doc, scale));
  }
  return zip.generateAsync({ type: "blob" });
}
