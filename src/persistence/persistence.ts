/**
 * Persistencia — autosave con debounce (3s) + recuperación ante cierres.
 *
 * El autosave vive en localStorage. La app también soporta File System Access API
 * (Chrome/Edge) para guardar directamente en disco, y fallback a descarga.
 */
import type { CanvasDoc } from "../core/ir";
import { migrate } from "../core/ir";
import { useStore as useStoreRef } from "../state/store";

const AUTOSAVE_KEY = "canvas.project.autosave";
const FIRST_RUN_KEY = "canvas.ui.seen";
const THEME_KEY = "canvas.ui.theme";
const TOUR_KEY = "canvas.ui.tour.seen";

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
// Onboarding — tour de primera vez
// ---------------------------------------------------------------------------

export function hasSeenTour(): boolean {
  return localStorage.getItem(TOUR_KEY) === "1";
}

export function markTourSeen(): void {
  localStorage.setItem(TOUR_KEY, "1");
}

// ---------------------------------------------------------------------------
// Plataforma — Web pura
// ---------------------------------------------------------------------------

/**
 * Guarda el proyecto. Web: descarga del .canvas o File System Access API.
 */
export async function saveProjectViaPlatform(doc: CanvasDoc, _name: string): Promise<void> {
  const { saveProjectFile } = await import("../export/project");
  await saveProjectFile(doc);
}

