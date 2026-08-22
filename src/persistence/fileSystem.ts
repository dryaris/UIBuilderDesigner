/**
 * File System — Persistencia real usando File System Access API (navegador)
 * y fallback a descarga. Permite guardar/cargar archivos .canvas directamente.
 */
import type { CanvasDoc } from "../core/ir";

/** Guarda el proyecto como archivo .canvas usando File System Access API. */
export async function saveToFile(doc: CanvasDoc): Promise<boolean> {
  // Intentar File System Access API (Chrome/Edge)
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${doc.root.name || "proyecto"}.canvas`,
        types: [{ description: "UI Forger Project", accept: { "application/json": [".canvas"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(doc, null, 2));
      await writable.close();
      return true;
    } catch (err: any) {
      if (err.name === "AbortError") return false; // User cancelled
      console.warn("File System Access failed, falling back to download:", err);
    }
  }
  // Fallback: download
  return downloadCanvasFile(doc);
}

/** Abre un archivo .canvas desde el sistema de archivos. */
export async function loadFromFile(): Promise<CanvasDoc | null> {
  // Intentar File System Access API
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: "UI Forger Project", accept: { "application/json": [".canvas"] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      return JSON.parse(text) as CanvasDoc;
    } catch (err: any) {
      if (err.name === "AbortError") return null;
      console.warn("File System Access failed:", err);
    }
  }
  // Fallback: input file
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".canvas,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const text = await file.text();
      try {
        resolve(JSON.parse(text) as CanvasDoc);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

/** Descarga el proyecto como archivo .canvas. */
export function downloadCanvasFile(doc: CanvasDoc): boolean {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.root.name || "proyecto"}.canvas`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
