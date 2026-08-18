/**
 * pdf.ts — Export PDF de revisión (Fase 8).
 *
 * Genera un documento imprimible con el estado de la revisión: cabecera del
 * proyecto, lista de anotaciones (pins con estado ✓/pendiente) y una ficha de
 * especificaciones por pantalla (root + pantallas del prototipo).
 *
 * El PDF se produce sin dependencias: el documento se abre en una ventana de
 * impresión con CSS de @page y el usuario elige "Guardar como PDF" (igual en
 * navegador y en el webview de Tauri). Si el popup está bloqueado, se descarga
 * el mismo documento como .html autocontenido.
 */
import type { Annotation, CanvasDoc } from "../core/ir";
import { downloadBlob, projectFileName } from "./png";
import { escapeHtml } from "./html";
import { collectSpecEntries } from "./spec";

function screenName(doc: CanvasDoc, screenId: string): string {
  if (screenId === doc.root.id) return doc.root.name;
  return doc.screens?.find((s) => s.id === screenId)?.name ?? "Pantalla";
}

function nodeName(doc: CanvasDoc, nodeId: string | undefined): string {
  if (!nodeId) return "";
  const walk = (n: { id: string; name: string; children: unknown[] }): string | null => {
    if (n.id === nodeId) return n.name;
    for (const c of n.children as { id: string; name: string; children: unknown[] }[]) {
      const hit = walk(c);
      if (hit) return hit;
    }
    return null;
  };
  return walk(doc.root) ?? "";
}

function annotationRows(doc: CanvasDoc): string {
  const anns: Annotation[] = doc.annotations ?? [];
  if (anns.length === 0) {
    return `<tr><td colspan="5" class="empty">Sin anotaciones — la revisión está limpia ✨</td></tr>`;
  }
  return anns
    .map((a, i) => {
      const target = nodeName(doc, a.nodeId);
      return `<tr class="${a.resolved ? "resolved" : ""}">
        <td class="pin">${i + 1}</td>
        <td>${escapeHtml(screenName(doc, a.screenId))}</td>
        <td class="note">${escapeHtml(a.text || "—")}${target ? ` <span class="target">→ ${escapeHtml(target)}</span>` : ""}</td>
        <td class="pos">${a.x}, ${a.y}</td>
        <td class="status">${a.resolved ? "✓ resuelta" : "● pendiente"}</td>
      </tr>`;
    })
    .join("\n");
}

function specSection(doc: CanvasDoc, node: { id: string; name: string; style: { width: number; height: number } }): string {
  const { entries } = collectSpecEntries(doc, node.id);
  const colors = new Map<string, string>();
  for (const e of entries) {
    for (const c of e.colors) if (!colors.has(c)) colors.set(c, c);
  }
  const swatches = Array.from(colors.keys())
    .map(
      (c) =>
        `<span class="sw" title="${escapeHtml(c)}"><i style="background:${escapeHtml(c)}"></i>${escapeHtml(c)}</span>`,
    )
    .join("");
  const rows = entries
    .map(
      (e) => `<tr>
        <td class="name">${escapeHtml(e.name)}</td>
        <td class="mono">${e.rect.x} · ${e.rect.y} · ${e.rect.width} × ${e.rect.height}</td>
        <td class="detail">${e.details.map(escapeHtml).join("<br/>")}</td>
      </tr>`,
    )
    .join("\n");
  return `<section class="page">
    <h2>${escapeHtml(node.name)}</h2>
    <div class="sub">${node.style.width} × ${node.style.height}px</div>
    <div class="colors">${swatches || "<span class='dim'>Sin colores</span>"}</div>
    <table>
      <thead><tr><th>Elemento</th><th>Posición · tamaño</th><th>Detalle</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

export function buildReviewHtml(doc: CanvasDoc): string {
  const anns: Annotation[] = doc.annotations ?? [];
  const open = anns.filter((a) => !a.resolved).length;
  const date = new Date().toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });

  const screens = [doc.root, ...(doc.screens ?? [])].map((s) => specSection(doc, s)).join("\n");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Revisión — ${escapeHtml(doc.root.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #0d0f17; color: #e8eaf2; padding: 32px 40px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .meta { color: #9aa1b5; font-size: 13px; margin-bottom: 6px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11.5px; margin-top: 8px; }
  .badge.open { background: rgba(255, 140, 90, 0.14); color: #ffb28a; border: 1px solid rgba(255, 140, 90, 0.35); }
  .badge.done { background: rgba(80, 200, 120, 0.14); color: #8ee8ae; border: 1px solid rgba(80, 200, 120, 0.35); }
  h2 { font-size: 17px; margin: 0 0 2px; }
  section.page { margin-top: 34px; page-break-before: auto; }
  section.page + section.page { border-top: 1px solid #232738; padding-top: 26px; margin-top: 26px; }
  .sub { color: #9aa1b5; font-size: 12.5px; }
  .dim { color: #9aa1b5; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 14px; }
  th { text-align: left; color: #9aa1b5; font-weight: 600; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.06em; padding: 8px 10px; border-bottom: 1px solid #262a3a; }
  td { padding: 8px 10px; border-bottom: 1px solid #1c2030; vertical-align: top; }
  tr.resolved td { opacity: 0.45; }
  .name { font-weight: 600; white-space: nowrap; }
  .detail { color: #c6cbe0; }
  .mono { font-family: ui-monospace, Menlo, monospace; color: #b9a6ff; white-space: nowrap; }
  .pin { font-family: ui-monospace, Menlo, monospace; font-weight: 700; color: #ff9dbd; }
  .note { min-width: 260px; }
  .target { color: #9aa1b5; font-size: 11.5px; }
  .status { white-space: nowrap; }
  tr.resolved .status { color: #8ee8ae; }
  tr:not(.resolved) .status { color: #ffb28a; }
  .colors { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .sw { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border: 1px solid #262a3a; border-radius: 999px; font-size: 11px; color: #c6cbe0; font-family: ui-monospace, Menlo, monospace; }
  .sw i { width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }
  .empty { color: #9aa1b5; text-align: center; padding: 18px; }
  footer { margin-top: 40px; color: #6a7090; font-size: 11px; text-align: center; }
  @media print {
    body { background: #fff; color: #111; padding: 0; }
    h1, h2 { color: #111; }
    .meta, .sub, .dim, .detail, .status, .target, .empty, footer { color: #444; }
    table { color: #111; }
    th { color: #666; border-bottom-color: #bbb; }
    td { border-bottom-color: #e2e2e2; }
    .sw { border-color: #d5d5d5; color: #333; }
    section.page + section.page { border-top-color: #d5d5d5; }
    .badge.open { background: #fdeee4; color: #a34a12; border-color: #f0c7a8; }
    .badge.done { background: #e8f7ee; color: #1f7a41; border-color: #b5e4c6; }
    tr.resolved .status { color: #1f7a41; }
    tr:not(.resolved) .status { color: #a34a12; }
    .pin { color: #d64f8a; }
    .mono { color: #5b3fd4; }
    tr { page-break-inside: avoid; }
  }
  @page { margin: 16mm; }
</style>
</head>
<body>
  <h1>Revisión de diseño — ${escapeHtml(doc.root.name)}</h1>
  <div class="meta">${escapeHtml(date)} · ${escapeHtml(doc.root.name)} (${doc.root.style.width}×${doc.root.style.height}px) · ${anns.length} anotaciones · generado por Canvas</div>
  <span class="badge ${open > 0 ? "open" : "done"}">${open > 0 ? `${open} pendiente${open > 1 ? "s" : ""} de resolver` : "Revisión resuelta ✓"}</span>

  <section class="page">
    <h2>Anotaciones</h2>
    <table>
      <thead><tr><th>Pin</th><th>Pantalla</th><th>Nota</th><th>Posición</th><th>Estado</th></tr></thead>
      <tbody>${annotationRows(doc)}</tbody>
    </table>
  </section>

  ${screens}
  <footer>Exportado por Canvas — editor visual offline · ${escapeHtml(projectFileName(doc))}</footer>
</body>
</html>
`;
}

/**
 * Abre el documento de revisión en una ventana de impresión (Guardar como PDF)
 * o, si el popup está bloqueado, descarga el .html autocontenido.
 */
export function exportReviewPdf(doc: CanvasDoc): void {
  const html = buildReviewHtml(doc);
  const w = window.open("", "_blank");
  if (!w) {
    downloadBlob(new Blob([html], { type: "text/html" }), `${projectFileName(doc)}-revision.html`);
    return;
  }
  w.document.write(html);
  w.document.close();
  // Espera al render (imágenes/fuentes no hay: es texto puro) y lanza el diálogo.
  w.focus();
  w.print();
}

/** Descarga el documento de revisión como .html autocontenido. */
export function exportReviewHtml(doc: CanvasDoc): void {
  const html = buildReviewHtml(doc);
  downloadBlob(new Blob([html], { type: "text/html" }), `${projectFileName(doc)}-revision.html`);
}
