/**
 * Project Folder — Gestiona la carpeta del proyecto en el sistema de archivos.
 * Usa la File System Access API (Chrome/Edge) para escribir archivos directamente
 * en la carpeta que el usuario elige. Si la API no está disponible, fallback a descarga.
 */
import type { CanvasDoc } from "../core/ir";

/** Handle de la carpeta del proyecto (no serializable, se pierde al recargar). */
let projectDirHandle: FileSystemDirectoryHandle | null = null;

/** Nombre de la carpeta (para mostrar en UI). */
let projectDirName: string | null = null;

/** Estado de listener para cambios. */
type Listener = (dirName: string | null) => void;
const listeners: Set<Listener> = new Set();

function notify() {
  for (const fn of listeners) fn(projectDirName);
}

/** Suscribirse a cambios de la carpeta del proyecto. */
export function onProjectFolderChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Obtener el nombre actual de la carpeta del proyecto. */
export function getProjectDirName(): string | null {
  return projectDirName;
}

/** Obtener el handle de la carpeta (para usar internamente). */
export function getProjectDirHandle(): FileSystemDirectoryHandle | null {
  return projectDirHandle;
}

/**
 * Seleccionar la carpeta del proyecto (Directory Picker API).
 * Crea la carpeta si no existe.
 */
export async function pickProjectFolder(): Promise<boolean> {
  if (!("showDirectoryPicker" in window)) {
    // Fallback: no hay API, usar descarga
    return false;
  }
  try {
    const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    projectDirHandle = handle;
    projectDirName = handle.name;
    notify();
    return true;
  } catch (err: any) {
    if (err.name === "AbortError") return false;
    console.warn("Directory picker failed:", err);
    return false;
  }
}

/**
 * Guardar un archivo en la carpeta del proyecto.
 * Crea subcarpetas si es necesario (ej: "exports/unity/").
 */
export async function saveToProjectFolder(
  path: string, // ej: "exports/unity/scene.uxml"
  content: string | Blob,
  _mimeType = "application/octet-stream",
): Promise<boolean> {
  const dirHandle = projectDirHandle;
  if (!dirHandle) return false;
  try {
    // Crear subcarpetas si es necesario
    const parts = path.split("/");
    let dir = dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    const fileName = parts[parts.length - 1];
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    if (typeof content === "string") {
      await writable.write(content);
    } else {
      await writable.write(content);
    }
    await writable.close();
    return true;
  } catch (err) {
    console.warn(`Failed to save ${path}:`, err);
    return false;
  }
}

/**
 * Guardar un ZIP en la carpeta del proyecto.
 */
export async function saveZipToProjectFolder(
  path: string, // ej: "exports/unity.zip"
  blob: Blob,
): Promise<boolean> {
  return saveToProjectFolder(path, blob, "application/zip");
}

/**
 * Guardar el proyecto (.canvas) en la carpeta del proyecto.
 */
export async function saveProjectToFolder(doc: CanvasDoc): Promise<boolean> {
  if (!projectDirHandle) return false;
  const name = doc.root.name || "proyecto";
  return saveToProjectFolder(
    `${name}.canvas`,
    JSON.stringify(doc, null, 2),
    "application/json",
  );
}

/**
 * Guardar HTML exportado en la carpeta del proyecto.
 */
export async function saveHtmlToFolder(doc: CanvasDoc, html: string): Promise<boolean> {
  if (!projectDirHandle) return false;
  const name = doc.root.name || "proyecto";
  return saveToProjectFolder(`exports/${name}.html`, html, "text/html");
}

/**
 * Guardar PNG en la carpeta del proyecto.
 */
export async function savePngToFolder(doc: CanvasDoc, blob: Blob, scale: number): Promise<boolean> {
  if (!projectDirHandle) return false;
  const name = doc.root.name || "proyecto";
  return saveToProjectFolder(`exports/${name}@${scale}x.png`, blob, "image/png");
}

/**
 * Guardar bundle (HTML + PNGs) en la carpeta del proyecto.
 */
export async function saveBundleToFolder(
  doc: CanvasDoc,
  zip: Blob,
): Promise<boolean> {
  if (!projectDirHandle) return false;
  const name = doc.root.name || "proyecto";
  return saveZipToProjectFolder(`exports/${name}-bundle.zip`, zip);
}

/**
 * Guardar export de engine en la carpeta del proyecto.
 */
export async function saveEngineExportToFolder(
  engine: string, // unity, godot, umg
  zip: Blob,
  docName: string,
): Promise<boolean> {
  if (!projectDirHandle) return false;
  return saveZipToProjectFolder(`exports/${engine}/${docName}-${engine}.zip`, zip);
}

/**
 * Guardar tokens en la carpeta del proyecto.
 */
export async function saveTokensToFolder(zip: Blob, docName: string): Promise<boolean> {
  if (!projectDirHandle) return false;
  return saveZipToProjectFolder(`exports/tokens/${docName}-tokens.zip`, zip);
}

/**
 * Guardar Lottie en la carpeta del proyecto.
 */
export async function saveLottieToFolder(json: string, docName: string): Promise<boolean> {
  if (!projectDirHandle) return false;
  return saveToProjectFolder(`exports/lottie/${docName}.json`, json, "application/json");
}

/**
 * Guardar spec sheet en la carpeta del proyecto.
 */
export async function saveSpecSheetToFolder(html: string, docName: string): Promise<boolean> {
  if (!projectDirHandle) return false;
  return saveToProjectFolder(`exports/spec/${docName}-spec.html`, html, "text/html");
}

/**
 * Guardar PDF de revisión en la carpeta del proyecto.
 */
export async function saveReviewPdfToFolder(html: string, docName: string): Promise<boolean> {
  if (!projectDirHandle) return false;
  return saveToProjectFolder(`exports/review/${docName}-review.html`, html, "text/html");
}
