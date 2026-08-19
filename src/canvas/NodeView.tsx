/**
 * NodeView — renderiza un nodo del IR como DOM puro.
 *
 * Decisión deliberada (revisión de ingeniería): en Fase 1 el canvas usa DOM,
 * no PixiJS. El DOM ES el mismo motor que el exportador HTML, así que el
 * WYSIWYG es exacto por definición (sombras, gradientes, blend modes y texto
 * salen gratis). El IR está desacoplado del render, por lo que un renderer
 * PixiJS puede sustituirse después sin tocar el modelo.
 */
import { memo, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Node, Rect, Style, Tokens } from "../core/ir";
import { resolveColor, resolveRadius } from "../core/tokens";
import { vectorSvg } from "../core/vector";
import { useStore, type DragSession } from "../state/store";

function gradientCss(g: NonNullable<Style["gradient"]>, tokens: Tokens): string {
  const stops = g.stops
    .map((s) => `${resolveColor(tokens, s.color)} ${Math.round(s.pos * 100)}%`)
    .join(", ");
  if (g.type === "radial") return `radial-gradient(circle at 50% 50%, ${stops})`;
  return `linear-gradient(${g.angle}deg, ${stops})`;
}

function shadowCss(s: NonNullable<Style["boxShadow"]>, tokens: Tokens): string {
  const color = resolveColor(tokens, s.color) ?? "rgba(0,0,0,0.3)";
  return `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread ?? 0}px ${color}`;
}

function boxCss(node: Node, s: Style, tokens: Tokens, inFlex = false): CSSProperties {
  const css: CSSProperties = {
    position: inFlex ? "relative" : "absolute",
    boxSizing: "border-box",
  };
  if (!inFlex) {
    css.left = s.x;
    css.top = s.y;
  }
  css.width = s.widthPct !== undefined ? `${s.widthPct}%` : s.sizing?.x === "hug" ? "fit-content" : s.width;
  css.height = s.heightPct !== undefined ? `${s.heightPct}%` : s.sizing?.y === "hug" ? "fit-content" : s.height;
  // Auto-layout: flexbox real (el mismo motor que el exportador HTML).
  if (s.flexDirection) {
    css.display = "flex";
    css.flexDirection = s.flexDirection as CSSProperties["flexDirection"];
    css.alignItems = s.alignItems as CSSProperties["alignItems"];
    css.justifyContent = s.justifyContent as CSSProperties["justifyContent"];
    if (s.gap !== undefined) css.gap = s.gap;
    if (s.padding) {
      css.paddingTop = s.padding.top;
      css.paddingRight = s.padding.right;
      css.paddingBottom = s.padding.bottom;
      css.paddingLeft = s.padding.left;
    }
    if (s.wrap) css.flexWrap = "wrap";
  }
  // Los vectores pintan DENTRO del path (fill/gradiente del SVG), no en la caja.
  if (node.type !== "vector") {
    if (s.backgroundColor) css.backgroundColor = resolveColor(tokens, s.backgroundColor);
    if (s.gradient) css.backgroundImage = gradientCss(s.gradient, tokens);
  }
  if (s.borderRadius !== undefined) css.borderRadius = resolveRadius(tokens, s.borderRadius);
  if (s.boxShadow) css.boxShadow = shadowCss(s.boxShadow, tokens);
  if (s.opacity !== undefined) css.opacity = s.opacity;
  if (s.blendMode) css.mixBlendMode = s.blendMode as CSSProperties["mixBlendMode"];
  if (s.filters?.blur) css.filter = `blur(${s.filters.blur}px)`;
  if (s.scale || s.translate) {
    css.transform = [
      s.translate ? `translate(${s.translate.x}px, ${s.translate.y}px)` : "",
      s.scale ? `scale(${s.scale})` : "",
    ]
      .join(" ")
      .trim();
    css.transformOrigin = "0 0";
  }
  if (s.stroke) css.border = `${s.stroke.width}px solid ${s.stroke.color}`;
  // Los frames y formas recortan a sus hijos (como en Figma); el texto no.
  if (node.type !== "text") css.overflow = "hidden";
  return css;
}

function textCss(s: Style, tokens: Tokens): CSSProperties {
  const css: CSSProperties = {
    width: "100%",
    height: "100%",
    fontFamily: s.fontFamily ?? "Inter, system-ui, sans-serif",
    fontWeight: s.fontWeight,
    fontSize: s.fontSize,
    letterSpacing: s.letterSpacing !== undefined ? `${s.letterSpacing}px` : undefined,
    lineHeight: s.lineHeight,
    textAlign: s.textAlign ?? "left",
    textTransform: s.textTransform ?? "none",
    color: resolveColor(tokens, s.color) ?? "#ffffff",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    userSelect: "none",
  };
  if (s.gradient) {
    css.backgroundImage = gradientCss(s.gradient, tokens);
    css.WebkitBackgroundClip = "text";
    css.WebkitTextFillColor = "transparent";
    css.color = "transparent";
  }
  return css;
}

/**
 * Vista previa de drag SOLO si este nodo participa: el selector devuelve
 * null (estable) para todos los demás, así mover no re-renderiza la escena.
 * `shallow` compara dx/dy o el rect por valor: el nodo arrastrado solo se
 * re-renderiza cuando cambia realmente.
 */
type DragPreview = { kind: "move"; dx: number; dy: number } | { kind: "resize"; rect: Rect } | null;

const selectDragPreview = (nodeId: string) => (s: { drag: DragSession | null }): DragPreview => {
  const d = s.drag;
  if (!d) return null;
  if (d.kind === "move" && d.ids?.includes(nodeId)) return { kind: "move", dx: d.dx, dy: d.dy };
  if (d.kind === "resize" && d.id === nodeId) return { kind: "resize", rect: d.rect };
  return null;
};

export const NodeView = memo(function NodeView({ node, inFlex = false }: { node: Node; inFlex?: boolean }) {
  const drag = useStore(useShallow(selectDragPreview(node.id)));
  const editingTextId = useStore((s) => s.editingTextId);
  // Solo el nodo previsualizado se re-renderiza cuando cambia previewState.
  const previewState = useStore((s) =>
    s.previewState && s.previewState.nodeId === node.id ? s.previewState : null,
  );
  const previewMode = useStore((s) => s.previewMode);
  // Señal de re-render por nodo: cambia al entrar/salir de hover o press.
  const previewActive = useStore((s) =>
    s.previewMode
      ? `${s.previewPressId === node.id ? "1" : "0"}${s.previewHoverId === node.id ? "1" : "0"}`
      : "",
  );
  const tokens = useStore((s) => s.doc.tokens);

  if (node.hidden) return null;

  // Vista previa en vivo durante drag (el doc real solo cambia al soltar).
  let s = node.style;
  if (drag?.kind === "move") {
    s = { ...s, x: s.x + drag.dx, y: s.y + drag.dy };
  } else if (drag?.kind === "resize") {
    // Redimensionar a mano desactiva el hug: si no, el fit-content seguiría
    // ganando y nada se movería en el preview (el commit también lo fija).
    s = {
      ...s,
      x: drag.rect.x,
      y: drag.rect.y,
      width: drag.rect.width,
      height: drag.rect.height,
      sizing: { x: "fixed", y: "fixed" },
    };
  }

  // Estado interactivo previsualizado desde el Inspector (Fase 3).
  const stateEntry =
    previewState?.nodeId === node.id ? node.states?.[previewState.state] : undefined;
  if (stateEntry) s = { ...s, ...stateEntry.style };

  // Máquina de estados en modo Preview (Fase 4): hover/pulsado en vivo.
  let transitionCss: string | undefined;
  if (previewMode) {
    const previewHoverId = useStore.getState().previewHoverId;
    const previewPressId = useStore.getState().previewPressId;
    const active =
      previewPressId === node.id
        ? node.states?.pressed
        : previewHoverId === node.id
          ? node.states?.hover
          : undefined;
    if (active) s = { ...s, ...active.style };
    const tr = active?.transition ?? firstStateTransition(node);
    if (tr) {
      const easing = tr.easing.startsWith("$")
        ? tokens.easings[tr.easing.slice(1)] ?? "ease"
        : tr.easing;
      transitionCss = `background-color ${tr.durationMs}ms ${easing}, color ${tr.durationMs}ms ${easing}, opacity ${tr.durationMs}ms ${easing}, transform ${tr.durationMs}ms ${easing}, box-shadow ${tr.durationMs}ms ${easing}, filter ${tr.durationMs}ms ${easing}, width ${tr.durationMs}ms ${easing}, height ${tr.durationMs}ms ${easing}, left ${tr.durationMs}ms ${easing}, top ${tr.durationMs}ms ${easing}`;
    }
  }

  const editing = editingTextId === node.id;

  return (
    <div
      className={`cn cn-${node.type}${previewActive ? " is-preview-active" : ""}`}
      style={{ ...boxCss(node, s, tokens, inFlex), transition: transitionCss }}
      data-id={node.id}
    >
      {node.type === "vector" ? (
        <span className="cn-vector" dangerouslySetInnerHTML={{ __html: vectorSvg(node, tokens) }} />
      ) : node.type === "text" ? (
        <EditableText node={node} editing={editing} />
      ) : (
        node.children.map((child) => (
          <NodeView key={child.id} node={child} inFlex={Boolean(s.flexDirection)} />
        ))
      )}
    </div>
  );
});

/** Primera transición definida en los estados del nodo (para salir suave). */
function firstStateTransition(node: Node) {
  for (const key of ["pressed", "hover", "focused", "disabled"] as const) {
    const tr = node.states?.[key]?.transition;
    if (tr) return tr;
  }
  return undefined;
}

/** Texto editable inline (doble clic o herramienta Text). Al blur se mide y commitea. */
const EditableText = memo(function EditableText({ node, editing }: { node: Node; editing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const tokens = useStore((s) => s.doc.tokens);

  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.focus();
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const st = useStore.getState();
    const text = el.innerText.replace(/\u00a0/g, " ").replace(/\n$/, "");
    st.setText(node.id, text, Math.max(1, Math.ceil(el.scrollWidth)), Math.max(1, Math.ceil(el.scrollHeight)));
    st.setEditingText(null);
  };

  return (
    <div
      ref={ref}
      className="cn-text"
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={false}
      style={{
        ...textCss(node.style, tokens),
        overflow: editing ? "visible" : "hidden",
        pointerEvents: editing ? "auto" : "none",
        cursor: editing ? "text" : "default",
        userSelect: editing ? "text" : "none",
        outline: "none",
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    >
      {node.text ?? ""}
    </div>
  );
});
