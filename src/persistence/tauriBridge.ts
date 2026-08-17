/**
 * Puente a Tauri — invoca comandos IPC de Rust cuando la app corre en el
 * escritorio. En navegador devuelve un error claro (los comandos no existen),
 * pero el editor nunca depende de esto para funcionar.
 */

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export async function invoke(cmd: string, args: Record<string, unknown>): Promise<unknown> {
  const w = window as TauriWindow;
  const core = (w as unknown as Record<string, unknown>)?.__TAURI_INTERNALS__ as
    | { invoke?: (c: string, a?: unknown) => Promise<unknown> }
    | undefined;
  if (!core?.invoke) {
    throw new Error(`Comando Tauri "${cmd}" no disponible en navegador.`);
  }
  return core.invoke(cmd, args);
}
