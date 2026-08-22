/**
 * Panel de logs de errores — muestra errores, warnings y logs de GPU.
 * Se abre desde la barra de estado o con el botón de logs.
 */
import { useEffect, useState } from "react";
import {
  getLogs,
  onLogsChange,
  clearLogs,
  exportLogs,
  getLogSummary,
  type LogEntry,
  type LogLevel,
} from "../core/logger";

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: "#f87171",
  gpu: "#ff6b9d",
  warn: "#facc15",
  info: "#8A93B8",
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  error: "❌ Error",
  gpu: "🔴 GPU",
  warn: "⚠️ Warn",
  info: "ℹ️ Info",
};

export function LogPanel({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | "all">("all");

  useEffect(() => {
    setLogs(getLogs());
    return onLogsChange(setLogs);
  }, []);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);
  const summary = getLogSummary();

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          📋 Logs de errores
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="log-btn" onClick={exportLogs} title="Exportar logs">
            📥 Exportar
          </button>
          <button
            className="log-btn"
            onClick={() => {
              clearLogs();
              setLogs([]);
            }}
            title="Limpiar logs"
          >
            🗑️ Limpiar
          </button>
          <button className="log-btn" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>
      </div>

      <div className="log-panel-filters">
        <button
          className={`log-filter ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Todos ({summary.total})
        </button>
        {(["error", "gpu", "warn", "info"] as const).map((lvl) => {
          const count =
            lvl === "error"
              ? summary.errors
              : lvl === "gpu"
                ? summary.gpu
                : lvl === "warn"
                  ? summary.warnings
                  : summary.info;
          if (count === 0) return null;
          return (
            <button
              key={lvl}
              className={`log-filter ${filter === lvl ? "active" : ""}`}
              style={filter === lvl ? { borderColor: LEVEL_COLORS[lvl] } : undefined}
              onClick={() => setFilter(lvl)}
            >
              {LEVEL_LABELS[lvl]} ({count})
            </button>
          );
        })}
      </div>

      <div className="log-panel-list">
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
            No hay logs {filter !== "all" ? `de tipo "${filter}"` : ""}
          </div>
        )}
        {filtered
          .slice()
          .reverse()
          .map((entry) => (
            <div key={entry.id} className="log-entry">
              <div className="log-entry-header">
                <span
                  className="log-level-badge"
                  style={{ background: LEVEL_COLORS[entry.level] + "22", color: LEVEL_COLORS[entry.level] }}
                >
                  {LEVEL_LABELS[entry.level]}
                </span>
                <span className="log-source">{entry.source}</span>
                <span className="log-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                  {entry.count && entry.count > 1 ? ` (×${entry.count})` : ""}
                </span>
              </div>
              <div className="log-message">{entry.message}</div>
              {entry.system?.gpu && (
                <div className="log-system">
                  GPU: {entry.system.gpu} · {entry.system.screenSize} · DPR {entry.system.devicePixelRatio}
                  {entry.system.memoryGB ? ` · ${entry.system.memoryGB}GB RAM` : ""}
                </div>
              )}
              {entry.stack && (
                <details className="log-stack">
                  <summary>Stack trace</summary>
                  <pre>{entry.stack}</pre>
                </details>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

/**
 * Botón flotante de logs que muestra el conteo de errores.
 */
export function LogButton({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const s = getLogSummary();
      setCount(s.errors + s.gpu);
    };
    update();
    return onLogsChange(update);
  }, []);

  if (count === 0) return null;

  return (
    <button
      className="log-floating-btn"
      onClick={onClick}
      title={`${count} error(es) registrado(s) — click para ver logs`}
    >
      <span className="log-floating-icon">⚠️</span>
      <span className="log-floating-count">{count}</span>
    </button>
  );
}
