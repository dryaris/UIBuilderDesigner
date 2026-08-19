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
import { vectorSvg } from "../core/vector";
import { constraintCss } from "../core/constraints";

export function exportHtml(doc: CanvasDoc): string {
  const screens = [doc.root, ...(doc.screens ?? [])];
  const css: string[] = [];
  const vars = cssVars(doc.tokens);
  if (vars) css.push(`:root {\n${vars}\n}`);

  // Conexiones de prototipo: nodo → índice de pantalla destino + duración.
  const conns = new Map<string, { to: number; dur: number; kind: string }>();
  for (const c of doc.connections ?? []) {
    const to = screens.findIndex((s) => s.id === c.toScreenId);
    if (to >= 0) {
      conns.set(c.fromNodeId, { to, dur: c.transition?.durationMs ?? 200, kind: c.transition?.kind ?? "fade" });
    }
  }

  const body = screens
    .map((screen, i) => {
      const inner = renderNode(screen, doc.tokens, `sc${i}`, css, conns, false, 0, 0);
      return `<div class="screen" id="screen-${i}" style="width:${screen.style.width}px;height:${screen.style.height}px">${inner}</div>`;
    })
    .join("\n");

  const script = `(function(){
var screens=[].slice.call(document.querySelectorAll(".screen"));
var cur=0;
function scale(){var el=screens[cur];if(!el)return;var k=Math.min(window.innerWidth/el.offsetWidth,window.innerHeight/el.offsetHeight);el.style.transform="scale("+k+")";el.style.transformOrigin="0 0";}
function nav(to,dur,kind){
if(to===cur)return;var old=screens[cur];
if(kind==="none"){old.style.display="none";cur=to;var el=screens[cur];el.style.display="block";el.style.opacity="1";el.style.transform="none";scale();return;}
var dx=0,dy=0,sc=1;
if(kind==="slide-left")dx=window.innerWidth;
else if(kind==="slide-right")dx=-window.innerWidth;
else if(kind==="slide-up")dy=window.innerHeight;
else if(kind==="slide-down")dy=-window.innerHeight;
else if(kind==="zoom")sc=0.8;
old.style.transition="opacity "+dur+"ms, transform "+dur+"ms";old.style.opacity="0";old.style.transform="translate("+(-dx)+"px,"+(-dy)+"px) scale("+(1/sc)+")";
setTimeout(function(){old.style.display="none";old.style.transform="none";cur=to;var el=screens[cur];el.style.display="block";el.style.opacity="0";el.style.transform="translate("+dx+"px,"+dy+"px) scale("+sc+")";
requestAnimationFrame(function(){el.style.transition="opacity "+dur+"ms, transform "+dur+"ms";el.style.opacity="1";el.style.transform="none";});scale();},dur);
}
document.addEventListener("click",function(e){
var t=e.target.closest?e.target.closest("[data-conn]"):null;if(!t)return;
var to=parseInt(t.getAttribute("data-conn"),10);var dur=parseInt(t.getAttribute("data-dur")||"200",10);var kind=t.getAttribute("data-kind")||"fade";
nav(to,dur,kind);
});
window.addEventListener("resize",scale);scale();
})();`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.root.name || "Export UI Forger")}</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; background: #0b0e1a; overflow: hidden; }
.screen { position: absolute; left: 0; top: 0; opacity: 1; }
.screen:not(:first-child) { display: none; }
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

function renderNode(
  node: Node,
  tokens: Tokens,
  cls: string,
  css: string[],
  conns?: Map<string, { to: number; dur: number; kind: string }>,
  inFlex = false,
  parentW = 0,
  parentH = 0,
): string {
  const sel = `.${cls}`;
  // Los vectores pintan dentro del path (SVG), no en la caja.
  const boxStyle =
    node.type === "vector"
      ? { ...node.style, backgroundColor: undefined, gradient: undefined }
      : node.style;
  // Constraints → CSS responsive (solo hijos posicionados de un contenedor
  // de tamaño conocido y fuera de auto-layout).
  let cssRules = styleToCss(boxStyle, tokens, inFlex);
  if (!inFlex && node.constraints && parentW > 0 && parentH > 0) {
    const resp = constraintCss(boxStyle, node.constraints, parentW, parentH);
    if (resp) {
      // Reemplaza la caja estática (left/top + width/height) por la responsive.
      const staticBox = new Set(["left", "top", "right", "bottom", "width", "height", "margin-left", "margin-top"]);
      cssRules = cssRules
        .split(";")
        .map((r) => r.trim())
        .filter((r) => {
          const prop = r.split(":")[0].trim();
          return r.length > 0 && !staticBox.has(prop);
        })
        .concat(resp)
        .join("; ");
    }
  }
  css.push(`${sel} { ${cssRules} }`);
  // Overflow explícito del nodo (frames con scroll/hidden).
  if (node.type !== "text" && node.overflow) {
    css.push(`${sel} { overflow: ${node.overflow}; }`);
  }

  // Estados interactivos → pseudo-clases (Fase 3 ya emite estas reglas).
  const states = node.states ?? {};
  if (states.hover) css.push(`${sel}:hover { ${partialCss(states.hover.style, tokens)} }`);
  if (states.pressed) css.push(`${sel}:active { ${partialCss(states.pressed.style, tokens)} }`);
  if (states.focused) css.push(`${sel}:focus-visible { ${partialCss(states.focused.style, tokens)} }`);
  if (states.disabled) css.push(`${sel}.is-disabled { ${partialCss(states.disabled.style, tokens)} }`);

  const children = node.children
    .map((c) =>
      renderNode(
        c,
        tokens,
        `${cls}-${hash(c.id)}`,
        css,
        conns,
        Boolean(node.style.flexDirection),
        node.style.width ?? 0,
        node.style.height ?? 0,
      ),
    )
    .join("");
  const inner =
    node.type === "text" ? escapeHtml(node.text ?? "")
    : node.type === "vector" ? vectorSvg(node, tokens)
    : node.type === "image" && node.imageSrc ? `<img src="${node.imageSrc}" alt="${escapeHtml(node.name)}" style="width:100%;height:100%;object-fit:${node.objectFit ?? "cover"};pointer-events:none" />`
    : children;
  const disabled = states.disabled ? " is-disabled" : "";
  const conn = conns?.get(node.id);
  const connAttrs = conn ? ` data-conn="${conn.to}" data-dur="${conn.dur}" data-kind="${(conn as { kind: string }).kind ?? "fade"}" style="cursor:pointer"` : "";
  return `<div class="${cls}${disabled}"${connAttrs}>${inner}</div>`;
}

export function styleToCss(s: Style, tokens: Tokens, inFlex = false): string {
  const rules: string[] = [];
  if (inFlex) {
    rules.push(`position: relative;`);
  } else {
    rules.push(`position: absolute;`);
    // Los campos de caja pueden faltar en overrides parciales (estados).
    if (s.x !== undefined) rules.push(`left: ${s.x}px;`);
    if (s.y !== undefined) rules.push(`top: ${s.y}px;`);
  }
  if (s.sizing?.x === "hug") rules.push(`width: fit-content;`);
  else if (s.width !== undefined) rules.push(`width: ${s.width}px;`);
  if (s.sizing?.y === "hug") rules.push(`height: fit-content;`);
  else if (s.height !== undefined) rules.push(`height: ${s.height}px;`);
  if (s.flexDirection) {
    rules.push(`display: flex; flex-direction: ${s.flexDirection};`);
    if (s.justifyContent) rules.push(`justify-content: ${s.justifyContent};`);
    if (s.alignItems) rules.push(`align-items: ${s.alignItems};`);
    if (s.gap !== undefined) rules.push(`gap: ${s.gap}px;`);
    if (s.padding) {
      rules.push(
        `padding: ${s.padding.top}px ${s.padding.right}px ${s.padding.bottom}px ${s.padding.left}px;`,
      );
    }
    if (s.wrap) rules.push(`flex-wrap: wrap;`);
  }
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
  // Las reglas de estado son OVERRIDES: solo emiten el delta visual, sin caja
  // (si no, un :hover re-emitiría position:absolute y width:0 y rompería el
  // layout — y cualquier contenedor flex al pasar el ratón).
  const { x, y, width, height, ...rest } = partial;
  return styleToCss(rest as Style, tokens);
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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
