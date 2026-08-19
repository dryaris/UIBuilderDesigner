/**
 * tokens.ts — Export de design tokens (Fase 8).
 *
 * El sistema de diseño del editor sale en los estándares de la industria:
 *  - tokens.json   → formato W3C DTCG (Design Tokens Community Group) con $type/$value.
 *  - style-dictionary/tokens.json + config.json → formato Style Dictionary (Amazon).
 *  - tokens.css    → custom properties listas para usar hoy.
 * Todo en un ZIP autocontenido.
 */
import JSZip from "jszip";
import type { CanvasDoc, Tokens } from "../core/ir";
import { downloadBlob, projectFileName } from "./png";
import { escapeHtml } from "./html";

interface DtcToken {
  $type: string;
  $value: unknown;
}

function dtcColors(tokens: Tokens): Record<string, DtcToken> {
  const out: Record<string, DtcToken> = {};
  for (const [name, value] of Object.entries(tokens.colors)) {
    out[name] = { $type: "color", $value: value };
  }
  return out;
}

function dtcDimensions(map: Record<string, number>): Record<string, DtcToken> {
  const out: Record<string, DtcToken> = {};
  for (const [name, value] of Object.entries(map)) {
    out[name] = { $type: "dimension", $value: `${value}px` };
  }
  return out;
}

function dtcTypography(tokens: Tokens): Record<string, DtcToken> {
  const out: Record<string, DtcToken> = {};
  for (const [name, t] of Object.entries(tokens.typography)) {
    out[name] = {
      $type: "typography",
      $value: {
        fontFamily: t.fontFamily,
        fontWeight: t.fontWeight,
        fontSize: t.fontSize !== undefined ? `${t.fontSize}px` : undefined,
        letterSpacing: t.letterSpacing !== undefined ? `${t.letterSpacing}px` : undefined,
        lineHeight: t.lineHeight,
        textTransform: t.textTransform,
        textAlign: t.textAlign,
      },
    };
  }
  return out;
}

function dtcShadows(tokens: Tokens): Record<string, DtcToken> {
  const out: Record<string, DtcToken> = {};
  for (const [name, css] of Object.entries(tokens.shadows)) {
    // "0 12px 40px rgba(0, 0, 0, 0.35)" → shadow DTCG.
    // Los offsets pueden ir sin sufijo px ("0 12px 40px rgba(...)").
    const m = /^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?\s+(.+)$/.exec(css.trim());
    out[name] = {
      $type: "shadow",
      $value: m
        ? [
            {
              color: m[5],
              offsetX: `${m[1]}px`,
              offsetY: `${m[2]}px`,
              blur: `${m[3]}px`,
              spread: m[4] !== undefined ? `${m[4]}px` : "0px",
              type: "dropShadow",
            },
          ]
        : css,
    };
  }
  return out;
}

function dtcEasings(tokens: Tokens): Record<string, DtcToken> {
  const out: Record<string, DtcToken> = {};
  for (const [name, curve] of Object.entries(tokens.easings)) {
    // cubic-bezier(x1, y1, x2, y2) → array para $type cubicBezier.
    const m = /cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/.exec(curve);
    out[name] = {
      $type: "cubicBezier",
      $value: m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] : curve,
    };
  }
  return out;
}

/** tokens.json — W3C DTCG. */
export function dtcTokensJson(tokens: Tokens): string {
  const doc = {
    $description: "Design tokens exportados por UI Forger — formato W3C DTCG.",
    color: dtcColors(tokens),
    radius: dtcDimensions(tokens.radii),
    spacing: dtcDimensions(tokens.spacing),
    typography: dtcTypography(tokens),
    shadow: dtcShadows(tokens),
    easing: dtcEasings(tokens),
  };
  return JSON.stringify(doc, null, 2);
}

/** style-dictionary/tokens.json — formato Style Dictionary (valor plano). */
export function styleDictionaryTokensJson(tokens: Tokens): string {
  const color: Record<string, { value: string }> = {};
  for (const [name, value] of Object.entries(tokens.colors)) color[name] = { value };
  const radius: Record<string, { value: string }> = {};
  for (const [name, value] of Object.entries(tokens.radii)) radius[name] = { value: `${value}px` };
  const spacing: Record<string, { value: string }> = {};
  for (const [name, value] of Object.entries(tokens.spacing)) spacing[name] = { value: `${value}px` };
  const typography: Record<string, { value: unknown }> = {};
  for (const [name, t] of Object.entries(tokens.typography)) {
    typography[name] = {
      value: {
        fontFamily: t.fontFamily,
        fontWeight: t.fontWeight,
        fontSize: t.fontSize !== undefined ? `${t.fontSize}px` : undefined,
        letterSpacing: t.letterSpacing !== undefined ? `${t.letterSpacing}px` : undefined,
        lineHeight: t.lineHeight,
      },
    };
  }
  const shadow: Record<string, { value: string }> = {};
  for (const [name, value] of Object.entries(tokens.shadows)) shadow[name] = { value };
  const easing: Record<string, { value: string }> = {};
  for (const [name, value] of Object.entries(tokens.easings)) easing[name] = { value };
  return JSON.stringify({ color, radius, spacing, typography, shadow, easing }, null, 2);
}

/** tokens.css — custom properties listas para el navegador. */
export function tokensCss(tokens: Tokens): string {
  const lines: string[] = [];
  for (const [name, value] of Object.entries(tokens.colors)) lines.push(`  --color-${name}: ${value};`);
  for (const [name, value] of Object.entries(tokens.radii)) lines.push(`  --radius-${name}: ${value}px;`);
  for (const [name, value] of Object.entries(tokens.spacing)) lines.push(`  --space-${name}: ${value}px;`);
  for (const [name, value] of Object.entries(tokens.easings)) lines.push(`  --ease-${name}: ${value};`);
  for (const [name, value] of Object.entries(tokens.shadows)) lines.push(`  --shadow-${name}: ${value};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

const SD_CONFIG = `{
  "source": ["tokens.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "build/css/",
      "files": [{ "destination": "tokens.css", "format": "css/variables" }]
    },
    "scss": {
      "transformGroup": "scss",
      "buildPath": "build/scss/",
      "files": [{ "destination": "_tokens.scss", "format": "scss/variables" }]
    },
    "json": {
      "transformGroup": "js",
      "buildPath": "build/json/",
      "files": [{ "destination": "tokens.json", "format": "json/flat" }]
    }
  }
}`;

const SD_README = `# Style Dictionary — tokens de UI Forger

1. Instala:  npm i -D style-dictionary
2. Copia tokens.json y config.json a tu proyecto.
3. Compila:  npx style-dictionary build

Genera tokens.css (custom properties), _tokens.scss y tokens.json plano.
`;

export async function exportTokensBundle(doc: CanvasDoc): Promise<Blob> {
  const zip = new JSZip();
  zip.file("tokens.json", dtcTokensJson(doc.tokens));
  zip.file("tokens.css", tokensCss(doc.tokens));
  zip.file("style-dictionary/tokens.json", styleDictionaryTokensJson(doc.tokens));
  zip.file("style-dictionary/config.json", SD_CONFIG);
  zip.file("style-dictionary/README.md", SD_README);

  // Un DTCG por tema (el activo ya va como tokens.json).
  const themes = doc.themes ?? [];
  const themeReadme: string[] = [];
  for (const t of themes) {
    if (t.id === "base") continue;
    const themeTokens: Tokens = { ...doc.tokens, colors: { ...t.colors } };
    const safe = t.name.replace(/[^\w\- ]+/g, "").trim() || t.id;
    zip.file(`themes/${safe}.json`, dtcTokensJson(themeTokens));
    zip.file(`themes/${safe}.css`, tokensCss(themeTokens));
    themeReadme.push(`- themes/${safe}.json — tema «${escapeHtml(t.name)}» (DTCG) + .css.`);
  }

  zip.file(
    "README.md",
    `# Design tokens — ${escapeHtml(doc.root.name)}\n\n- tokens.json: formato W3C DTCG (design-tokens.github.io/community-group) — tema activo${doc.activeThemeId ? ` («${escapeHtml(themes.find((t) => t.id === doc.activeThemeId)?.name ?? "")}»)` : ""}.\n- style-dictionary/: formato Style Dictionary listo para compilar.\n- tokens.css: custom properties para usar directamente.\n${themeReadme.join("\n")}\n\nExportado por UI Forger — editor visual offline.\n`,
  );
  return zip.generateAsync({ type: "blob" });
}

export async function exportTokensFile(doc: CanvasDoc): Promise<void> {
  const blob = await exportTokensBundle(doc);
  downloadBlob(blob, `${projectFileName(doc)}-tokens.zip`);
}
