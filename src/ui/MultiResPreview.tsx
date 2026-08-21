/**
 * MultiResPreview — Muestra la pantalla del diseño en múltiples resoluciones
 * simultáneamente, estilo game UI designer.
 *
 * Resoluciones predefinidas: 720p, 1080p, 4K, Ultrawide, iPhone, Android, Web.
 * El usuario puede añadir resoluciones personalizadas.
 */
import { useStore } from "../state/store";
import type { ResolutionPreset, PlatformKey } from "../core/ir";

const DEFAULT_PRESETS: ResolutionPreset[] = [
  { name: "720p", width: 1280, height: 720, platform: "pc" },
  { name: "1080p", width: 1920, height: 1080, platform: "pc" },
  { name: "4K", width: 3840, height: 2160, platform: "pc" },
  { name: "Ultrawide", width: 3440, height: 1440, platform: "pc" },
  { name: "iPhone 14", width: 1170, height: 2532, platform: "mobile" },
  { name: "Android", width: 1080, height: 2400, platform: "mobile" },
  { name: "Web (1200)", width: 1200, height: 800, platform: "web" },
];

const PLATFORM_ICONS: Record<PlatformKey, string> = {
  mobile: "📱",
  console: "🎮",
  pc: "🖥️",
  web: "🌐",
};

export function MultiResPreview() {
  const doc = useStore((s) => s.doc);
  const root = doc.root;
  const presets = doc.resolutionPresets ?? DEFAULT_PRESETS;

  return (
    <div style={{ padding: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 11, textTransform: "uppercase" as const, color: "var(--text-dim)" }}>
        Multi-Res Preview
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {presets.map((preset, i) => {
          const scale = Math.min(140 / preset.width, 100 / preset.height);
          const previewW = preset.width * scale;
          const previewH = preset.height * scale;
          const isMatch = root.style.width === preset.width && root.style.height === preset.height;

          return (
            <div
              key={i}
              style={{
                border: isMatch ? "2px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: 4,
                padding: 4,
                background: "var(--bg-card)",
                cursor: "pointer",
                position: "relative",
              }}
              onClick={() => {
                // Resize the root to this preset
                useStore.getState().apply((d) => {
                  d.root.style.width = preset.width;
                  d.root.style.height = preset.height;
                });
                useStore.getState().fitTo({ x: 0, y: 0, width: preset.width, height: preset.height });
              }}
              title={`Clic para rediseñar en ${preset.width}×${preset.height}`}
            >
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>
                {PLATFORM_ICONS[preset.platform]} {preset.name}
              </div>
              <div
                style={{
                  width: previewW,
                  height: previewH,
                  background: root.style.backgroundColor ?? "#1a1c26",
                  borderRadius: 2,
                  margin: "0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: "var(--text-dim)",
                }}
              >
                {preset.width}×{preset.height}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
