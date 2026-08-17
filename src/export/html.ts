/**
 * Exportador HTML/CSS/JS — el validador temprano del IR.
 *
 * Mapeo IR → destino (espec del proyecto):
 *  - style        → CSS (inline por nodo, fácil de editar)
 *  - tokens       → custom properties (:root { --primary: … })
 *  - estados      → pseudo-clases (:hover, :active, :disabled, :focus-visible)
 *  - timelines    → animaciones CSS (llegan con la Fase 4)
 *
 * Genera un único .html autocontenido con un script que escala la pantalla
 * al viewport (como un preview de Figma).
 */
import type { CanvasDoc, Node, Style, Tokens } from "../core/ir";
import { resolveColor, resolveRadius } from "../core/tokens";

export function exportHtml(doc: CanvasDoc): string {
  const root = doc.root;
  const css: string[] = [];
  const vars = cssVars(doc.tokens);
  if (vars) css.push(`:root {\n${vars}\n}`);

  const body = renderNode(root, doc.tokens, "screen", css);

  const script = `(function(){var el=document.getElementById("screen");var k=Math.min(window.innerWidth/el.offsetWidth,window.innerHeight/el.offsetHeight);el.style.transform="scale("+k+")";el.style.transformOrigin="0 0";})();`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(root.name || "Export Canvas")}</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; background: #0b0e1a; overflow: hidden; }
#screen { position: absolute; left: 0; top: 0; }
${css.join("\n")}
</style>
</head>
<body>
${body}
<script>${script}</script>
</body>
</html>
`;
}

function cssVars(tokens: Tokens): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(tokens.colors)) lines.push(`  --${k}: ${v};`);
  return lines.join("\n");
}

function hash(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "");
}

function renderNode(node: Node, tokens: Tokens, cls: string, css: string[]): string {
  const sel = `.${cls}`;
  css.push(`${sel} { ${styleToCss(node.style, tokens)} }`);

  // Estados interactivos → pseudo-clases (Fase 3 ya emite estas reglas).
  const states = node.states ?? {};
  if (states.hover) css.push(`${sel}:hover { ${partialCss(states.hover.style, tokens)} }`);
  if (states.pressed) css.push(`${sel}:active { ${partialCss(states.pressed.style, tokens)} }`);
  if (states.focused) css.push(`${sel}:focus-visible { ${partialCss(states.focused.style, tokens)} }`);
  if (states.disabled) css.push(`${sel}.is-disabled { ${partialCss(states.disabled.style, tokens)} }`);

  const children = node.children.map((c) => renderNode(c, tokens, `${cls}-${hash(c.id)}`, css)).join("");
  const inner = node.type === "text" ? escapeHtml(node.text ?? "") : children;
  const disabled = states.disabled ? " is-disabled" : "";
  return `<div class="${cls}${disabled}">${inner}</div>`;
}

function styleToCss(s: Style, tokens: Tokens): string {
  const rules: string[] = [];
  rules.push(`position: absolute; left: ${s.x}px; top: ${s.y}px; width: ${s.width}px; height: ${s.height}px;`);
  const bg = resolveColor(tokens, s.backgroundColor);
  if (bg) rules.push(`background-color: ${bg};`);
  if (s.gradient) rules.push(`background-image: ${gradientCss(s.gradient, tokens)};`);
  const radius = resolveRadius(tokens, s.borderRadius);
  if (radius !== undefined) rules.push(`border-radius: ${radius}px;`);
  if (s.boxShadow) rules.push(`box-shadow: ${shadowCss(s.boxShadow, tokens)};`);
  if (s.opacity !== undefined) rules.push(`opacity: ${s.opacity};`);
  if (s.blendMode) rules.push(`mix-blend-mode: ${s.blendMode};`);
  if (s.filters?.blur) rules.push(`filter: blur(${s.filters.blur}px);`);
  if (s.scale || s.translate) {
    rules.push(
      `transform: ${s.translate ? `translate(${s.translate.x}px, ${s.translate.y}px)` : ""} ${s.scale ? `scale(${s.scale})` : ""}`.trim() + ";",
    );
  }
  if (s.stroke) rules.push(`border: ${s.stroke.width}px solid ${s.stroke.color};`);

  if (nodeHasText(s)) {
    if (s.fontFamily) rules.push(`font-family: ${s.fontFamily};`);
    if (s.fontWeight) rules.push(`font-weight: ${s.fontWeight};`);
    if (s.fontSize) rules.push(`font-size: ${s.fontSize}px;`);
    if (s.letterSpacing !== undefined) rules.push(`letter-spacing: ${s.letterSpacing}px;`);
    if (s.lineHeight) rules.push(`line-height: ${s.lineHeight};`);
    if (s.textAlign) rules.push(`text-align: ${s.textAlign};`);
    if (s.textTransform && s.textTransform !== "none") rules.push(`text-transform: ${s.textTransform};`);
    rules.push("white-space: pre-wrap;");
    const color = resolveColor(tokens, s.color);
    if (s.gradient) {
      rules.push("background-clip: text; -webkit-background-clip: text; color: transparent;");
    } else if (color) {
      rules.push(`color: ${color};`);
    }
  }
  return rules.join(" ");
}

function nodeHasText(s: Style): boolean {
  return s.fontSize !== undefined || s.color !== undefined || s.fontFamily !== undefined;
}

function partialCss(partial: Partial<Style>, tokens: Tokens): string {
  // Construye un style temporal para reutilizar la misma serialización.
  const full: Style = { x: 0, y: 0, width: 0, height: 0, ...partial };
  return styleToCss(full, tokens);
}

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
