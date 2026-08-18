import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Maximize, Download, Play, Square } from "lucide-react";
import { useStore } from "../state/store";
import { nodeRect } from "../core/tree";
import { saveProjectFile, openProjectFile } from "../export/project";
import { exportHtml } from "../export/html";
import { exportPngFile, exportBundle, downloadBlob, projectFileName } from "../export/png";
import { exportUnityFile } from "../export/unity";
import { exportUmgFile } from "../export/umg";
import { exportSpecSheetFile } from "../export/spec";
import { Menu } from "./Menu";
import { IconButton } from "./Menu";

export function TopBar() {
  const rootName = useStore((s) => s.doc.root.name);
  const viewport = useStore((s) => s.viewport);
  const canUndo = useStore((s) => s.history.past.length > 0);
  const canRedo = useStore((s) => s.history.future.length > 0);
  const hasSelection = useStore((s) => s.selection.length > 0);
  const showRulers = useStore((s) => s.showRulers);
  const showGuides = useStore((s) => s.showGuides);
  const showSafeAreas = useStore((s) => s.showSafeAreas);
  const showGrid = useStore((s) => s.showGrid);
  const previewMode = useStore((s) => s.previewMode);
  const [name, setName] = useState(rootName);

  // Sincroniza el nombre local cuando cambia el proyecto (apertura, nuevo, …).
  useEffect(() => setName(rootName), [rootName]);

  const zoomCenter = () => {
    const vp = useStore.getState().viewport;
    return { x: vp.size.x / 2, y: vp.size.y / 2 };
  };

  const openProject = async () => {
    try {
      const doc = await openProjectFile();
      const st = useStore.getState();
      st.replaceDoc(doc);
      st.fitTo(nodeRect(doc.root));
      st.showToast("Proyecto abierto");
    } catch (err) {
      useStore.getState().showToast(err instanceof Error ? err.message : "No se pudo abrir el proyecto");
    }
  };

  const saveProject = () => {
    const st = useStore.getState();
    void saveProjectFile(st.doc);
    st.showToast("Proyecto .canvas guardado");
  };

  const exportHtmlFile = () => {
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
  };

  const exportPngAt = (scale: number) => {
    const st = useStore.getState();
    void exportPngFile(st.doc, scale).then(() => st.showToast(`PNG ${scale}x exportado`));
  };

  const exportBundleFile = () => {
    const st = useStore.getState();
    void exportBundle(st.doc).then((blob) => {
      downloadBlob(blob, `${projectFileName(st.doc)}-web.zip`);
      st.showToast("Paquete HTML + PNG exportado");
    });
  };

  const act = () => useStore.getState();

  return (
    <header className="topbar">
      <div className="topbar-brand" title="Canvas — editor visual offline">
        <svg width="22" height="22" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#7C5CFF" />
          <rect x="7" y="7" width="18" height="18" rx="3" fill="none" stroke="#fff" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="4" fill="#FF6B9D" />
        </svg>
        <span className="topbar-brand-name">Canvas</span>
      </div>

      <Menu
        label="Archivo"
        items={[
          { label: "Nuevo proyecto…", onClick: () => act().setNewProjectOpen(true) },
          { label: "Abrir proyecto…", shortcut: "⌘O", onClick: () => void openProject() },
          { label: "Guardar proyecto (.canvas)", shortcut: "⌘S", onClick: saveProject },
          { divider: true },
          { label: "Exportar HTML/CSS", onClick: exportHtmlFile },
          { label: "Exportar PNG 1x", onClick: () => exportPngAt(1) },
          { label: "Exportar PNG 2x", onClick: () => exportPngAt(2) },
          { label: "Exportar PNG 3x", onClick: () => exportPngAt(3) },
          { divider: true },
          { label: "Exportar paquete (HTML + PNG 1x/2x/3x)", onClick: exportBundleFile },
          { divider: true },
          {
            label: "Exportar Unity UI Toolkit (.uxml/.uss)",
            onClick: () => {
              exportUnityFile(useStore.getState().doc);
              useStore.getState().showToast("Unity UI Toolkit exportado");
            },
          },
          {
            label: "Exportar Unreal UMG (manifest + guía)",
            onClick: () => {
              exportUmgFile(useStore.getState().doc);
              useStore.getState().showToast("Unreal UMG exportado");
            },
          },
          { divider: true },
          {
            label: "Exportar spec sheet (modo Dev)",
            onClick: () => {
              exportSpecSheetFile(useStore.getState().doc);
              useStore.getState().showToast("Spec sheet exportado");
            },
          },
          { divider: true },
          { label: "Editor 100% offline · sin cuenta", disabled: true, onClick: () => {} },
        ]}
      />
      <Menu
        label="Edición"
        items={[
          { label: "Deshacer", shortcut: "⌘Z", onClick: () => act().undo(), disabled: !canUndo },
          { label: "Rehacer", shortcut: "⇧⌘Z", onClick: () => act().redo(), disabled: !canRedo },
          { divider: true },
          { label: "Duplicar", shortcut: "⌘D", onClick: () => act().duplicateSelection(), disabled: !hasSelection },
          { label: "Agrupar", shortcut: "⌘G", onClick: () => act().groupSelection("Grupo"), disabled: !hasSelection },
          { label: "Desagrupar", shortcut: "⇧⌘G", onClick: () => act().ungroupSelection(), disabled: !hasSelection },
          { divider: true },
          { label: "Copiar estilo", shortcut: "⇧⌘C", onClick: () => act().copyStyle(), disabled: !hasSelection },
          { label: "Pegar estilo", shortcut: "⇧⌘V", onClick: () => act().pasteStyle(), disabled: !hasSelection },
          { divider: true },
          { label: "Alinear izquierda", shortcut: "⌥A", onClick: () => act().alignSelection("left"), disabled: !hasSelection },
          { label: "Alinear centro H", shortcut: "⌥C", onClick: () => act().alignSelection("centerH"), disabled: !hasSelection },
          { label: "Alinear derecha", shortcut: "⌥D", onClick: () => act().alignSelection("right"), disabled: !hasSelection },
          { label: "Alinear arriba", shortcut: "⌥W", onClick: () => act().alignSelection("top"), disabled: !hasSelection },
          { label: "Alinear centro V", shortcut: "⌥M", onClick: () => act().alignSelection("centerV"), disabled: !hasSelection },
          { label: "Alinear abajo", shortcut: "⌥S", onClick: () => act().alignSelection("bottom"), disabled: !hasSelection },
          { divider: true },
          { label: "Distribuir horizontal", shortcut: "⌥⇧H", onClick: () => act().distributeSelection("h"), disabled: !hasSelection },
          { label: "Distribuir vertical", shortcut: "⌥⇧V", onClick: () => act().distributeSelection("v"), disabled: !hasSelection },
          { divider: true },
          { label: "Eliminar", shortcut: "Supr", danger: true, onClick: () => act().deleteSelection(), disabled: !hasSelection },
        ]}
      />
      <Menu
        label="Ver"
        items={[
          { label: "Reglas", checked: showRulers, onClick: () => act().toggle("showRulers") },
          { label: "Guías", checked: showGuides, onClick: () => act().toggle("showGuides") },
          { label: "Áreas seguras TV", checked: showSafeAreas, onClick: () => act().toggle("showSafeAreas") },
          { label: "Cuadrícula", checked: showGrid, onClick: () => act().toggle("showGrid") },
          { divider: true },
          { label: "Ajustar a pantalla", shortcut: "⇧1", onClick: () => act().fitTo(nodeRect(act().doc.root)) },
          { label: "Zoom 100%", shortcut: "⇧0", onClick: () => act().zoomTo(1, zoomCenter()) },
        ]}
      />

      <input
        className="project-name"
        value={name}
        spellCheck={false}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const st = useStore.getState();
          st.setNodeName(st.doc.root.id, name.trim() || "Proyecto sin título");
          setName(st.doc.root.name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />

      <div className="topbar-spacer" />

      <div className="zoom-controls">
        <IconButton
          title={previewMode ? "Salir del preview (Esc)" : "Probar la pantalla (preview)"}
          active={previewMode}
          onClick={() => {
            const st2 = useStore.getState();
            st2.setPreviewMode(!previewMode);
            if (previewMode) st2.setPlaying(false);
          }}
        >
          {previewMode ? <Square size={15} /> : <Play size={15} />}
        </IconButton>
        <IconButton title="Alejar" onClick={() => act().zoomBy(1 / 1.25, zoomCenter())}>
          <ZoomOut size={15} />
        </IconButton>
        <button className="zoom-pct" title="Zoom 100% (⇧0)" onClick={() => act().zoomTo(1, zoomCenter())}>
          {Math.round(viewport.zoom * 100)}%
        </button>
        <IconButton title="Acercar" onClick={() => act().zoomBy(1.25, zoomCenter())}>
          <ZoomIn size={15} />
        </IconButton>
        <IconButton title="Ajustar a pantalla (⇧1)" onClick={() => act().fitTo(nodeRect(act().doc.root))}>
          <Maximize size={15} />
        </IconButton>
        <IconButton title="Exportar HTML" onClick={exportHtmlFile}>
          <Download size={15} />
        </IconButton>
      </div>
    </header>
  );
}
