import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { nodeRect } from "../core/tree";
import { saveProjectFile, openProjectFile } from "../export/project";
import { exportHtml } from "../export/html";
import { exportPngFile, exportBundle, downloadBlob, projectFileName } from "../export/png";
import { exportUnityFile } from "../export/unity";
import { exportUmgFile } from "../export/umg";
import { exportSpecSheetFile } from "../export/spec";

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
      { id: "png1", label: "Exportar PNG 1x", keywords: "exportar png imagen asset 1x", run: () => exportPngAt(1) },
      { id: "png2", label: "Exportar PNG 2x", keywords: "exportar png imagen asset 2x retina", run: () => exportPngAt(2) },
      { id: "png3", label: "Exportar PNG 3x", keywords: "exportar png imagen asset 3x", run: () => exportPngAt(3) },
      { id: "bundle", label: "Exportar paquete (HTML + PNG 1x/2x/3x)", keywords: "exportar paquete bundle zip web html png", run: () => exportBundleAndToast() },
      { id: "unity", label: "Exportar Unity UI Toolkit (.uxml/.uss)", keywords: "unity uxml uss toolkit motor juego exportar", run: () => {
        const s = useStore.getState();
        exportUnityFile(s.doc);
        s.showToast("Unity UI Toolkit exportado");
      } },
      { id: "umg", label: "Exportar Unreal UMG (manifest + guía)", keywords: "unreal umg ue5 motor juego exportar blueprint", run: () => {
        const s = useStore.getState();
        exportUmgFile(s.doc);
        s.showToast("Unreal UMG exportado");
      } },
      { id: "spec", label: "Exportar spec sheet (modo Dev)", keywords: "spec dev medidas colores tipografía entregable desarrollador", run: () => {
        const s = useStore.getState();
        exportSpecSheetFile(s.doc);
        s.showToast("Spec sheet exportado");
      } },
      { id: "fit", label: "Ajustar a pantalla", keywords: "zoom ajustar fit encuadrar", run: () => st().fitTo(nodeRect(st().doc.root)) },
      { id: "zoom100", label: "Zoom 100%", keywords: "zoom tamaño real", run: () => st().zoomTo(1, center()) },
      { id: "undo", label: "Deshacer", keywords: "deshacer undo atras", run: () => st().undo() },
      { id: "redo", label: "Rehacer", keywords: "rehacer redo adelante", run: () => st().redo() },
      { id: "dup", label: "Duplicar selección", keywords: "duplicar copy clonar", run: () => st().duplicateSelection() },
      { id: "group", label: "Agrupar selección", keywords: "agrupar group", run: () => st().groupSelection("Grupo") },
      { id: "ungroup", label: "Desagrupar", keywords: "desagrupar ungroup", run: () => st().ungroupSelection() },
      { id: "comp", label: "Crear componente desde selección", keywords: "componente component reutilizar librería", run: () => { st().createComponent("Componente"); } },
      { id: "design", label: "Abrir sistema de diseño (tokens y componentes)", keywords: "tokens colores radios tipografía sombras easing diseño componentes librería", run: () => st().setRightTab("design") },
      { id: "alignL", label: "Alinear izquierda", keywords: "alinear left izquierda", run: () => st().alignSelection("left") },
      { id: "alignC", label: "Alinear centro horizontal", keywords: "alinear center centrar h", run: () => st().alignSelection("centerH") },
      { id: "alignR", label: "Alinear derecha", keywords: "alinear right derecha", run: () => st().alignSelection("right") },
      { id: "alignT", label: "Alinear arriba", keywords: "alinear top arriba", run: () => st().alignSelection("top") },
      { id: "alignM", label: "Alinear centro vertical", keywords: "alinear center centrar v middle", run: () => st().alignSelection("centerV") },
      { id: "alignB", label: "Alinear abajo", keywords: "alinear bottom abajo", run: () => st().alignSelection("bottom") },
      { id: "distH", label: "Distribuir horizontalmente", keywords: "distribuir horizontal espaciar", run: () => st().distributeSelection("h") },
      { id: "distV", label: "Distribuir verticalmente", keywords: "distribuir vertical espaciar", run: () => st().distributeSelection("v") },
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

function exportPngAt(scale: number): void {
  const st = useStore.getState();
  void exportPngFile(st.doc, scale).then(() => st.showToast(`PNG ${scale}x exportado`));
}

function exportBundleAndToast(): void {
  const st = useStore.getState();
  void exportBundle(st.doc).then((blob) => {
    downloadBlob(blob, `${projectFileName(st.doc)}-web.zip`);
    st.showToast("Paquete HTML + PNG exportado");
  });
}

function toggleTheme(): void {
  const html = document.documentElement;
  const next = html.dataset.theme === "light" ? "dark" : "light";
  html.dataset.theme = next;
  localStorage.setItem("canvas.ui.theme", next);
}
