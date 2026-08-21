/**
 * GamePanel — Panel de funciones específicas de UI de juegos:
 * - Variables de juego (para preview interactivo y visibilidad condicional)
 * - Audio cues (sonidos asociados a interacciones)
 * - Configuración de 9-slice
 * - Localization keys
 */
import { useStore } from "../state/store";
import type { ConditionalRule, GameVariable } from "../core/ir";
import { findNode } from "../core/tree";

export function GamePanel() {
  const selection = useStore((s) => s.selection);
  const doc = useStore((s) => s.doc);
  const selectedNode = selection.length === 1
    ? findNode(doc.root, selection[0])
    : null;

  return (
    <div className="game-panel" style={{ padding: 8, fontSize: 12, color: "var(--text)" }}>
      <Section title="🎮 Variables de juego">
        <GameVariablesEditor />
      </Section>

      {selectedNode && (
        <>
          <Section title="👁 Visibilidad condicional">
            <ConditionalVisibilityEditor nodeId={selectedNode.id} />
          </Section>

          <Section title="🔊 Audio Cues">
            <AudioCueEditor nodeId={selectedNode.id} />
          </Section>

          <Section title="📐 9-Slice Scaling">
            <NineSliceEditor nodeId={selectedNode.id} />
          </Section>

          <Section title="🌍 Localización">
            <LocalizationEditor nodeId={selectedNode.id} />
          </Section>

          <Section title="🎯 Pivote y Ancla">
            <PivotAnchorEditor nodeId={selectedNode.id} />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, textTransform: "uppercase" as const, color: "var(--text-dim)" }}>{title}</div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Game Variables Editor
// ---------------------------------------------------------------------------

function GameVariablesEditor() {
  const doc = useStore((s) => s.doc);
  const variables = doc.gameVariables ?? [];

  const addVariable = () => {
    useStore.setState((state) => ({
      doc: {
        ...state.doc,
        gameVariables: [
          ...(state.doc.gameVariables ?? []),
          { name: `var_${variables.length + 1}`, type: "boolean" as const, defaultValue: true, currentValue: true },
        ],
      },
    }));
  };

  const updateVariable = (idx: number, patch: Partial<GameVariable>) => {
    useStore.setState((state) => {
      const vars = [...(state.doc.gameVariables ?? [])];
      vars[idx] = { ...vars[idx], ...patch };
      return { doc: { ...state.doc, gameVariables: vars } };
    });
  };

  const removeVariable = (idx: number) => {
    useStore.setState((state) => {
      const vars = [...(state.doc.gameVariables ?? [])];
      vars.splice(idx, 1);
      return { doc: { ...state.doc, gameVariables: vars } };
    });
  };

  return (
    <div>
      {variables.map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
          <input
            style={{ flex: 1, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
            value={v.name}
            onChange={(e) => updateVariable(i, { name: e.target.value })}
            placeholder="nombre"
          />
          <select
            style={{ padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
            value={v.type}
            onChange={(e) => updateVariable(i, { type: e.target.value as GameVariable["type"] })}
          >
            <option value="boolean">bool</option>
            <option value="number">num</option>
            <option value="string">str</option>
          </select>
          {v.type === "boolean" ? (
            <input
              type="checkbox"
              checked={Boolean(v.currentValue ?? v.defaultValue)}
              onChange={(e) => updateVariable(i, { currentValue: e.target.checked })}
            />
          ) : v.type === "number" ? (
            <input
              type="number"
              style={{ width: 50, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
              value={Number(v.currentValue ?? v.defaultValue)}
              onChange={(e) => updateVariable(i, { currentValue: Number(e.target.value) })}
            />
          ) : (
            <input
              style={{ width: 60, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
              value={String(v.currentValue ?? v.defaultValue)}
              onChange={(e) => updateVariable(i, { currentValue: e.target.value })}
            />
          )}
          <button onClick={() => removeVariable(i)} style={{ background: "none", border: "none", color: "#f44", cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
      ))}
      <button onClick={addVariable} style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg-button)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer" }}>
        + Añadir variable
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conditional Visibility Editor
// ---------------------------------------------------------------------------

function ConditionalVisibilityEditor({ nodeId }: { nodeId: string }) {
  const node = useStore((s) => findNode(s.doc.root, nodeId));
  if (!node) return null;

  const rules = node.conditionalVisibility ?? [];

  const addRule = () => {
    useStore.getState().apply((d) => {
      // findNode already imported at top
      const n = findNode(d.root, nodeId);
      if (n) {
        if (!n.conditionalVisibility) n.conditionalVisibility = [];
        n.conditionalVisibility.push({ variable: "", operator: "truthy" });
      }
    });
  };

  const updateRule = (idx: number, patch: Partial<ConditionalRule>) => {
    useStore.getState().apply((d) => {
      // findNode already imported at top
      const n = findNode(d.root, nodeId);
      if (n?.conditionalVisibility?.[idx]) {
        Object.assign(n.conditionalVisibility[idx], patch);
      }
    });
  };

  const removeRule = (idx: number) => {
    useStore.getState().apply((d) => {
      // findNode already imported at top
      const n = findNode(d.root, nodeId);
      if (n?.conditionalVisibility) n.conditionalVisibility.splice(idx, 1);
    });
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4 }}>El nodo solo se muestra si TODAS las condiciones se cumplen.</div>
      {rules.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
          <input
            style={{ flex: 1, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
            value={r.variable}
            onChange={(e) => updateRule(i, { variable: e.target.value })}
            placeholder="variable"
          />
          <select
            style={{ padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
            value={r.operator}
            onChange={(e) => updateRule(i, { operator: e.target.value as ConditionalRule["operator"] })}
          >
            <option value="truthy">truthy</option>
            <option value="falsy">falsy</option>
            <option value="==">==</option>
            <option value="!=">!=</option>
            <option value=">">{'>'}</option>
            <option value="<">{'<'}</option>
            <option value=">=">{'>='}</option>
            <option value="<=">{'<='}</option>
          </select>
          {r.operator !== "truthy" && r.operator !== "falsy" && (
            <input
              style={{ width: 60, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
              value={String(r.value ?? "")}
              onChange={(e) => updateRule(i, { value: e.target.value })}
              placeholder="valor"
            />
          )}
          <button onClick={() => removeRule(i)} style={{ background: "none", border: "none", color: "#f44", cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
      ))}
      <button onClick={addRule} style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg-button)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer" }}>
        + Añadir condición
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audio Cue Editor
// ---------------------------------------------------------------------------

function AudioCueEditor({ nodeId }: { nodeId: string }) {
  const node = useStore((s) => findNode(s.doc.root, nodeId));
  if (!node) return null;

  const cues = node.audioCue ?? {};
  const events: Array<{ key: string; label: string }> = [
    { key: "onHover", label: "Hover" },
    { key: "onPress", label: "Press" },
    { key: "onRelease", label: "Release" },
    { key: "onOpen", label: "Open" },
    { key: "onClose", label: "Close" },
  ];

  const updateCue = (key: string, value: string) => {
    useStore.getState().apply((d) => {
      // findNode already imported at top
      const n = findNode(d.root, nodeId);
      if (n) {
        if (!n.audioCue) n.audioCue = {};
        if (n.audioCue) (n.audioCue as Record<string, string>)[key] = value;
      }
    });
  };

  return (
    <div>
      {events.map(({ key, label }) => (
        <div key={key} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
          <span style={{ width: 60, fontSize: 11, color: "var(--text-dim)" }}>{label}</span>
          <input
            style={{ flex: 1, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
            value={(cues as Record<string, string>)[key] ?? ""}
            onChange={(e) => updateCue(key, e.target.value)}
            placeholder="nombre del sonido"
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nine-Slice Editor
// ---------------------------------------------------------------------------

function NineSliceEditor({ nodeId }: { nodeId: string }) {
  const node = useStore((s) => {
    // findNode already imported at top
    return findNode(s.doc.root, nodeId);
  });
  if (!node) return null;

  const ns = node.nineSlice ?? { enabled: false, left: 16, right: 16, top: 16, bottom: 16 };

  const update = (patch: Record<string, unknown>) => {
    useStore.getState().apply((d) => {
      // findNode already imported at top
      const n = findNode(d.root, nodeId);
      if (n) n.nineSlice = { ...ns, ...patch } as NonNullable<import("../core/ir").Node["nineSlice"]>;
    });
  };

  return (
    <div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, cursor: "pointer" }}>
        <input type="checkbox" checked={ns.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        <span style={{ fontSize: 11 }}>Activar 9-Slice</span>
      </label>
      {ns.enabled && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <div key={side} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--text-dim)", width: 20 }}>{side[0].toUpperCase()}</span>
              <input
                type="number"
                style={{ width: 50, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
                value={ns[side]}
                onChange={(e) => update({ [side]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Localization Editor
// ---------------------------------------------------------------------------

function LocalizationEditor({ nodeId }: { nodeId: string }) {
  const node = useStore((s) => {
    // findNode already imported at top
    return findNode(s.doc.root, nodeId);
  });
  if (!node || node.type !== "text") return <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Selecciona un nodo de texto.</div>;

  return (
    <div>
      <input
        style={{ width: "100%", padding: "4px 6px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
        value={node.localizationKey ?? ""}
        onChange={(e) => {
          useStore.getState().apply((d) => {
            // findNode already imported at top
            const n = findNode(d.root, nodeId);
            if (n) n.localizationKey = e.target.value || undefined;
          });
        }}
        placeholder="ui.button_label (clave de localización)"
      />
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>El texto se exportará como esta clave. En preview se muestra como {"{clave}"}.</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pivot & Anchor Editor
// ---------------------------------------------------------------------------

function PivotAnchorEditor({ nodeId }: { nodeId: string }) {
  const node = useStore((s) => {
    // findNode already imported at top
    return findNode(s.doc.root, nodeId);
  });
  if (!node) return null;

  const pivot = node.pivot ?? { x: 0.5, y: 0.5 };
  const anchor = node.anchor ?? { horizontal: "left" as const, vertical: "top" as const };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>Pivote</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="number" step="0.1" min="0" max="1"
              style={{ width: 40, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
              value={pivot.x}
              onChange={(e) => {
                useStore.getState().apply((d) => {
                  // findNode already imported at top
                  const n = findNode(d.root, nodeId);
                  if (n) n.pivot = { ...pivot, x: Number(e.target.value) };
                });
              }}
            />
            <input
              type="number" step="0.1" min="0" max="1"
              style={{ width: 40, padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
              value={pivot.y}
              onChange={(e) => {
                useStore.getState().apply((d) => {
                  // findNode already imported at top
                  const n = findNode(d.root, nodeId);
                  if (n) n.pivot = { ...pivot, y: Number(e.target.value) };
                });
              }}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>Ancla H</div>
          <select
            style={{ padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
            value={anchor.horizontal}
            onChange={(e) => {
              useStore.getState().apply((d) => {
                // findNode already imported at top
                const n = findNode(d.root, nodeId);
                if (n) n.anchor = { ...anchor, horizontal: e.target.value as typeof anchor.horizontal };
              });
            }}
          >
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
            <option value="stretch">Estirar</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>Ancla V</div>
          <select
            style={{ padding: "2px 4px", fontSize: 11, background: "var(--bg-input)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3 }}
            value={anchor.vertical}
            onChange={(e) => {
              useStore.getState().apply((d) => {
                // findNode already imported at top
                const n = findNode(d.root, nodeId);
                if (n) n.anchor = { ...anchor, vertical: e.target.value as typeof anchor.vertical };
              });
            }}
          >
            <option value="top">Arriba</option>
            <option value="center">Centro</option>
            <option value="bottom">Abajo</option>
            <option value="stretch">Estirar</option>
          </select>
        </div>
      </div>
    </div>
  );
}
