/**
 * TimelinePanel — pestaña "Animar" del panel derecho (Fase 4).
 *
 * Modo Preview (máquina de estados en el lienzo) + líneas de tiempo con
 * keyframes: captura el estado actual de la selección en un instante,
 * elige la curva por tramo con los tokens de easing y reproduce con WAAPI.
 */
import { useState } from "react";
import { Play, Square, Plus, Trash2, Film } from "lucide-react";
import { useStore } from "../state/store";
import { findNode } from "../core/tree";

export function TimelinePanel() {
  const doc = useStore((s) => s.doc);
  const activeId = useStore((s) => s.activeTimelineId);
  const playing = useStore((s) => s.playing);
  const previewMode = useStore((s) => s.previewMode);
  const setPreviewMode = useStore((s) => s.setPreviewMode);
  const setPlaying = useStore((s) => s.setPlaying);
  const st = () => useStore.getState();
  const [sec, setSec] = useState("0");

  const tl = doc.timelines.find((t) => t.id === activeId) ?? null;
  const durationSec = (tl?.durationMs ?? 1000) / 1000;

  const togglePreview = () => {
    if (previewMode) {
      setPreviewMode(false);
      setPlaying(false);
    } else {
      setPreviewMode(true);
    }
  };

  const togglePlay = () => {
    if (!previewMode) setPreviewMode(true);
    setPlaying(!playing);
  };

  return (
    <aside className="panel inspector timeline-panel">
      <div className="panel-title">Animar</div>
      <div className="panel-body">
        <div className="design-section">
          <div className="design-section-head">
            <span className="design-section-title">
              <Film size={12} /> Modo preview
            </span>
          </div>
          <div className="design-section-body">
            <button
              className={`mini-btn preview-toggle${previewMode ? " is-active" : ""}`}
              onClick={togglePreview}
            >
              {previewMode ? <Square size={12} /> : <Play size={12} />}
              {previewMode ? "Salir del preview (Esc)" : "Probar en el lienzo"}
            </button>
            <p className="design-hint dim">
              En preview no se edita: pasa el cursor por los nodos para ver sus estados (hover/pulsado) y pulsa para
              presionar. Esc sale del modo.
            </p>
          </div>
        </div>

        <div className="design-section">
          <div className="design-section-head">
            <span className="design-section-title">Líneas de tiempo</span>
            <button
              className="mini-btn"
              title="Nueva línea de tiempo"
              onClick={() => st().addTimeline(`Animación ${doc.timelines.length + 1}`)}
            >
              <Plus size={12} />
            </button>
          </div>
          <div className="design-section-body">
            {doc.timelines.length === 0 && (
              <div className="design-empty dim">
                Crea una línea de tiempo, selecciona un elemento y captura keyframes en distintos instantes.
              </div>
            )}
            {doc.timelines.map((t) => (
              <div key={t.id} className="tl-row">
                <button
                  className={`tl-select${activeId === t.id ? " is-active" : ""}`}
                  onClick={() => st().setActiveTimelineId(activeId === t.id ? null : t.id)}
                >
                  {t.name}
                </button>
                <button
                  className="icon-btn tl-play"
                  title={playing && activeId === t.id ? "Pausar" : "Reproducir"}
                  onClick={togglePlay}
                >
                  {playing && activeId === t.id ? <Square size={12} /> : <Play size={12} />}
                </button>
                <button
                  className="icon-btn tl-del"
                  title="Eliminar línea de tiempo"
                  onClick={() => st().removeTimeline(t.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {tl && (
          <div className="design-section">
            <div className="design-section-head">
              <span className="design-section-title">{tl.name}</span>
            </div>
            <div className="design-section-body">
              <div className="tl-controls">
                <label className="field">
                  <span className="field-label">Duración (ms)</span>
                  <input
                    className="text-input mono"
                    type="number"
                    value={tl.durationMs}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v) && v > 0) st().updateTimeline(tl.id, { durationMs: Math.round(v) });
                    }}
                  />
                </label>
                <label className="field tl-loop">
                  <span className="field-label">Loop</span>
                  <input
                    type="checkbox"
                    checked={tl.loop}
                    onChange={(e) => st().updateTimeline(tl.id, { loop: e.target.checked })}
                  />
                </label>
              </div>

              <div className="tl-capture">
                <span className="field-label">Capturar keyframe de la selección en t=</span>
                <div className="tl-capture-row">
                  <input
                    className="text-input mono"
                    type="number"
                    step={0.1}
                    min={0}
                    max={durationSec}
                    value={sec}
                    onChange={(e) => setSec(e.target.value)}
                  />
                  <span className="dim">s / {durationSec.toFixed(1)}s</span>
                  <button
                    className="mini-btn"
                    onClick={() => {
                      const sel = st().selection;
                      if (sel.length === 0) {
                        st().showToast("Selecciona un elemento en el lienzo para capturar su frame");
                        return;
                      }
                      const t = (Number(sec) || 0) / durationSec;
                      st().captureKeyframe(tl.id, t);
                      st().showToast("Keyframe capturado");
                    }}
                  >
                    Capturar
                  </button>
                </div>
              </div>

              <div className="tl-keyframes">
                <span className="field-label">Keyframes ({tl.keyframes.length})</span>
                {tl.keyframes.length === 0 && (
                  <div className="design-empty dim">
                    Captura al menos 2 keyframes en tiempos distintos para animar.
                  </div>
                )}
                {tl.keyframes.map((kf, i) => {
                  const node = findNode(doc.root, kf.nodeId);
                  return (
                    <div key={i} className="kf-row">
                      <span className="kf-time mono">{(kf.t * durationSec).toFixed(2)}s</span>
                      <span className="kf-name" title={kf.nodeId}>
                        {node?.name ?? "—"}
                      </span>
                      <select
                        className="text-input kf-easing"
                        value={kf.easing ?? ""}
                        title="Curva del tramo"
                        onChange={(e) => st().setKeyframeEasing(tl.id, i, e.target.value || undefined)}
                      >
                        <option value="">curva…</option>
                        {Object.keys(doc.tokens.easings).map((name) => (
                          <option key={name} value={`$${name}`}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="icon-btn tl-del"
                        title="Eliminar keyframe"
                        onClick={() => st().removeKeyframe(tl.id, i)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {tl.keyframes.length >= 2 && (
                <button className="mini-btn preview-toggle" onClick={togglePlay}>
                  {playing && previewMode ? <Square size={12} /> : <Play size={12} />}
                  {playing && previewMode ? "Pausar" : "Reproducir en preview"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
