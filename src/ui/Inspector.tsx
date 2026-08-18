/**
 * Inspector — el panel derecho. Regla de UI: NUNCA muestra jerga técnica.
 * El usuario ve sliders, pickers e iconos; el flexbox queda detrás.
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AlignLeft, AlignCenter, AlignRight, Eye, EyeOff } from "lucide-react";
import { useStore } from "../state/store";
import { findNode } from "../core/tree";
import { FRAME_PRESETS } from "../core/defaults";
import { resolveColor } from "../core/tokens";
import type { LayoutGrid, Node, Typography } from "../core/ir";

export function Inspector() {
  const selection = useStore((s) => s.selection);
  const doc = useStore((s) => s.doc);
  const node = selection.length === 1 ? findNode(doc.root, selection[0]) : null;

  return (
    <aside className="panel inspector">
      <div className="panel-title">Inspector</div>
      <div className="panel-body">
        {!node ? (
          <div className="inspector-empty">
            <p>Selecciona un elemento del lienzo o de la lista de capas para editarlo.</p>
            <p className="dim">Consejo: doble clic sobre un nodo abre su color.</p>
          </div>
        ) : (
          <NodeInspector node={node} />
        )}
      </div>
    </aside>
  );
}

const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion",
];

const FONT_FAMILIES = [
  "Inter, system-ui, sans-serif",
  "system-ui, sans-serif",
  "Arial, sans-serif",
  "Helvetica Neue, sans-serif",
  "Georgia, serif",
  "'Courier New', monospace",
  "Impact, sans-serif",
];

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function NodeInspector({ node }: { node: Node }) {
  const focusColorPicker = useStore((s) => s.focusColorPicker);
  const setFocusColorPicker = useStore((s) => s.setFocusColorPicker);
  const colorRef = useRef<HTMLInputElement>(null);
  const st = () => useStore.getState();

  // Doble clic en nodo → abrir el color picker de su relleno (Figma).
  useEffect(() => {
    if (focusColorPicker === node.id) {
      colorRef.current?.click();
      setFocusColorPicker(null);
    }
  }, [focusColorPicker, node.id, setFocusColorPicker]);

  const patch = (recipe: (n: Node) => void) => {
    st().apply((d) => {
      const n = findNode(d.root, node.id);
      if (n) recipe(n);
    });
  };

  const setStyle = (partial: Partial<Node["style"]>) =>
    patch((n) => {
      n.style = { ...n.style, ...partial };
    });

  const s = node.style;

  return (
    <div className="inspector-node">
      <div className="inspector-head">
        <input
          className="node-name-input"
          value={node.name}
          spellCheck={false}
          onChange={(e) => st().setNodeName(node.id, e.target.value)}
        />
        <button
          className="icon-btn"
          title={node.hidden ? "Mostrar" : "Ocultar"}
          onClick={() => st().toggleHidden(node.id)}
        >
          {node.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      <Section title="Posición y tamaño">
        <div className="field-grid">
          <Num label="X" value={Math.round(s.x)} onCommit={(v) => setStyle({ x: v })} />
          <Num label="Y" value={Math.round(s.y)} onCommit={(v) => setStyle({ y: v })} />
          <Num label="W" value={Math.round(s.width)} onCommit={(v) => setStyle({ width: Math.max(1, v) })} />
          <Num label="H" value={Math.round(s.height)} onCommit={(v) => setStyle({ height: Math.max(1, v) })} />
        </div>
      </Section>

      <Section title="Apariencia">
        <ColorField
          label="Relleno"
          value={s.backgroundColor}
          inputRef={colorRef}
          onCommit={(v) => setStyle({ backgroundColor: v })}
        />
        <SliderField
          label="Opacidad"
          value={Math.round((s.opacity ?? 1) * 100)}
          onCommit={(v) => setStyle({ opacity: v / 100 })}
        />
        <div className="field">
          <span className="field-label">Esquinas</span>
          <RadiusChips value={s.borderRadius} onPick={(ref) => setStyle({ borderRadius: ref })} />
          <input
            type="number"
            className="text-input"
            value={typeof s.borderRadius === "number" ? s.borderRadius : ""}
            placeholder={typeof s.borderRadius === "string" ? s.borderRadius : "0"}
            onChange={(e) => {
              const v = Number(e.target.value);
              setStyle({ borderRadius: Number.isNaN(v) ? undefined : v });
            }}
          />
        </div>
        <ShadowEditor shadow={s.boxShadow} onChange={(shadow) => setStyle({ boxShadow: shadow })} />
        <div className="field">
          <span className="field-label">Mezcla</span>
          <select
            className="text-input"
            value={s.blendMode ?? "normal"}
            onChange={(e) => setStyle({ blendMode: e.target.value === "normal" ? undefined : e.target.value })}
          >
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {node.type === "text" && (
        <Section title="Texto">
          <TypographyStyleSelect
            onApply={(typo) =>
              setStyle({
                fontFamily: typo.fontFamily,
                fontWeight: typo.fontWeight,
                fontSize: typo.fontSize,
                letterSpacing: typo.letterSpacing,
                lineHeight: typo.lineHeight,
                textAlign: typo.textAlign,
                textTransform: typo.textTransform,
              })
            }
          />
          <textarea
            className="text-area"
            rows={3}
            value={node.text ?? ""}
            placeholder="Escribe aquí…"
            onChange={(e) => patch((n) => (n.text = e.target.value))}
          />
          <div className="field">
            <span className="field-label">Fuente</span>
            <select
              className="text-input"
              value={s.fontFamily ?? FONT_FAMILIES[0]}
              onChange={(e) => setStyle({ fontFamily: e.target.value })}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f.split(",")[0].replace(/['"]/g, "")}
                </option>
              ))}
            </select>
          </div>
          <ColorField label="Color" value={s.color} onCommit={(v) => setStyle({ color: v })} field="color" />
          <div className="field-grid">
            <Num label="Tamaño" value={s.fontSize ?? 16} onCommit={(v) => setStyle({ fontSize: v })} />
            <div className="field">
              <span className="field-label">Peso</span>
              <select
                className="text-input"
                value={s.fontWeight ?? 400}
                onChange={(e) => setStyle({ fontWeight: Number(e.target.value) })}
              >
                {WEIGHTS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <Num label="Tracking" value={s.letterSpacing ?? 0} onCommit={(v) => setStyle({ letterSpacing: v })} />
            <Num label="Línea" value={s.lineHeight ?? 1.2} step={0.1} onCommit={(v) => setStyle({ lineHeight: v })} />
          </div>
          <div className="field">
            <span className="field-label">Alineación</span>
            <div className="align-row">
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                ] as const
              ).map(([align, Icon]) => (
                <button
                  key={align}
                  className={`icon-btn${s.textAlign === align || (!s.textAlign && align === "left") ? " is-active" : ""}`}
                  title={`Alinear ${align}`}
                  onClick={() => setStyle({ textAlign: align })}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {node.type === "frame" && (
        <Section title="Pantalla">
          <div className="field">
            <span className="field-label">Redimensionar a</span>
            <select
              className="text-input"
              value=""
              onChange={(e) => {
                const preset = FRAME_PRESETS.find((p) => p.id === e.target.value);
                if (!preset) return;
                setStyle({ width: preset.width, height: preset.height });
              }}
            >
              <option value="" disabled>
                Elegir preset…
              </option>
              {FRAME_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {p.width}×{p.height}
                </option>
              ))}
            </select>
          </div>
          {node.safeArea ? (
            <div className="safe-info">
              <span className="safe-chip safe-action">{Math.round(node.safeArea.action * 100)}% action</span>
              <span className="safe-chip safe-title">{Math.round(node.safeArea.title * 100)}% title</span>
              <button className="mini-btn" onClick={() => patch((n) => (n.safeArea = undefined))}>
                Quitar
              </button>
            </div>
          ) : (
            <button
              className="mini-btn"
              onClick={() => patch((n) => (n.safeArea = { title: 0.05, action: 0.1 }))}
            >
              + Área segura TV 5/10%
            </button>
          )}
          <div className="safe-hint dim">
            {node.guides ? `${node.guides.vertical.length}V · ${node.guides.horizontal.length}H guías` : "Sin guías"}
          </div>
          <LayoutGridEditor node={node} patch={patch} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      <div className="section-body">{children}</div>
    </div>
  );
}

/** Campo numérico con steppers; commitea al Enter/blur. */
function Num({
  label,
  value,
  onCommit,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text);
    if (!Number.isNaN(v)) onCommit(Math.round(v * 100) / 100);
    setText(String(value));
  };
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="num-wrap">
        <input
          className="num-input"
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
        <div className="steppers">
          <button tabIndex={-1} onClick={() => onCommit(Math.round((value + step) * 100) / 100)}>
            ▲
          </button>
          <button tabIndex={-1} onClick={() => onCommit(Math.round((value - step) * 100) / 100)}>
            ▼
          </button>
        </div>
      </div>
    </label>
  );
}

function SliderField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  return (
    <div className="field">
      <span className="field-label">
        {label} <span className="mono dim">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onCommit(Number(e.target.value))}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onCommit,
  inputRef,
  field = "backgroundColor",
}: {
  label: string;
  value: string | undefined;
  onCommit: (v: string | undefined) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  field?: "backgroundColor" | "color";
}) {
  const [text, setText] = useState(value ?? "");
  const tokens = useStore((s) => s.doc.tokens);
  const resolved = resolveColor(tokens, value);
  const isHex = resolved?.startsWith("#");
  const isToken = value?.startsWith("$") ?? false;
  const saveAsToken = () => {
    if (isToken) {
      useStore.getState().showToast("Este color ya es un token");
      return;
    }
    const raw = (value ?? text).trim();
    if (!raw) return;
    useStore.getState().saveColorAsToken(raw, field);
  };
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="color-row">
        <span className="swatch" style={{ background: resolved ?? "transparent" }}>
          <input
            ref={inputRef}
            type="color"
            value={isHex ? resolved : "#000000"}
            onChange={(e) => onCommit(e.target.value)}
          />
        </span>
        <input
          className="text-input mono"
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text.trim()) onCommit(text.trim());
            else setText(value ?? "");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      <ColorTokenChips current={value} onPick={onCommit} />
      <button className="mini-btn token-save-btn" onClick={saveAsToken}>
        + Guardar como token
      </button>
    </div>
  );
}

/** Chips de tokens de color: un clic aplica "$nombre" (Fase 2). */
function ColorTokenChips({
  current,
  onPick,
}: {
  current: string | undefined;
  onPick: (ref: string) => void;
}) {
  const colors = useStore((s) => s.doc.tokens.colors);
  const tokens = useStore((s) => s.doc.tokens);
  const entries = Object.entries(colors);
  if (entries.length === 0) return null;
  return (
    <div className="token-chips">
      {entries.map(([name, raw]) => {
        const ref = `$${name}`;
        const resolved = resolveColor(tokens, raw) ?? raw;
        return (
          <button
            key={name}
            className={`token-chip${current === ref ? " is-active" : ""}`}
            title={`${ref} · ${raw}`}
            onClick={() => onPick(ref)}
          >
            <span className="token-chip-swatch" style={{ background: resolved }} />
            <span className="token-chip-name">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Chips de tokens de radio: un clic aplica "$nombre". */
function RadiusChips({ value, onPick }: { value: number | string | undefined; onPick: (ref: string) => void }) {
  const radii = useStore((s) => s.doc.tokens.radii);
  const entries = Object.entries(radii);
  if (entries.length === 0) return null;
  return (
    <div className="token-chips">
      {entries.map(([name, val]) => {
        const ref = `$${name}`;
        return (
          <button
            key={name}
            className={`token-chip${value === ref ? " is-active" : ""}`}
            title={`${ref} · ${val}px`}
            onClick={() => onPick(ref)}
          >
            <span className="token-chip-name">{name}</span>
            <span className="token-chip-value dim">{val}px</span>
          </button>
        );
      })}
    </div>
  );
}

/** Selector de estilos de texto reutilizables (tokens de tipografía). */
function TypographyStyleSelect({ onApply }: { onApply: (t: Typography) => void }) {
  const typographies = useStore((s) => s.doc.tokens.typography);
  const entries = Object.entries(typographies);
  if (entries.length === 0) return null;
  return (
    <div className="field">
      <span className="field-label">Estilo de texto</span>
      <select
        className="text-input"
        value=""
        onChange={(e) => {
          const typo = typographies[e.target.value];
          if (typo) onApply(typo);
        }}
      >
        <option value="" disabled>
          Aplicar estilo…
        </option>
        {entries.map(([name, typo]) => (
          <option key={name} value={name}>
            {name} · {typo.fontSize ?? 16}px / {typo.fontWeight ?? 400}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Cuadrícula de layout del frame (columnas/filas con margin y gutter). */
function LayoutGridEditor({ node, patch }: { node: Node; patch: (recipe: (n: Node) => void) => void }) {
  const g: LayoutGrid = node.layoutGrid ?? { enabled: false, columns: 12, rows: 0, gutter: 24, margin: 48 };
  const setGrid = (partial: Partial<LayoutGrid>) =>
    patch((n) => {
      n.layoutGrid = { enabled: true, columns: 12, rows: 0, gutter: 24, margin: 48, ...n.layoutGrid, ...partial };
    });
  return (
    <div className="grid-editor">
      <div className="shadow-head">
        <span className="field-label">Cuadrícula de layout</span>
        <input
          type="checkbox"
          checked={g.enabled}
          onChange={(e) => setGrid({ enabled: e.target.checked })}
        />
      </div>
      {g.enabled && (
        <div className="field-grid">
          <Num label="Columnas" value={g.columns} onCommit={(v) => setGrid({ columns: Math.max(0, Math.round(v)) })} />
          <Num label="Filas" value={g.rows} onCommit={(v) => setGrid({ rows: Math.max(0, Math.round(v)) })} />
          <Num label="Gutter" value={g.gutter} onCommit={(v) => setGrid({ gutter: Math.max(0, Math.round(v)) })} />
          <Num label="Margen" value={g.margin} onCommit={(v) => setGrid({ margin: Math.max(0, Math.round(v)) })} />
        </div>
      )}
    </div>
  );
}

function ShadowEditor({
  shadow,
  onChange,
}: {
  shadow: { color: string; x: number; y: number; blur: number; spread?: number; inset?: boolean } | undefined;
  onChange: (s: { color: string; x: number; y: number; blur: number; spread?: number; inset?: boolean } | undefined) => void;
}) {
  const [enabled, setEnabled] = useState(Boolean(shadow));
  const cur = shadow ?? { color: "rgba(0,0,0,0.35)", x: 0, y: 8, blur: 24 };
  return (
    <div className="field">
      <div className="shadow-head">
        <span className="field-label">Sombra</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            onChange(e.target.checked ? cur : undefined);
          }}
        />
      </div>
      {enabled && (
        <div className="field-grid">
          <Num label="X" value={cur.x} onCommit={(v) => onChange({ ...cur, x: v })} />
          <Num label="Y" value={cur.y} onCommit={(v) => onChange({ ...cur, y: v })} />
          <Num label="Desenfoque" value={cur.blur} onCommit={(v) => onChange({ ...cur, blur: v })} />
          <ColorField label="Color" value={cur.color} onCommit={(v) => onChange({ ...cur, color: v ?? cur.color })} />
        </div>
      )}
    </div>
  );
}

