import { Tv, Smartphone, Monitor, Gamepad2, Crosshair, X } from "lucide-react";
import { useStore } from "../state/store";
import { FRAME_PRESETS, newDoc, type FramePreset } from "../core/defaults";
import { nodeRect } from "../core/tree";

const ICONS = { tv: Tv, smartphone: Smartphone, monitor: Monitor } as const;

export function NewProjectModal() {
  const open = useStore((s) => s.newProjectOpen);
  const setOpen = useStore((s) => s.setNewProjectOpen);

  if (!open) return null;

  const create = (kind: "game" | "hud" | "blank", preset?: FramePreset) => {
    const st = useStore.getState();
    const doc = newDoc(kind, preset);
    st.replaceDoc(doc);
    st.fitTo(nodeRect(doc.root));
    st.setNewProjectOpen(false);
    st.showToast(kind === "game" ? "Menú de juego listo 🎮" : kind === "hud" ? "HUD móvil listo 📱" : "Proyecto nuevo creado");
  };

  const groups = ["Game / TV", "Mobile", "Web"] as const;

  return (
    <div className="modal-overlay" onPointerDown={() => setOpen(false)}>
      <div className="modal" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Nuevo proyecto</h2>
            <p className="dim">Todo se guarda localmente en tu navegador. Sin cuenta, sin nube.</p>
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-section">
          <h3>
            <Gamepad2 size={15} /> Plantillas de juego
          </h3>
          <div className="starter-grid">
            <button className="starter-card" onClick={() => create("game")}>
              <span className="starter-icon" style={{ background: "linear-gradient(135deg,#7C5CFF,#FF6B9D)" }}>
                <Gamepad2 size={20} />
              </span>
              <span className="starter-name">Menú de juego</span>
              <span className="starter-desc">1080p · gradientes, glows y botones listos</span>
            </button>
            <button className="starter-card" onClick={() => create("hud")}>
              <span className="starter-icon" style={{ background: "linear-gradient(135deg,#3DDC97,#1B8CFF)" }}>
                <Crosshair size={20} />
              </span>
              <span className="starter-name">HUD móvil</span>
              <span className="starter-desc">393×844 · vida, score, minimapa y joystick</span>
            </button>
          </div>
        </div>

        <div className="modal-section">
          <h3>Pantallas en blanco</h3>
          {groups.map((group) => (
            <div key={group} className="preset-group">
              <span className="preset-group-label">{group}</span>
              <div className="preset-grid">
                {FRAME_PRESETS.filter((p) => p.category === group).map((p) => {
                  const Icon = ICONS[p.icon];
                  return (
                    <button key={p.id} className="preset-card" onClick={() => create("blank", p)}>
                      <Icon size={16} />
                      <span className="preset-label">{p.label}</span>
                      <span className="preset-dims">
                        {p.width}×{p.height}
                      </span>
                      {p.safeArea && <span className="preset-safe">safe 5/10%</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
