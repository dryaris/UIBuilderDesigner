/**
 * DesignPanel — pestaña "Diseño" del panel derecho.
 *
 * Sistema de diseño de primera clase, SIN jerga técnica:
 *  - Tokens visuales: colores, radios, espaciado, tipografías, sombras y easing.
 *  - Librería de componentes: crea un componente desde la selección
 *    (clic derecho → "Crear componente") e inserta instancias con un clic.
 *
 * Los tokens se editan con pickers y sliders; los refs "$nombre" se aplican
 * a los nodos desde aquí o desde el Inspector.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Trash2, ArrowLeft, Component, Boxes, Copy } from "lucide-react";
import { useStore } from "../state/store";
import type { Node, Tokens, Typography } from "../core/ir";
import { resolveColor, resolveRadius } from "../core/tokens";
import { findNode } from "../core/tree";

export function DesignPanel() {
  return (
    <aside className="panel inspector design-panel">
      <div className="panel-title">Diseño</div>
      <div className="panel-body">
        <ThemesSection />
        <TokensSection />
        <LibrarySection />
      </div>
    </aside>
  );
}

/**
 * Temas de color (Fase 8): el token editor edita SIEMPRE el tema activo.
 * Tema base = el de siempre; los demás son variantes (light/dark/…).
 */
function ThemesSection() {
  const themes = useStore((s) => s.doc.themes ?? []);
  const activeId = useStore((s) => s.doc.activeThemeId);
  const tokens = useStore((s) => s.doc.tokens);
  const st = () => useStore.getState();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const list = themes.length === 0 ? [{ id: "base", name: "Tema base", colors: tokens.colors }] : themes;

  return (
    <Section title="Temas">
      <div className="theme-list">
        {list.map((t) => {
          const active = t.id === (activeId ?? "base");
          return (
            <div key={t.id} className={`theme-row${active ? " is-active" : ""}`}>
              <button
                className="theme-main"
                title={active ? "Tema activo" : "Activar tema"}
                onClick={() => st().activateTheme(t.id)}
              >
                <span className="theme-swatches">
                  {Object.entries(t.colors)
                    .slice(0, 5)
                    .map(([name, value]) => (
                      <i key={name} title={name} style={{ background: value }} />
                    ))}
                </span>
                {renaming === t.id ? (
                  <input
                    className="theme-rename"
                    autoFocus
                    value={nameDraft}
                    spellCheck={false}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => {
                      st().renameTheme(t.id, nameDraft);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="theme-name">{t.name}</span>
                )}
                {active && <span className="theme-check">✓</span>}
              </button>
              {t.id !== "base" && (
                <>
                  <button
                    className="icon-btn"
                    title="Renombrar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(t.id);
                      setNameDraft(t.name);
                    }}
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    className="icon-btn theme-del"
                    title="Eliminar tema"
                    onClick={(e) => {
                      e.stopPropagation();
                      st().deleteTheme(t.id);
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          );
        })}
        <button
          className="mini-btn theme-add"
          onClick={() => {
            const n = `Tema ${(themes.length).toString()}`;
            st().addTheme(n);
          }}
        >
          <Plus size={12} /> Nuevo tema (colores actuales)
        </button>
      </div>
      {activeId && (
        <p className="design-hint dim">
          Editando tema «{(themes.find((t) => t.id === activeId)?.name ?? "")}»: los colores de arriba se guardan en él. Exporta tokens para llevarte todos los temas.
        </p>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: ReactNode }) {
  return (
    <div className="design-section">
      <div className="design-section-head">
        <span className="design-section-title">{title}</span>
        {onAdd && (
          <button className="mini-btn" title={`Añadir ${title.toLowerCase()}`} onClick={onAdd}>
            <Plus size={12} />
          </button>
        )}
      </div>
      <div className="design-section-body">{children}</div>
    </div>
  );
}

function TokensSection() {
  const tokens = useStore((s) => s.doc.tokens);
  const st = () => useStore.getState();

  const add = (kind: keyof Tokens, def: unknown) => {
    st().updateTokens((t) => {
      const map = t[kind] as Record<string, unknown>;
      let i = 1;
      let name = `${kind === "typography" ? "texto" : kind === "easings" ? "easing" : kind}${i}`;
      while (map[name] !== undefined) {
        i += 1;
        name = `${kind === "typography" ? "texto" : kind === "easings" ? "easing" : kind}${i}`;
      }
      map[name] = def;
    });
  };

  return (
    <div className="design-tokens">
      <Section
        title="Colores"
        onAdd={() => add("colors", "#7C5CFF")}
      >
        {Object.entries(tokens.colors).map(([name, value]) => (
          <ColorTokenRow key={name} name={name} value={value} />
        ))}
        {Object.keys(tokens.colors).length === 0 && <Empty label="Sin colores todavía" />}
      </Section>

      <Section title="Radios" onAdd={() => add("radii", 12)}>
        {Object.entries(tokens.radii).map(([name, value]) => (
          <NumberTokenRow key={name} name={name} value={value} suffix="px" kind="radii" onApply={applyRadius} />
        ))}
        {Object.keys(tokens.radii).length === 0 && <Empty label="Sin radios todavía" />}
      </Section>

      <Section title="Espaciado" onAdd={() => add("spacing", 16)}>
        {Object.entries(tokens.spacing).map(([name, value]) => (
          <NumberTokenRow key={name} name={name} value={value} suffix="px" kind="spacing" />
        ))}
        {Object.keys(tokens.spacing).length === 0 && <Empty label="Sin espaciado todavía" />}
      </Section>

      <Section title="Tipografías" onAdd={() => add("typography", { fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600, fontSize: 24, letterSpacing: 0, lineHeight: 1.3 })}>
        {Object.entries(tokens.typography).map(([name, value]) => (
          <TypographyRow key={name} name={name} value={value} />
        ))}
        {Object.keys(tokens.typography).length === 0 && <Empty label="Sin tipografías todavía" />}
      </Section>

      <Section title="Sombras" onAdd={() => add("shadows", "0 8px 24px rgba(0, 0, 0, 0.3)")}>
        {Object.entries(tokens.shadows).map(([name, value]) => (
          <StringTokenRow key={name} name={name} value={value} kind="shadows" onApply={applyShadow} />
        ))}
        {Object.keys(tokens.shadows).length === 0 && <Empty label="Sin sombras todavía" />}
      </Section>

      <Section title="Easing" onAdd={() => add("easings", "cubic-bezier(0.4, 0, 0.2, 1)")}>
        {Object.entries(tokens.easings).map(([name, value]) => (
          <StringTokenRow key={name} name={name} value={value} kind="easings" />
        ))}
        {Object.keys(tokens.easings).length === 0 && <Empty label="Sin easing todavía" />}
      </Section>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="design-empty dim">{label}</div>;
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button className="icon-btn token-del" title="Eliminar" onClick={onDelete}>
      <Trash2 size={12} />
    </button>
  );
}

function ApplyButton({ onApply, title }: { onApply: () => void; title: string }) {
  return (
    <button className="icon-btn token-apply" title={title} onClick={onApply}>
      <ArrowLeft size={12} />
    </button>
  );
}

function applyColorToSelection(tokenName: string): void {
  const st = useStore.getState();
  const ids = st.selection;
  if (ids.length === 0) {
    st.showToast("Selecciona un elemento para aplicar el token");
    return;
  }
  st.apply((d) => {
    for (const id of ids) {
      const n = findNode(d.root, id);
      if (n) n.style.backgroundColor = `$${tokenName}`;
    }
  });
}

function applyRadius(tokenName: string): void {
  const st = useStore.getState();
  if (st.selection.length === 0) {
    st.showToast("Selecciona un elemento para aplicar el token");
    return;
  }
  st.apply((d) => {
    for (const id of st.selection) {
      const n = findNode(d.root, id);
      if (n) n.style.borderRadius = `$${tokenName}`;
    }
  });
}

function applyShadow(tokenName: string): void {
  const st = useStore.getState();
  const shadow = st.doc.tokens.shadows[tokenName];
  const parsed = parseShadowCss(shadow);
  if (!parsed) {
    st.showToast("Formato de sombra no válido (ej: 0 8px 24px rgba(0,0,0,0.3))");
    return;
  }
  if (st.selection.length === 0) {
    st.showToast("Selecciona un elemento para aplicar el token");
    return;
  }
  st.apply((d) => {
    for (const id of st.selection) {
      const n = findNode(d.root, id);
      if (n) n.style.boxShadow = parsed;
    }
  });
}

/** Parsea "Xpx Ypx Zpx color" → Shadow estructurado (el formato del IR). */
function parseShadowCss(s: string): { color: string; x: number; y: number; blur: number; spread?: number } | null {
  const m = s.match(/^(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?\s+(.+)$/);
  if (!m) return null;
  return {
    x: Number(m[1]),
    y: Number(m[2]),
    blur: Number(m[3]),
    spread: m[4] ? Number(m[4]) : undefined,
    color: m[5].trim(),
  };
}

function ColorTokenRow({ name, value }: { name: string; value: string }) {
  const [text, setText] = useState(value);
  const resolved = resolveColor(useStore.getState().doc.tokens, value) ?? value;
  const isHex = resolved.startsWith("#");
  const commit = (v: string) => {
    if (!v.trim()) {
      setText(value);
      return;
    }
    useStore.getState().updateTokens((t) => {
      t.colors[name] = v.trim();
    });
    setText(v.trim());
  };
  return (
    <div className="token-row">
      <span className="swatch token-swatch" style={{ background: resolved }}>
        <input
          type="color"
          value={isHex ? resolved : "#000000"}
          onChange={(e) => commit(e.target.value)}
        />
      </span>
      <span className="token-name" title={`$${name}`}>
        {name}
      </span>
      <input
        className="text-input mono token-value"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <ApplyButton title="Aplicar a la selección" onApply={() => applyColorToSelection(name)} />
      <DeleteButton onDelete={() => useStore.getState().updateTokens((t) => delete t.colors[name])} />
    </div>
  );
}

function NumberTokenRow({
  name,
  value,
  suffix,
  kind,
  onApply,
}: {
  name: string;
  value: number;
  suffix: string;
  kind: "radii" | "spacing";
  onApply?: (name: string) => void;
}) {
  const [text, setText] = useState(String(value));
  const commit = () => {
    const v = Number(text);
    if (!Number.isNaN(v) && v >= 0) {
      useStore.getState().updateTokens((t) => {
        (t[kind] as Record<string, number>)[name] = Math.round(v * 10) / 10;
      });
    }
    setText(String(value));
  };
  return (
    <div className="token-row">
      <span className="token-name" title={`$${name}`}>
        {name}
      </span>
      <input
        className="text-input mono token-value"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <span className="token-suffix dim">{suffix}</span>
      {onApply && <ApplyButton title="Aplicar a la selección" onApply={() => onApply(name)} />}
      <DeleteButton
        onDelete={() =>
          useStore.getState().updateTokens((t) => {
            delete (t[kind] as Record<string, number>)[name];
          })
        }
      />
    </div>
  );
}

function StringTokenRow({
  name,
  value,
  kind,
  onApply,
}: {
  name: string;
  value: string;
  kind: "shadows" | "easings";
  onApply?: (name: string) => void;
}) {
  const [text, setText] = useState(value);
  const commit = () => {
    if (!text.trim()) {
      setText(value);
      return;
    }
    useStore.getState().updateTokens((t) => {
      (t[kind] as Record<string, string>)[name] = text.trim();
    });
    setText(text.trim());
  };
  return (
    <div className="token-row token-row-stack">
      <div className="token-row-inline">
        <span className="token-name" title={`$${name}`}>
          {name}
        </span>
        {onApply && <ApplyButton title="Aplicar a la selección" onApply={() => onApply(name)} />}
        <DeleteButton
          onDelete={() =>
            useStore.getState().updateTokens((t) => {
              delete (t[kind] as Record<string, string>)[name];
            })
          }
        />
      </div>
      <input
        className="text-input mono token-value"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

function TypographyRow({ name, value }: { name: string; value: Typography }) {
  const patch = (partial: Partial<Typography>) => {
    useStore.getState().updateTokens((t) => {
      t.typography[name] = { ...t.typography[name], ...partial };
    });
  };
  const apply = () => {
    const st = useStore.getState();
    if (st.selection.length === 0) {
      st.showToast("Selecciona un elemento de texto para aplicar el estilo");
      return;
    }
    st.apply((d) => {
      for (const id of st.selection) {
        const n = findNode(d.root, id);
        if (!n || n.type !== "text") continue;
        n.style = {
          ...n.style,
          fontFamily: value.fontFamily,
          fontWeight: value.fontWeight,
          fontSize: value.fontSize,
          letterSpacing: value.letterSpacing,
          lineHeight: value.lineHeight,
          textAlign: value.textAlign,
          textTransform: value.textTransform,
        };
      }
    });
    st.showToast("Estilo de texto aplicado");
  };
  return (
    <div className="token-row token-row-stack">
      <div className="token-row-inline">
        <span className="token-name" title={`$${name}`}>
          {name}
        </span>
        <ApplyButton title="Aplicar a la selección" onApply={apply} />
        <DeleteButton
          onDelete={() =>
            useStore.getState().updateTokens((t) => {
              delete t.typography[name];
            })
          }
        />
      </div>
      <div className="token-row-inline">
        <input
          className="text-input mono token-num"
          type="number"
          value={value.fontSize ?? 16}
          onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          title="Tamaño"
        />
        <select
          className="text-input token-num"
          value={value.fontWeight ?? 400}
          onChange={(e) => patch({ fontWeight: Number(e.target.value) })}
          title="Peso"
        >
          {[300, 400, 500, 600, 700, 800, 900].map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <span className="token-suffix dim" title="Fuente">
          {(value.fontFamily ?? "").split(",")[0].replace(/['"]/g, "") || "—"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Librería de componentes
// ---------------------------------------------------------------------------

function LibrarySection() {
  const components = useStore((s) => s.doc.library.components);
  const st = () => useStore.getState();
  const bases = Object.values(components).filter((c) => !c.variantOf);
  const variants = Object.values(components).filter((c) => c.variantOf);
  const [newVariantFor, setNewVariantFor] = useState<string | null>(null);
  const [variantName, setVariantName] = useState("");

  const startVariant = (compId: string) => {
    const n = variants.filter((v) => v.variantOf === compId).length + 1;
    setVariantName(`Variante ${n}`);
    setNewVariantFor(compId);
  };

  const commitVariant = () => {
    if (newVariantFor) {
      st().addVariant(newVariantFor, variantName.trim() || "Variante");
    }
    setNewVariantFor(null);
    setVariantName("");
  };

  return (
    <div className="design-section library-section">
      <div className="design-section-head">
        <span className="design-section-title">
          <Boxes size={12} /> Componentes
        </span>
      </div>
      <div className="design-section-body">
        {bases.length === 0 ? (
          <div className="design-empty dim">
            <Component size={14} />
            <span>
              Selecciona un elemento y usa clic derecho → <b>Crear componente</b> para reutilizarlo.
            </span>
          </div>
        ) : (
          <div className="library-list">
            {bases.map((comp) => {
              const compVariants = variants.filter((v) => v.variantOf === comp.id);
              return (
                <div key={comp.id} className="library-group">
                  <div className="library-card-row">
                    <button
                      className="library-card"
                      title={`Insertar “${comp.name}”`}
                      onClick={() => st().insertComponent(comp.id)}
                    >
                      <div className="library-preview">
                        <MiniNode node={comp.root} />
                      </div>
                      <span className="library-name">{comp.name}</span>
                    </button>
                    <button
                      className="icon-btn library-variant-btn"
                      title={`Crear variante de ${comp.name}`}
                      onClick={() => startVariant(comp.id)}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  {newVariantFor === comp.id && (
                    <div className="library-variant-form">
                      <input
                        className="text-input"
                        autoFocus
                        value={variantName}
                        placeholder="Nombre de la variante"
                        onChange={(e) => setVariantName(e.target.value)}
                        onBlur={commitVariant}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitVariant();
                          if (e.key === "Escape") setNewVariantFor(null);
                        }}
                      />
                    </div>
                  )}
                  {compVariants.length > 0 && (
                    <div className="library-variants">
                      {compVariants.map((v) => (
                        <button
                          key={v.id}
                          className="variant-chip"
                          title={`Insertar “${v.name}”`}
                          onClick={() => st().insertComponent(v.id)}
                        >
                          {v.name.replace(`${comp.name} · `, "")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Miniatura del nodo raíz de un componente, escalada para la tarjeta. */
function MiniNode({ node }: { node: Node }) {
  const tokens = useStore((s) => s.doc.tokens);
  const scale = Math.min(1, 92 / Math.max(node.style.width, 1), 52 / Math.max(node.style.height, 1));
  const style = miniCss(node, tokens, scale);
  return (
    <div style={style}>
      {node.type === "text" ? (
        <span
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            fontFamily: node.style.fontFamily,
            fontSize: (node.style.fontSize ?? 14) * scale,
            fontWeight: node.style.fontWeight,
            color: resolveColor(tokens, node.style.color) ?? "#fff",
            textAlign: node.style.textAlign,
            lineHeight: node.style.lineHeight,
            whiteSpace: "pre-wrap",
          }}
        >
          {node.text}
        </span>
      ) : (
        node.children.map((c) => <MiniNode key={c.id} node={c} />)
      )}
    </div>
  );
}

function miniCss(node: Node, tokens: Tokens, scale: number): CSSProperties {
  const s = node.style;
  const css: CSSProperties = {
    position: "absolute",
    left: s.x * scale,
    top: s.y * scale,
    width: s.width * scale,
    height: s.height * scale,
    boxSizing: "border-box",
    overflow: node.type === "text" ? "visible" : "hidden",
  };
  const bg = resolveColor(tokens, s.backgroundColor);
  if (bg) css.backgroundColor = bg;
  if (s.gradient) {
    const stops = s.gradient.stops
      .map((g) => `${resolveColor(tokens, g.color)} ${Math.round(g.pos * 100)}%`)
      .join(", ");
    css.backgroundImage =
      s.gradient.type === "radial"
        ? `radial-gradient(circle at 50% 50%, ${stops})`
        : `linear-gradient(${s.gradient.angle}deg, ${stops})`;
  }
  const radius = resolveRadius(tokens, s.borderRadius);
  if (radius !== undefined) css.borderRadius = radius * scale;
  if (s.opacity !== undefined) css.opacity = s.opacity;
  return css;
}
