/**
 * PlatformSelector — Selector de plataforma para ver y editar overrides
 * por plataforma (mobile, console, PC, web).
 */
import { useStore } from "../state/store";
import type { PlatformKey } from "../core/ir";

const PLATFORMS: Array<{ key: PlatformKey; icon: string; label: string }> = [
  { key: "mobile", icon: "📱", label: "Mobile" },
  { key: "console", icon: "🎮", label: "Console" },
  { key: "pc", icon: "🖥️", label: "PC" },
  { key: "web", icon: "🌐", label: "Web" },
];

export function PlatformSelector() {
  const activePlatform = useStore((s) => s.doc.activePlatform);

  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {PLATFORMS.map(({ key, icon, label }) => (
        <button
          key={key}
          onClick={() => {
            useStore.setState((state) => ({
              doc: { ...state.doc, activePlatform: state.doc.activePlatform === key ? undefined : key },
            }));
          }}
          title={`${label} overrides${activePlatform === key ? " (activo)" : ""}`}
          style={{
            padding: "2px 6px",
            fontSize: 12,
            background: activePlatform === key ? "var(--accent)" : "transparent",
            color: activePlatform === key ? "#fff" : "var(--text-dim)",
            border: activePlatform === key ? "1px solid var(--accent)" : "1px solid transparent",
            borderRadius: 4,
            cursor: "pointer",
            lineHeight: 1.4,
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
