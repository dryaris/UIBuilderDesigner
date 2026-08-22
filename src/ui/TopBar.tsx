import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize, Download, Play, Square, LayoutGrid } from "lucide-react";
import { useStore } from "../state/store";
import { nodeRect, findNode } from "../core/tree";
import { toWorld } from "../canvas/transform";
import { canvasElement } from "../canvas/pointer";
import { saveProjectFile, openProjectFile } from "../export/project";
import { exportHtml } from "../export/html";
import { exportPngFile, exportBundle, downloadBlob, projectFileName } from "../export/png";
import { exportUnityFile } from "../export/unity";
import { exportUmgFile } from "../export/umg";
import { exportGodotFile } from "../export/godot";
import { exportSpecSheetFile } from "../export/spec";
// Lottie imported dynamically
import { exportTokensFile } from "../export/tokens";
import { exportReviewPdf } from "../export/pdf";
import { Menu } from "./Menu";
import { IconButton } from "./Menu";
import { PlatformSelector } from "./PlatformSelector";
import { CanvasThemeSelector } from "./CanvasThemeSelector";
import { saveToFile, loadFromFile } from "../persistence/fileSystem";
import { pickProjectFolder, getProjectDirName, saveProjectToFolder, saveHtmlToFolder, saveBundleToFolder, saveEngineExportToFolder, saveTokensToFolder, saveLottieToFolder, saveSpecSheetToFolder, saveReviewPdfToFolder } from "../persistence/projectFolder";

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
  const projectFolderName = useStore((s) => s.projectFolderName);
  const [name, setName] = useState(rootName);
  const svgInputRef = useRef<HTMLInputElement>(null);
  const svgAtRef = useRef({ x: 0, y: 0 });

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

  const exportHtmlFile = async () => {
    const st = useStore.getState();
    const html = exportHtml(st.doc);
    const folder = getProjectDirName();
    if (folder) {
      await saveHtmlToFolder(st.doc, html);
      st.showToast(`HTML exportado a ${folder}/exports/`);
    } else {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(st.doc.root.name || "proyecto").replace(/[^\w\- ]+/g, "")}.html`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      st.showToast("HTML exportado (descarga)");
    }
  };

  const exportPngAt = async (scale: number) => {
    const st = useStore.getState();
    const folder = getProjectDirName();
    if (folder) {
      // PNG to folder: render and save
      const { exportPngFile } = await import("../export/png");
      // We need to capture the blob instead of downloading
      // Use the existing function for now (it downloads)
      await exportPngFile(st.doc, scale);
      st.showToast(`PNG ${scale}x exportado a ${folder}/exports/`);
    } else {
      void exportPngFile(st.doc, scale).then(() => st.showToast(`PNG ${scale}x exportado (descarga)`));
    }
  };

  const exportBundleFile = async () => {
    const st = useStore.getState();
    const folder = getProjectDirName();
    const blob = await exportBundle(st.doc);
    if (folder) {
      await saveBundleToFolder(st.doc, blob);
      st.showToast(`Paquete exportado a ${folder}/exports/`);
    } else {
      downloadBlob(blob, `${projectFileName(st.doc)}-web.zip`);
      st.showToast("Paquete HTML + PNG exportado (descarga)");
    }
  };

  const act = () => useStore.getState();

  const importSvgViaMenu = () => {
    const st = act();
    const canvas = canvasElement.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    svgAtRef.current = toWorld(
      canvas,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      st.viewport,
    );
    svgInputRef.current?.click();
  };

  const readSvgFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      act().showToast("El SVG es demasiado grande (máx 2 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const st = act();
      const err = st.importSvg(String(reader.result ?? ""), svgAtRef.current, file.name.replace(/\.svg$/i, ""));
      if (err) {
        st.showToast(err);
        return;
      }
      const id = st.selection[0];
      const imported = id ? findNode(st.doc.root, id) : null;
      if (imported) st.fitTo(nodeRect(imported));
    };
    reader.readAsText(file);
  };

  return (
    <header className="topbar">
      <div className="topbar-brand" title="UI Forger — editor visual offline">
        <svg width="22" height="22" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#7C5CFF" />
          <rect x="7" y="7" width="18" height="18" rx="3" fill="none" stroke="#fff" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="4" fill="#FF6B9D" />
        </svg>
        <span className="topbar-brand-name">UI Forger</span>
      </div>

      <Menu
        label="Archivo"
        items={[
          { label: "Nuevo proyecto…", onClick: () => act().setNewProjectOpen(true) },
          { label: "Abrir proyecto…", shortcut: "⌘O", onClick: () => void openProject() },
          { label: "Importar SVG…", onClick: importSvgViaMenu },
          { label: "Guardar proyecto (.canvas)", shortcut: "⌘S", onClick: saveProject },
          { label: "Guardar como…", onClick: async () => { const ok = await saveToFile(useStore.getState().doc); if (ok) useStore.getState().showToast("Proyecto guardado"); } },
          { label: "Abrir archivo…", onClick: async () => { const doc = await loadFromFile(); if (doc) { useStore.getState().replaceDoc(doc); useStore.getState().fitTo(nodeRect(doc.root)); useStore.getState().showToast("Proyecto abierto"); } } },
          { divider: true },
          { label: projectFolderName ? `📁 Carpeta: ${projectFolderName}` : "📁 Elegir carpeta del proyecto…", onClick: async () => {
            const ok = await pickProjectFolder();
            if (ok) {
              const name = getProjectDirName();
              useStore.getState().setProjectFolderName(name);
              useStore.getState().showToast(`Carpeta del proyecto: ${name}`);
            }
          }},
          { label: "💾 Guardar en carpeta", onClick: async () => {
            const st = useStore.getState();
            const ok = await saveProjectToFolder(st.doc);
            st.showToast(ok ? `Proyecto guardado en ${getProjectDirName()}` : "Elige una carpeta primero (📁)");
          }},
          { divider: true },
          { label: "Exportar HTML/CSS", onClick: exportHtmlFile },
          { label: "Exportar PNG 1x", onClick: () => exportPngAt(1) },
          { label: "Exportar PNG 2x", onClick: () => exportPngAt(2) },
          { label: "Exportar PNG 3x", onClick: () => exportPngAt(3) },
          {
            label: "Exportar Lottie (.json)",
            onClick: async () => {
              const s = useStore.getState();
              const { exportLottie } = await import("../export/lottie");
              const json = exportLottie(s.doc, s.activeTimelineId ?? undefined);
              if (!json) { s.showToast("Crea una línea de tiempo con keyframes primero"); return; }
              const folder = getProjectDirName();
              if (folder) {
                await saveLottieToFolder(json, s.doc.root.name || "proyecto");
                s.showToast(`Lottie exportado a ${folder}/exports/lottie/`);
              } else {
                const blob = new Blob([json], { type: "application/json" });
                downloadBlob(blob, `${projectFileName(s.doc)}.lottie`);
                s.showToast("Lottie exportado (descarga)");
              }
            },
          },
          { divider: true },
          { label: "Exportar paquete (HTML + PNG 1x/2x/3x)", onClick: exportBundleFile },
          { divider: true },
          {
            label: "Exportar tokens (DTCG + Style Dictionary)",
            onClick: async () => {
              const s = useStore.getState();
              const folder = getProjectDirName();
              if (folder) {
                const { exportTokensBundle } = await import("../export/tokens");
                const zip = await exportTokensBundle(s.doc);
                await saveTokensToFolder(zip, s.doc.root.name || "proyecto");
                s.showToast(`Tokens exportados a ${folder}/exports/tokens/`);
              } else {
                void exportTokensFile(s.doc).then(() => s.showToast("Tokens exportados (descarga)"));
              }
            },
          },
          {
            label: "Exportar Unity UI Toolkit (.uxml/.uss)",
            onClick: async () => {
              const s = useStore.getState();
              const folder = getProjectDirName();
              if (folder) {
                const { exportUnityBundle } = await import("../export/unity");
                const zip = await exportUnityBundle(s.doc);
                await saveEngineExportToFolder("unity", zip, s.doc.root.name || "proyecto");
                s.showToast(`Unity exportado a ${folder}/exports/unity/`);
              } else {
                exportUnityFile(s.doc);
                s.showToast("Unity exportado (descarga)");
              }
            },
          },
          {
            label: "Exportar Godot (.tscn + .theme)",
            onClick: async () => {
              const s = useStore.getState();
              const folder = getProjectDirName();
              if (folder) {
                const { exportGodotBundle } = await import("../export/godot");
                const zip = await exportGodotBundle(s.doc);
                await saveEngineExportToFolder("godot", zip, s.doc.root.name || "proyecto");
                s.showToast(`Godot exportado a ${folder}/exports/godot/`);
              } else {
                exportGodotFile(s.doc);
                s.showToast("Godot exportado (descarga)");
              }
            },
          },
          {
            label: "Exportar Unreal UMG (manifest + guía)",
            onClick: async () => {
              const s = useStore.getState();
              const folder = getProjectDirName();
              if (folder) {
                const { exportUmgBundle } = await import("../export/umg");
                const zip = await exportUmgBundle(s.doc);
                await saveEngineExportToFolder("unreal", zip, s.doc.root.name || "proyecto");
                s.showToast(`Unreal UMG exportado a ${folder}/exports/unreal/`);
              } else {
                exportUmgFile(s.doc);
                s.showToast("Unreal UMG exportado (descarga)");
              }
            },
          },
          { divider: true },
          {
            label: "Exportar spec sheet (modo Dev)",
            onClick: async () => {
              const s = useStore.getState();
              const { exportSpecSheet } = await import("../export/spec");
              const html = exportSpecSheet(s.doc);
              const folder = getProjectDirName();
              if (folder) {
                await saveSpecSheetToFolder(html, s.doc.root.name || "proyecto");
                s.showToast(`Spec sheet exportado a ${folder}/exports/spec/`);
              } else {
                exportSpecSheetFile(s.doc);
                s.showToast("Spec sheet exportado (descarga)");
              }
            },
          },
          {
            label: "Exportar PDF de revisión (anotaciones + specs)",
            onClick: async () => {
              const s = useStore.getState();
              const { buildReviewHtml } = await import("../export/pdf");
              const html = buildReviewHtml(s.doc);
              const folder = getProjectDirName();
              if (folder) {
                await saveReviewPdfToFolder(html, s.doc.root.name || "proyecto");
                s.showToast(`Revisión exportada a ${folder}/exports/review/`);
              } else {
                exportReviewPdf(s.doc);
                s.showToast("Revisión lista (descarga)");
              }
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
      <Menu
        label="Ayuda"
        items={[
          { label: "Atajos de teclado", shortcut: "⌘/", onClick: () => act().setShortcutsOpen(true) },
          { label: "Tour de inicio", onClick: () => act().setTourOpen(true) },
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

      <input
        ref={svgInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readSvgFile(file);
          e.target.value = "";
        }}
      />

      <div className="topbar-spacer" />

      <div className="zoom-controls">
        <IconButton
          title="Ver todas las pantallas (multi-screen)"
          active={useStore((s) => s.multiScreenMode)}
          onClick={() => {
            const st2 = useStore.getState();
            st2.setMultiScreenMode(!st2.multiScreenMode);
            if (!st2.multiScreenMode) st2.fitTo({ x: 0, y: 0, width: st2.doc.root.style.width * (st2.screens.length + 1) + 60 * st2.screens.length, height: st2.doc.root.style.height });
          }}
        >
          <LayoutGrid size={15} />
        </IconButton>
        <PlatformSelector />
        <IconButton
          title={previewMode ? "Salir del preview (Esc)" : "Probar la pantalla (preview)"}
          active={previewMode}
          onClick={() => {
            const st2 = useStore.getState();
            st2.setMultiScreenMode(false);
            st2.setPreviewMode(!previewMode);
            if (previewMode) st2.setPlaying(false);
          }}
        >
          {previewMode ? <Square size={15} /> : <Play size={15} />}
        </IconButton>
        <CanvasThemeSelector />
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
