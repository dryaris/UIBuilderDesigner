/**
 * Editor — ensambla todas las piezas de la Fase 1.
 * Boot: restaura el autosave si existe; si no, abre el modal de nuevo proyecto.
 */
import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { subscribeAutosave, loadAutosave, hasSeenWelcome, markWelcomeSeen, hasSeenTour, loadTheme } from "../persistence/persistence";
import { useKeyboard } from "../shortcuts/keys";
import { Canvas } from "../canvas/Canvas";
import { Rulers } from "../canvas/Rulers";
import { Toolbar } from "../ui/Toolbar";
import { TopBar } from "../ui/TopBar";
import { StatusBar } from "../ui/StatusBar";
import { Inspector } from "../ui/Inspector";
import { DesignPanel } from "../ui/DesignPanel";
import { TimelinePanel } from "../ui/TimelinePanel";
import { PrototypePanel } from "../ui/PrototypePanel";
import { useTimelinePlayer } from "../preview/player";
import { Layers } from "../ui/Layers";
import { Palette } from "../ui/Palette";
import { NewProjectModal } from "../ui/NewProjectModal";
import { ShortcutsModal } from "../ui/ShortcutsModal";
import { Tour } from "../ui/Tour";
import { ContextMenu, type ContextMenuState } from "../ui/ContextMenu";
import { HistoryPanel } from "../ui/HistoryPanel";

export function Editor() {
  const [booted, setBooted] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const toast = useStore((s) => s.toast);
  const rightTab = useStore((s) => s.rightTab);
  const setRightTab = useStore((s) => s.setRightTab);

  useKeyboard();
  useTimelinePlayer();

  // Boot: tema guardado, autosave y primer arranque.
  useEffect(() => {
    document.documentElement.dataset.theme = loadTheme();
    const saved = loadAutosave();
    if (saved) {
      useStore.getState().replaceDoc(saved);
      useStore.getState().showToast("Autosave restaurado");
    } else if (!hasSeenWelcome()) {
      useStore.getState().setNewProjectOpen(true);
    }
    markWelcomeSeen();
    // Onboarding: el tour se muestra la primera vez (reabrible desde Ayuda).
    if (!hasSeenTour()) {
      useStore.getState().setTourOpen(true);
    }
    setBooted(true);
  }, []);

  // Autosave con debounce de 3s.
  useEffect(() => subscribeAutosave(), []);

  if (!booted) return null;

  return (
    <div className="editor">
      <TopBar />
      <div className="editor-main">
        <Toolbar />
        <Layers />
        <div className="canvas-wrap">
          <Rulers />
          <Canvas openContextMenu={setCtxMenu} />
        </div>
        <div className="right-side">
          <div className="right-tabs">
            <button
              className={`right-tab${rightTab === "inspector" ? " is-active" : ""}`}
              onClick={() => setRightTab("inspector")}
            >
              Inspector
            </button>
            <button
              className={`right-tab${rightTab === "design" ? " is-active" : ""}`}
              onClick={() => setRightTab("design")}
            >
              Diseño
            </button>
            <button
              className={`right-tab${rightTab === "animate" ? " is-active" : ""}`}
              onClick={() => setRightTab("animate")}
            >
              Animar
            </button>
            <button
              className={`right-tab${rightTab === "prototype" ? " is-active" : ""}`}
              onClick={() => setRightTab("prototype")}
            >
              Prototipo
            </button>
          </div>
          {rightTab === "inspector" ? (
            <Inspector />
          ) : rightTab === "design" ? (
            <DesignPanel />
          ) : rightTab === "animate" ? (
            <TimelinePanel />
          ) : (
            <PrototypePanel />
          )}
        </div>
      </div>
      <StatusBar />
      <Palette />
      <NewProjectModal />
      <ShortcutsModal />
      <Tour />
      <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />
      <HistoryPanel />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
