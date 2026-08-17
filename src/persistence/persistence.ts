/**
 * Persistencia — autosave con debounce (3s) + recuperación ante cierres.
 *
 * En navegador el autosave vive en localStorage; en la app de escritorio
 * (Tauri) el mismo autosave local se puede volcar a disco vía comandos Rust
 * (ver src-tauri/src/lib.rs). La abstracción `platform` mantiene el editor
 * agnóstico del entorno.
 */
import type { CanvasDoc } from "../core/ir";
import { migrate } from "../core/ir";
import { useStore as useStoreRef } from "../state/store";

const AUTOSAVE_KEY = "canvas.project.autosave";
const FIRST_RUN_KEY = "canvas.ui.seen";
const THEME_KEY = "canvas.ui.theme";

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------

/** Suscribe cambios del documento y guarda con debounce de 3s. Devuelve unsubscribe. */
export function subscribeAutosave(): () => void {
  let prev = useStoreRef.getState().doc;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return useStoreRef.subscribe((s) => {
    if (s.doc === prev) return;
    prev = s.doc;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(s.doc));
      } catch {
        // Cuota llena: el proyecto sigue en memoria; avisar es mejor que fallar.
        useStoreRef.getState().showToast("No se pudo guardar el autosave (almacenamiento lleno)");
      }
    }, 3000);
  });
}

/** Restaura el autosave si existe (migrando el JSON a la versión actual). */
export function loadAutosave(): CanvasDoc | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

// ---------------------------------------------------------------------------
// Preferencias de UI
// ---------------------------------------------------------------------------

export function hasSeenWelcome(): boolean {
  return localStorage.getItem(FIRST_RUN_KEY) === "1";
}

export function markWelcomeSeen(): void {
  localStorage.setItem(FIRST_RUN_KEY, "1");
}

export function loadTheme(): "dark" | "light" {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function saveTheme(theme: "dark" | "light"): void {
  localStorage.setItem(THEME_KEY, theme);
}

// ---------------------------------------------------------------------------
// Plataforma — Tauri (desktop) vs navegador
// ---------------------------------------------------------------------------

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Guarda el proyecto a través de la plataforma activa.
 * Tauri → comando Rust `save_project`; navegador → descarga del .canvas.
 */
export async function saveProjectViaPlatform(doc: CanvasDoc, name: string): Promise<void> {
  const { saveProjectFile } = await import("../export/project");
  if (isTauri()) {
    // El ZIP se genera igual en ambos entornos; en Tauri lo escribe Rust.
    const { generateProjectZip } = await import("../export/project");
    const blob = await generateProjectZip(doc);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { invoke } = await import("./tauriBridge");
    await invoke("save_project", { projectName: name, contents: Array.from(bytes) });
  } else {
    await saveProjectFile(doc);
  }
}

