/**
 * Inspector — el panel derecho. Regla de UI: NUNCA muestra jerga técnica.
 * El usuario ve sliders, pickers e iconos; el flexbox queda detrás.
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  Pipette,
  Rows3,
  Columns3,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceBetween,
  AlignHorizontalSpaceAround,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  StretchVertical,
  StretchHorizontal,
  MoveDiagonal,
} from "lucide-react";
import { useStore } from "../state/store";
import { findNode } from "../core/tree";
import { FRAME_PRESETS } from "../core/defaults";
import { resolveColor } from "../core/tokens";
import { isFlexChild } from "../core/layout";
import { DEFAULT_CONSTRAINTS } from "../core/constraints";
import type { Constraints, LayoutGrid, Node, StateKey, Style, Typography } from "../core/ir";
import { parseColor, contrastRatio, wcagRating } from "../core/contrast";

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
  const rootId = useStore((s) => s.doc.root.id);
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
  // Hijos de un auto-layout: su posición la decide el layout (Figma).
  const inFlex = isFlexChild(st().doc.root, node);

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
          <Num label="X" value={Math.round(s.x)} disabled={inFlex} onCommit={(v) => setStyle({ x: v })} />
          <Num label="Y" value={Math.round(s.y)} disabled={inFlex} onCommit={(v) => setStyle({ y: v })} />
          <Num label="W" value={Math.round(s.width)} onCommit={(v) => setStyle({ width: Math.max(1, v) })} />
          <Num label="H" value={Math.round(s.height)} onCommit={(v) => setStyle({ height: Math.max(1, v) })} />
        </div>
      </Section>

      {node.type !== "text" && <AutoLayoutSection node={node} />}

      {node.id !== rootId && <ConstraintsSection node={node} inFlex={inFlex} />}

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

      <StatesSection node={node} />

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
          <ContrastBadge node={node} />
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
                // Redimensionar con constraints: los hijos responden al cambio.
                const st = useStore.getState();
                st.resizeFrame(node.id, {
                  x: node.style.x,
                  y: node.style.y,
                  width: preset.width,
                  height: preset.height,
                });
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

/**
 * Auto-layout (Fase 3): apilar/se distribuir hijos con flexbox real, sin
 * jerga técnica — el usuario ve dirección, espaciado, alineación y tamaño.
 */
function AutoLayoutSection({ node }: { node: Node }) {
  const st = useStore.getState;
  const s = node.style;
  const on = Boolean(s.flexDirection);

  const set = (partial: Partial<Style>) =>
    st().apply((d) => {
      const n = findNode(d.root, node.id);
      if (n) n.style = { ...n.style, ...partial };
    });

  const toggle = () => {
    if (on) {
      set({
        flexDirection: undefined,
        justifyContent: undefined,
        alignItems: undefined,
        gap: undefined,
        padding: undefined,
        wrap: undefined,
        sizing: undefined,
      });
    } else {
      set({
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: 8,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        sizing: { x: "fixed", y: "fixed" },
      });
    }
  };

  const pad = s.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const setPad = (k: keyof typeof pad) => (v: number) =>
    set({ padding: { ...pad, [k]: Math.max(0, v) } });

  return (
    <Section title="Auto-layout">
      <button
        className={`auto-toggle${on ? " is-on" : ""}`}
        onClick={toggle}
      >
        <span className="auto-toggle-track">
          <span className={`auto-toggle-knob${on ? " is-on" : ""}`} />
        </span>
        {on ? "Apilar y distribuir hijos" : "Activar: apila y distribuye los hijos automáticamente"}
      </button>

      {on && (
        <>
          <div className="field-label">Dirección</div>
          <div className="icon-seg">
            <button
              className={s.flexDirection === "row" ? "is-active" : ""}
              title="Horizontal: los hijos van en fila"
              onClick={() => set({ flexDirection: "row" })}
            >
              <Columns3 size={14} />
            </button>
            <button
              className={s.flexDirection === "column" ? "is-active" : ""}
              title="Vertical: los hijos van en columna"
              onClick={() => set({ flexDirection: "column" })}
            >
              <Rows3 size={14} />
            </button>
          </div>

          <SliderField label="Espaciado" value={s.gap ?? 0} onCommit={(v) => set({ gap: Math.max(0, Math.round(v)) })} />

          <div className="field-label">Alineación principal</div>
          <div className="icon-seg">
            <button
              className={(s.justifyContent ?? "flex-start") === "flex-start" ? "is-active" : ""}
              title="Al principio"
              onClick={() => set({ justifyContent: "flex-start" })}
            >
              <AlignStartHorizontal size={14} />
            </button>
            <button
              className={s.justifyContent === "center" ? "is-active" : ""}
              title="Centrado"
              onClick={() => set({ justifyContent: "center" })}
            >
              <AlignCenterHorizontal size={14} />
            </button>
            <button
              className={s.justifyContent === "flex-end" ? "is-active" : ""}
              title="Al final"
              onClick={() => set({ justifyContent: "flex-end" })}
            >
              <AlignEndHorizontal size={14} />
            </button>
            <button
              className={s.justifyContent === "space-between" ? "is-active" : ""}
              title="Repartir espacio entre hijos"
              onClick={() => set({ justifyContent: "space-between" })}
            >
              <AlignHorizontalSpaceBetween size={14} />
            </button>
            <button
              className={s.justifyContent === "space-around" ? "is-active" : ""}
              title="Repartir espacio alrededor"
              onClick={() => set({ justifyContent: "space-around" })}
            >
              <AlignHorizontalSpaceAround size={14} />
            </button>
          </div>

          <div className="field-label">Alineación cruzada</div>
          <div className="icon-seg">
            <button
              className={(s.alignItems ?? "flex-start") === "flex-start" ? "is-active" : ""}
              title="Arriba"
              onClick={() => set({ alignItems: "flex-start" })}
            >
              <AlignStartVertical size={14} />
            </button>
            <button
              className={s.alignItems === "center" ? "is-active" : ""}
              title="Centrado"
              onClick={() => set({ alignItems: "center" })}
            >
              <AlignCenterVertical size={14} />
            </button>
            <button
              className={s.alignItems === "flex-end" ? "is-active" : ""}
              title="Abajo"
              onClick={() => set({ alignItems: "flex-end" })}
            >
              <AlignEndVertical size={14} />
            </button>
            <button
              className={s.alignItems === "stretch" ? "is-active" : ""}
              title="Estirar al contenedor"
              onClick={() => set({ alignItems: "stretch" })}
            >
              <StretchVertical size={14} />
            </button>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={!!s.wrap}
              onChange={(e) => set({ wrap: e.target.checked || undefined })}
            />
            Envolver al rebosar
          </label>

          <div className="field-label">Relleno interior</div>
          <div className="field-grid">
            <Num label="Sup" value={pad.top} onCommit={setPad("top")} />
            <Num label="Der" value={pad.right} onCommit={setPad("right")} />
            <Num label="Inf" value={pad.bottom} onCommit={setPad("bottom")} />
            <Num label="Izq" value={pad.left} onCommit={setPad("left")} />
          </div>

          <div className="field-label">Tamaño</div>
          <div className="sizing-rows">
            <div className="sizing-row">
              <span className="sizing-name">Ancho</span>
              <div className="seg">
                <button
                  className={(s.sizing?.x ?? "fixed") === "fixed" && s.widthPct === undefined ? "is-active" : ""}
                  onClick={() => set({ sizing: { x: "fixed", y: s.sizing?.y ?? "fixed" }, widthPct: undefined })}
                >
                  Fijo
                </button>
                <button
                  className={s.sizing?.x === "hug" ? "is-active" : ""}
                  title="Se ajusta al contenido"
                  onClick={() => set({ sizing: { x: "hug", y: s.sizing?.y ?? "fixed" }, widthPct: undefined })}
                >
                  Contenido
                </button>
                <button
                  className={s.widthPct !== undefined ? "is-active" : ""}
                  title="Porcentaje del padre"
                  onClick={() => set({ widthPct: s.widthPct ?? 100, sizing: { x: "fixed", y: s.sizing?.y ?? "fixed" } })}
                >
                  %
                </button>
              </div>
            </div>
            {s.widthPct !== undefined && (
              <div className="sizing-row">
                <span className="sizing-name">%</span>
                <input
                  className="num-input"
                  type="number"
                  min={0}
                  max={200}
                  value={s.widthPct}
                  onChange={(e) => set({ widthPct: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })}
                />
              </div>
            )}
            <div className="sizing-row">
              <span className="sizing-name">Alto</span>
              <div className="seg">
                <button
                  className={(s.sizing?.y ?? "fixed") === "fixed" && s.heightPct === undefined ? "is-active" : ""}
                  onClick={() => set({ sizing: { x: s.sizing?.x ?? "fixed", y: "fixed" }, heightPct: undefined })}
                >
                  Fijo
                </button>
                <button
                  className={s.sizing?.y === "hug" ? "is-active" : ""}
                  title="Se ajusta al contenido"
                  onClick={() => set({ sizing: { x: s.sizing?.x ?? "fixed", y: "hug" }, heightPct: undefined })}
                >
                  Contenido
                </button>
                <button
                  className={s.heightPct !== undefined ? "is-active" : ""}
                  title="Porcentaje del padre"
                  onClick={() => set({ heightPct: s.heightPct ?? 100, sizing: { x: s.sizing?.x ?? "fixed", y: "fixed" } })}
                >
                  %
                </button>
              </div>
            </div>
            {s.heightPct !== undefined && (
              <div className="sizing-row">
                <span className="sizing-name">%</span>
                <input
                  className="num-input"
                  type="number"
                  min={0}
                  max={200}
                  value={s.heightPct}
                  onChange={(e) => set({ heightPct: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </Section>
  );
}

/**
 * Constraints/responsive (Fase 3): cómo reacciona el nodo al cambiar el
 * tamaño de su pantalla — sin jerga técnica, solo iconos de pin/estirar.
 * Se ignora en hijos de auto-layout (los coloca el apilado).
 */
function ConstraintsSection({ node, inFlex }: { node: Node; inFlex: boolean }) {
  const c = node.constraints ?? DEFAULT_CONSTRAINTS;
  const set = (partial: Partial<Constraints>) =>
    useStore.getState().setConstraints(node.id, { ...c, ...partial });

  const btn = (
    active: boolean,
    title: string,
    onClick: () => void,
    icon: ReactNode,
    disabled?: boolean,
  ) => (
    <button
      key={title}
      className={active ? "is-active" : ""}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <Section title="Responsive">
      {inFlex ? (
        <div className="dim safe-hint">
          Lo posiciona el apilado automático: para fijarlo, desactiva el auto-layout de su contenedor.
        </div>
      ) : (
        <>
          <div className="field-label">Al cambiar el ancho</div>
          <div className="icon-seg">
            {btn(
              c.horizontal === "min",
              "Fijo a la izquierda",
              () => set({ horizontal: "min" }),
              <AlignStartHorizontal size={14} />,
            )}
            {btn(
              c.horizontal === "center",
              "Centrado horizontal",
              () => set({ horizontal: "center" }),
              <AlignCenterHorizontal size={14} />,
            )}
            {btn(
              c.horizontal === "max",
              "Fijo a la derecha",
              () => set({ horizontal: "max" }),
              <AlignEndHorizontal size={14} />,
            )}
            {btn(
              c.horizontal === "stretch",
              "Estirar con el ancho",
              () => set({ horizontal: "stretch" }),
              <StretchHorizontal size={14} />,
            )}
            {btn(
              c.horizontal === "scale",
              "Escalar con la pantalla",
              () => set({ horizontal: "scale" }),
              <MoveDiagonal size={14} />,
            )}
          </div>
          <div className="field-label">Al cambiar la altura</div>
          <div className="icon-seg">
            {btn(
              c.vertical === "min",
              "Fijo arriba",
              () => set({ vertical: "min" }),
              <AlignStartVertical size={14} />,
            )}
            {btn(
              c.vertical === "center",
              "Centrado vertical",
              () => set({ vertical: "center" }),
              <AlignCenterVertical size={14} />,
            )}
            {btn(
              c.vertical === "max",
              "Fijo abajo",
              () => set({ vertical: "max" }),
              <AlignEndVertical size={14} />,
            )}
            {btn(
              c.vertical === "stretch",
              "Estirar con la altura",
              () => set({ vertical: "stretch" }),
              <StretchVertical size={14} />,
            )}
            {btn(
              c.vertical === "scale",
              "Escalar con la pantalla",
              () => set({ vertical: "scale" }),
              <MoveDiagonal size={14} />,
            )}
          </div>
          <div className="dim safe-hint">Prueba el cambio con “Redimensionar a” en la sección Pantalla del frame.</div>
        </>
      )}
    </Section>
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
  disabled = false,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  disabled?: boolean;
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
          disabled={disabled}
          title={disabled ? "El auto-layout decide la posición" : undefined}
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
        <button
          className="icon-btn"
          title="Capturar color de pantalla (eyedropper)"
          onClick={() => useStore.getState().eyedropColor()}
        >
          <Pipette size={14} />
        </button>
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

const STATE_LABELS: Record<StateKey, string> = {
  default: "Normal",
  hover: "Hover",
  pressed: "Pulsado",
  disabled: "Desactivado",
  focused: "Foco",
};

/**
 * Estados interactivos (Fase 3): edita overrides por estado y previsualiza
 * el resultado en el lienzo. Los atajos de easing vienen de los tokens.
 */
function StatesSection({ node }: { node: Node }) {
  const [active, setActive] = useState<StateKey | null>(null);
  const tokens = useStore((s) => s.doc.tokens);
  const previewState = useStore((s) => s.previewState);
  const setPreviewState = useStore((s) => s.setPreviewState);

  // Al cambiar de nodo seleccionado, vuelve al estado por defecto.
  useEffect(() => setActive(null), [node.id]);

  const entry = active && node.states ? node.states[active] : undefined;
  const s = entry?.style ?? {};
  const isPreviewing = previewState?.nodeId === node.id && previewState?.state === active;
  const st = () => useStore.getState();

  const set = (partial: Partial<Style>) => {
    if (!active) return;
    st().setStateOverride(node.id, active, partial);
  };

  const setTransition = (partial: Partial<{ durationMs: number; easing: string }>) => {
    if (!active) return;
    st().setStateTransition(node.id, active, {
      durationMs: entry?.transition?.durationMs ?? 150,
      easing: entry?.transition?.easing ?? "$standard",
      ...partial,
    });
  };

  return (
    <Section title="Estados">
      <div className="token-chips">
        {Object.entries(STATE_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`token-chip${active === key ? " is-active" : ""}`}
            onClick={() => setActive(key === "default" ? null : (key as StateKey))}
          >
            {label}
          </button>
        ))}
      </div>
      {active && (
        <div className="state-fields">
          <div className="shadow-head">
            <span className="field-label">Vista previa en lienzo</span>
            <input
              type="checkbox"
              checked={isPreviewing}
              onChange={(e) =>
                setPreviewState(e.target.checked ? { nodeId: node.id, state: active } : null)
              }
            />
          </div>
          <ColorField label="Relleno" value={s.backgroundColor} onCommit={(v) => set({ backgroundColor: v })} />
          {node.type === "text" && (
            <ColorField label="Color" value={s.color} onCommit={(v) => set({ color: v })} field="color" />
          )}
          <SliderField
            label="Opacidad"
            value={Math.round((s.opacity ?? 1) * 100)}
            onCommit={(v) => set({ opacity: v / 100 })}
          />
          <div className="field-grid">
            <Num label="Escala" value={s.scale ?? 1} step={0.05} onCommit={(v) => set({ scale: v })} />
            <Num
              label="Duración (ms)"
              value={entry?.transition?.durationMs ?? 150}
              onCommit={(v) => setTransition({ durationMs: Math.max(0, Math.round(v)) })}
            />
          </div>
          <div className="field">
            <span className="field-label">Transición (easing)</span>
            <select
              className="text-input"
              value={entry?.transition?.easing ?? ""}
              onChange={(e) => setTransition({ easing: e.target.value })}
            >
              <option value="">—</option>
              {Object.entries(tokens.easings).map(([name, val]) => (
                <option key={name} value={`$${name}`}>
                  {name} · {val}
                </option>
              ))}
            </select>
          </div>
          <button
            className="mini-btn is-danger"
            onClick={() => {
              st().removeState(node.id, active);
              if (isPreviewing) setPreviewState(null);
              setActive(null);
            }}
          >
            Quitar estado
          </button>
        </div>
      )}
    </Section>
  );
}

/** Comprobador de contraste WCAG para texto (Fase 3). */
function ContrastBadge({ node }: { node: Node }) {
  const tokens = useStore((s) => s.doc.tokens);
  const rootBg = useStore((s) => s.doc.root.style.backgroundColor);
  const fgRaw = resolveColor(tokens, node.style.color);
  const bgRaw =
    resolveColor(tokens, node.style.backgroundColor) ?? resolveColor(tokens, rootBg);
  const fg = parseColor(fgRaw ?? "");
  const bg = parseColor(bgRaw ?? "");
  if (!fg || !bg) return null;
  const ratio = contrastRatio(fg, bg);
  const rating = wcagRating(ratio);
  const ok = rating !== "fail";
  return (
    <div className={`contrast-badge${ok ? " is-ok" : " is-fail"}`}>
      <span className="contrast-ratio mono">{ratio.toFixed(2)}:1</span>
      <span className="contrast-label">
        {rating === "fail"
          ? "No cumple WCAG"
          : rating === "AAA"
            ? "AAA · excelente"
            : rating === "AA"
              ? "AA · accesible"
              : "AA · texto grande"}
      </span>
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

