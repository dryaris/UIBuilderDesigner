/**
 * Formato de proyecto ".canvas" — un ZIP con:
 *   project.json      → el IR completo (versionado, migrable)
 *   assets/           → binarios referenciados por hash SHA-256 (Fase 2+)
 *   thumb.png         → miniatura (Fase 2+, cuando exista renderer offscreen)
 *   annotations.json  → anotaciones de review (Fase 7, ya con su slot)
 */
import JSZip from "jszip";
import type { CanvasDoc } from "../core/ir";
import { CURRENT_VERSION, migrate } from "../core/ir";

export async function generateProjectZip(doc: CanvasDoc): Promise<Blob> {
  const zip = new JSZip();
  zip.file("project.json", JSON.stringify({ ...doc, version: CURRENT_VERSION }, null, 2));
  zip.file("assets/", null);
  zip.file("annotations.json", JSON.stringify({ annotations: [] }, null, 2));
  return zip.generateAsync({ type: "blob" });
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function saveProjectFile(doc: CanvasDoc): Promise<void> {
  const name = (doc.root.name || "proyecto").replace(/[^\w\- ]+/g, "").trim() || "proyecto";
  const blob = await generateProjectZip(doc);
  download(blob, `${name}.canvas`);
}

/** Abre el selector de archivos y devuelve el documento migrado. */
export function openProjectFile(): Promise<CanvasDoc> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".canvas,application/zip,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No se seleccionó ningún archivo"));
        return;
      }
      try {
        resolve(await parseProjectFile(file));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("No se pudo abrir el proyecto"));
      }
    };
    input.click();
  });
}

export async function parseProjectFile(file: File): Promise<CanvasDoc> {
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file("project.json");
  if (!entry) throw new Error("El archivo no contiene project.json");
  const text = await entry.async("string");
  return migrate(JSON.parse(text));
}
