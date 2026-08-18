/**
 * PrototypePanel — pestaña "Prototipo" (Fase 7).
 *
 * Pantallas del prototipo (la actual es la que se edita en el lienzo) y
 * conexiones: un nodo → pantalla, con transición (duración + curva de los
 * tokens de easing). En modo Preview, pulsar un nodo conectado navega con
 * fundido; el exportador HTML reproduce el mismo flujo.
 */
import { useState } from "react";
import { Plus, Copy, Trash2, MonitorPlay, Link2 } from "lucide-react";
import { useStore } from "../state/store";
import { findNode } from "../core/tree";

export function PrototypePanel() {
  const doc = useStore((s) => s.doc);
  const screens = useStore((s) => s.screens);
  const connections = useStore((s) => s.connections);
  const previewMode = useStore((s) => s.previewMode);
  const setPreviewMode = useStore((s) => s.setPreviewMode);
  const st = () => useStore.getState();
  const [targetScreen, setTargetScreen] = useState("");
  const [connDuration, setConnDuration] = useState("200");
  const [connEasing, setConnEasing] = useState("$standard");

  const screenName = (id: string) => {
    if (id === doc.root.id) return doc.root.name;
    return screens.find((s) => s.id === id)?.name ?? "—";
  };
  const screenOptions = [doc.root, ...screens];

  const addConn = () => {
    const sel = st().selection;
    if (sel.length !== 1) {
      st().showToast("Selecciona un nodo del lienzo para conectarlo");
      return;
    }
    const dur = Math.max(0, Number(connDuration) || 0);
    st().addConnection(sel[0], targetScreen || doc.root.id, {
      durationMs: Math.round(dur),
      easing: connEasing || "$standard",
    });
    st().showToast("Conexión de prototipo añadida");
  };

  return (
    <aside className="panel inspector prototype-panel">
      <div className="panel-title">Prototipo</div>
      <div className="panel-body">
        <div className="design-section">
          <div className="design-section-head">
            <span className="design-section-title">
              <MonitorPlay size={12} /> Pantallas
            </span>
            <div className="design-section-actions">
              <button className="mini-btn" title="Duplicar pantalla actual" onClick={() => st().duplicateScreen()}>
                <Copy size={12} />
              </button>
              <button className="mini-btn" title="Nueva pantalla" onClick={() => st().addScreen()}>
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="design-section-body">
            <button
              className={`screen-row is-active`}
              onClick={() => {
                st().switchScreen(doc.root.id);
              }}
            >
              <span className="screen-dot" />
              <span className="screen-name">{doc.root.name}</span>
              <span className="screen-size mono">
                {doc.root.style.width}×{doc.root.style.height}
              </span>
            </button>
            {screens.map((sc) => (
              <div key={sc.id} className="screen-row-wrap">
                <button className="screen-row" onClick={() => st().switchScreen(sc.id)}>
                  <span className="screen-dot" />
                  <span className="screen-name">{sc.name}</span>
                  <span className="screen-size mono">
                    {sc.style.width}×{sc.style.height}
                  </span>
                </button>
                <button
                  className="icon-btn screen-del"
                  title="Eliminar pantalla"
                  onClick={() => st().deleteScreen(sc.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <p className="design-hint dim">
              La pantalla que editas en el lienzo es la <b>actual</b>; al hacer clic en otra se carga en el editor
              (undo incluido). En preview, pulsa un nodo conectado para navegar.
            </p>
          </div>
        </div>

        <div className="design-section">
          <div className="design-section-head">
            <span className="design-section-title">
              <Link2 size={12} /> Conexiones
            </span>
          </div>
          <div className="design-section-body">
            <div className="conn-form">
              <select
                className="text-input"
                value={targetScreen}
                onChange={(e) => setTargetScreen(e.target.value)}
              >
                <option value="" disabled>
                  Destino…
                </option>
                {screenOptions.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
              <div className="conn-form-row">
                <input
                  className="text-input mono conn-dur"
                  type="number"
                  min={0}
                  step={50}
                  value={connDuration}
                  onChange={(e) => setConnDuration(e.target.value)}
                  title="Duración de la transición (ms)"
                />
                <select
                  className="text-input"
                  value={connEasing}
                  onChange={(e) => setConnEasing(e.target.value)}
                  title="Curva de la transición"
                >
                  {Object.keys(doc.tokens.easings).map((name) => (
                    <option key={name} value={`$${name}`}>
                      {name}
                    </option>
                  ))}
                </select>
                <button className="mini-btn" onClick={addConn} title="Conectar la selección actual">
                  <Link2 size={12} /> Conectar
                </button>
              </div>
            </div>

            {connections.length === 0 && (
              <div className="design-empty dim">
                Selecciona un botón o elemento en el lienzo, elige la pantalla destino y pulsa
                “Conectar”. También funciona en el exportador HTML.
              </div>
            )}
            {connections.map((c) => {
              const node = findNode(doc.root, c.fromNodeId);
              return (
                <div key={c.id} className="conn-row">
                  <div className="conn-main">
                    <span className="conn-from" title="Nodo que dispara la navegación">
                      {node?.name ?? "—"}
                    </span>
                    <span className="conn-arrow">→</span>
                    <span className="conn-to">{screenName(c.toScreenId)}</span>
                  </div>
                  <input
                    className="text-input mono conn-dur"
                    type="number"
                    min={0}
                    step={50}
                    value={c.transition?.durationMs ?? 200}
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0);
                      st().updateConnection(c.id, {
                        transition: {
                          durationMs: Math.round(v),
                          easing: c.transition?.easing ?? "$standard",
                        },
                      });
                    }}
                    title="Duración (ms)"
                  />
                  <select
                    className="text-input conn-easing"
                    value={c.transition?.easing ?? "$standard"}
                    title="Curva"
                    onChange={(e) =>
                      st().updateConnection(c.id, {
                        transition: {
                          durationMs: c.transition?.durationMs ?? 200,
                          easing: e.target.value,
                        },
                      })
                    }
                  >
                    {Object.keys(doc.tokens.easings).map((name) => (
                      <option key={name} value={`$${name}`}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="icon-btn screen-del"
                    title="Eliminar conexión"
                    onClick={() => st().removeConnection(c.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button
          className={`mini-btn preview-toggle${previewMode ? " is-active" : ""}`}
          onClick={() => {
            if (previewMode) {
              setPreviewMode(false);
              st().setPlaying(false);
            } else {
              setPreviewMode(true);
            }
          }}
        >
          <MonitorPlay size={12} />
          {previewMode ? "Salir del preview (Esc)" : "Probar el prototipo"}
        </button>
      </div>
    </aside>
  );
}
