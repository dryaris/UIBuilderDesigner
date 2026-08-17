import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { nodeRect } from "../core/tree";
import { saveProjectFile, openProjectFile } from "../export/project";
import { exportHtml } from "../export/html";

interface Action {
  id: string;
  label: string;
  keywords: string;
  run: () => void;
}

export function Palette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo<Action[]>(() => {
    const st = () => useStore.getState();
    return [
      { id: "new", label: "Nuevo proyecto…", keywords: "nuevo crear nuevo proyecto", run: () => st().setNewProjectOpen(true) },
      { id: "open", label: "Abrir proyecto (.canvas)…", keywords: "abrir open abrir archivo", run: () => void openAndReplace() },
      { id: "save", label: "Guardar proyecto (.canvas)", keywords: "guardar save exportar zip", run: () => { void saveProjectFile(st().doc); st().showToast("Proyecto .canvas guardado"); } },
      { id: "html", label: "Exportar HTML/CSS", keywords: "exportar html css web código", run: () => exportHtmlAndToast() },
      { id: "fit", label: "Ajustar a pantalla", keywords: "zoom ajustar fit encuadrar", run: () => st().fitTo(nodeRect(st().doc.root)) },
      { id: "zoom100", label: "Zoom 100%", keywords: "zoom tamaño real", run: () => st().zoomTo(1, center()) },
      { id: "undo", label: "Deshacer", keywords: "deshacer undo atras", run: () => st().undo() },
      { id: "redo", label: "Rehacer", keywords: "rehacer redo adelante", run: () => st().redo() },
      { id: "dup", label: "Duplicar selección", keywords: "duplicar copy clonar", run: () => st().duplicateSelection() },
      { id: "group", label: "Agrupar selección", keywords: "agrupar group", run: () => st().groupSelection("Grupo") },
      { id: "ungroup", label: "Desagrupar", keywords: "desagrupar ungroup", run: () => st().ungroupSelection() },
      { id: "del", label: "Eliminar selección", keywords: "eliminar borrar delete", run: () => st().deleteSelection() },
      { id: "rulers", label: "Alternar reglas", keywords: "reglas rulers", run: () => st().toggle("showRulers") },
      { id: "guides", label: "Alternar guías", keywords: "guías guides", run: () => st().toggle("showGuides") },
      { id: "safe", label: "Alternar áreas seguras TV", keywords: "seguras safe area tv consola", run: () => st().toggle("showSafeAreas") },
      { id: "grid", label: "Alternar cuadrícula", keywords: "cuadrícula grid puntos", run: () => st().toggle("showGrid") },
      { id: "theme", label: "Cambiar tema claro/oscuro", keywords: "tema theme claro oscuro dark light", run: () => toggleTheme() },
    ];
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  if (!open) return null;

  const filtered = actions.filter((a) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (a.label + " " + a.keywords).toLowerCase().includes(q);
  });
  const current = filtered[Math.min(index, Math.max(0, filtered.length - 1))];

  return (
    <div className="palette-overlay" onPointerDown={() => setOpen(false)}>
      <div className="palette" onPointerDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="¿Qué quieres hacer? (filtra acciones)…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && current) {
              current.run();
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <div className="palette-list">
          {filtered.map((a, i) => (
            <button
              key={a.id}
              className={`palette-item${i === index ? " is-selected" : ""}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => {
                a.run();
                setOpen(false);
              }}
            >
              {a.label}
            </button>
          ))}
          {filtered.length === 0 && <div className="palette-empty dim">Sin resultados</div>}
        </div>
        <div className="palette-hint dim">↑↓ navegar · Enter ejecutar · Esc cerrar</div>
      </div>
    </div>
  );
}

function center() {
  const vp = useStore.getState().viewport;
  return { x: vp.size.x / 2, y: vp.size.y / 2 };
}

async function openAndReplace(): Promise<void> {
  try {
    const doc = await openProjectFile();
    const st = useStore.getState();
    st.replaceDoc(doc);
    st.fitTo(nodeRect(doc.root));
    st.showToast("Proyecto abierto");
  } catch (err) {
    useStore.getState().showToast(err instanceof Error ? err.message : "No se pudo abrir el proyecto");
  }
}

function exportHtmlAndToast(): void {
  const st = useStore.getState();
  const html = exportHtml(st.doc);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(st.doc.root.name || "proyecto").replace(/[^\w\- ]+/g, "")}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  st.showToast("HTML exportado");
}

function toggleTheme(): void {
  const html = document.documentElement;
  const next = html.dataset.theme === "light" ? "dark" : "light";
  html.dataset.theme = next;
  localStorage.setItem("canvas.ui.theme", next);
}
