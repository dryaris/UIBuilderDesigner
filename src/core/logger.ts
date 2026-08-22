/**
 * Sistema de logging de errores de UI Forger.
 *
 * Captura: errores de React, WebGL context loss, errores de rendering,
 * unhandled promise rejections, errores de GPU, y errores personalizados.
 * Almacena en localStorage (últimas 200 entradas) con metadata del sistema.
 */

export type LogLevel = "error" | "warn" | "info" | "gpu";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  source: string;
  stack?: string;
  system?: SystemInfo;
  count?: number; // dedup: cuántas veces se repitió
}

export interface SystemInfo {
  userAgent: string;
  gpu?: string;
  gpuVendor?: string;
  screenSize: string;
  devicePixelRatio: number;
  memoryGB?: number;
  cores?: number;
  platform?: string;
  tauri?: boolean;
}

const STORAGE_KEY = "uiforger_logs";
const MAX_ENTRIES = 200;
const DEDUP_WINDOW_MS = 5000; // 5s: si el mismo msg aparece en 5s, se incrementa count

let _logs: LogEntry[] = [];
let _listeners: ((logs: LogEntry[]) => void)[] = [];
let _initialized = false;

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _logs = JSON.parse(raw);
  } catch {
    _logs = [];
  }
}

function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_logs.slice(-MAX_ENTRIES)));
  } catch {
    // localStorage lleno o no disponible
  }
}

function getSystemInfo(): SystemInfo {
  const info: SystemInfo = {
    userAgent: navigator.userAgent,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio,
    memoryGB: (navigator as any).deviceMemory,
    cores: navigator.hardwareConcurrency,
    platform: navigator.platform,
    tauri: !!(window as any).__TAURI__,
  };

  // Detectar GPU via WebGL
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (ctx) {
      const gl = ctx as WebGLRenderingContext;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        info.gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        info.gpuVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      } else {
        info.gpu = gl.getParameter(gl.RENDERER);
      }
    }
  } catch {
    // WebGL no disponible
  }

  return info;
}



// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Registra un log. Devuelve la entrada creada.
 */
export function log(
  level: LogLevel,
  message: string,
  source: string,
  stack?: string,
): LogEntry {
  if (!_initialized) {
    loadFromStorage();
    _initialized = true;
  }

  // Dedup: si el último entry tiene el mismo message y source dentro de DEDUP_WINDOW
  const last = _logs[_logs.length - 1];
  if (
    last &&
    last.message === message &&
    last.source === source &&
    Date.now() - last.timestamp < DEDUP_WINDOW_MS
  ) {
    last.count = (last.count || 1) + 1;
    saveToStorage();
    _notify();
    return last;
  }

  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    message: message.slice(0, 2000), // truncar mensajes enormes
    source,
    stack: stack?.slice(0, 3000),
    system: getSystemInfo(),
  };

  _logs.push(entry);
  if (_logs.length > MAX_ENTRIES) _logs = _logs.slice(-MAX_ENTRIES);
  saveToStorage();
  _notify();

  // Log a consola también (en dev)
  if (import.meta.env.DEV) {
    const style =
      level === "gpu"
        ? "color: #ff6b9d; font-weight: bold"
        : level === "error"
          ? "color: #f87171; font-weight: bold"
          : level === "warn"
            ? "color: #facc15"
            : "color: #8A93B8";
    console.log(`%c[UIForger ${level.toUpperCase()}] ${source}: ${message}`, style);
    if (stack) console.log(stack);
  }

  return entry;
}

/** Log de error rápido */
export function logError(message: string, source: string, stack?: string): LogEntry {
  return log("error", message, source, stack);
}

/** Log de GPU específico */
export function logGpu(message: string, source: string, stack?: string): LogEntry {
  return log("gpu", message, source, stack);
}

/** Log de warning */
export function logWarn(message: string, source: string): LogEntry {
  return log("warn", message, source);
}

/** Log informativo */
export function logInfo(message: string, source: string): LogEntry {
  return log("info", message, source);
}

// ---------------------------------------------------------------------------
// Suscriptores (para el panel de logs)
// ---------------------------------------------------------------------------

export function onLogsChange(fn: (logs: LogEntry[]) => void): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

function _notify(): void {
  for (const fn of _listeners) {
    try {
      fn([..._logs]);
    } catch {
      // listener error
    }
  }
}

// ---------------------------------------------------------------------------
// Obtener logs
// ---------------------------------------------------------------------------

export function getLogs(): LogEntry[] {
  if (!_initialized) {
    loadFromStorage();
    _initialized = true;
  }
  return [..._logs];
}

export function getLogsByLevel(level: LogLevel): LogEntry[] {
  return getLogs().filter((l) => l.level === level);
}

export function getGpuLogs(): LogEntry[] {
  return getLogs().filter((l) => l.level === "gpu");
}

export function getErrorCount(): number {
  return getLogs().filter((l) => l.level === "error" || l.level === "gpu").length;
}

export function getLogSummary(): {
  total: number;
  errors: number;
  gpu: number;
  warnings: number;
  info: number;
} {
  const logs = getLogs();
  return {
    total: logs.length,
    errors: logs.filter((l) => l.level === "error").length,
    gpu: logs.filter((l) => l.level === "gpu").length,
    warnings: logs.filter((l) => l.level === "warn").length,
    info: logs.filter((l) => l.level === "info").length,
  };
}

// ---------------------------------------------------------------------------
// Exportar logs como archivo
// ---------------------------------------------------------------------------

export function exportLogs(): void {
  const logs = getLogs();
  const summary = getLogSummary();
  const system = getSystemInfo();

  const report = {
    appVersion: "0.2.3",
    exportDate: new Date().toISOString(),
    summary,
    system,
    logs: logs.map((l) => ({
      time: new Date(l.timestamp).toISOString(),
      level: l.level,
      source: l.source,
      message: l.message,
      count: l.count,
      stack: l.stack,
      gpu: l.system?.gpu,
    })),
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `uiforger-logs-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Limpiar logs
// ---------------------------------------------------------------------------

export function clearLogs(): void {
  _logs = [];
  saveToStorage();
  _notify();
}

// ---------------------------------------------------------------------------
// Auto-init: instalar listeners globales de error
// ---------------------------------------------------------------------------

let _hooksInstalled = false;

export function installGlobalErrorHooks(): void {
  if (_hooksInstalled) return;
  _hooksInstalled = true;

  // 1. Window.onerror — errores JS no capturados
  window.addEventListener("error", (e: ErrorEvent) => {
    const msg = e.message || String(e.error || "unknown error");
    const source = e.filename || "window.onerror";
    logError(msg, source, e.error?.stack);
  });

  // 2. Unhandled promise rejections
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : JSON.stringify(reason);
    logError(`Unhandled Promise: ${msg}`, "unhandledrejection", reason?.stack);
  });

  // 3. WebGL context loss
  document.addEventListener("webglcontextlost", (e) => {
    logGpu(
      "WebGL context lost — GPU may have crashed or driver issue",
      "webgl-context-loss",
    );
    e.preventDefault(); // permitir restauración
  });

  document.addEventListener("webglcontextrestored", () => {
    logGpu("WebGL context restored", "webgl-context-restored");
  });

  // 4. Detectar GPU info al inicio
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (ctx) {
      const gl = ctx as WebGLRenderingContext;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const gpu = ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
      logInfo(`GPU detected: ${gpu}`, "gpu-detection");
    } else {
      logGpu("WebGL not available — rendering may fail", "gpu-detection");
    }
  } catch (err) {
    logGpu("GPU detection failed", "gpu-detection");
  }

  // 5. Performance observer paralong tasks (potential jank)
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 200) {
          logWarn(
            `Long task: ${Math.round(entry.duration)}ms`,
            "performance",
          );
        }
      }
    });
    po.observe({ type: "longtask", buffered: false });
  } catch {
    // PerformanceObserver not supported for longtask
  }
}
