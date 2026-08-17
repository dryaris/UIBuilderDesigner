/**
 * Editor — ensambla todas las piezas de la Fase 1.
 * Boot: restaura el autosave si existe; si no, abre el modal de nuevo proyecto.
 */
import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { subscribeAutosave, loadAutosave, hasSeenWelcome, markWelcomeSeen, loadTheme } from "../persistence/persistence";
import { useKeyboard } from "../shortcuts/keys";
import { Canvas } from "../canvas/Canvas";
import { Rulers } from "../canvas/Rulers";
import { Toolbar } from "../ui/Toolbar";
import { TopBar } from "../ui/TopBar";
import { StatusBar } from "../ui/StatusBar";
import { Inspector } from "../ui/Inspector";
import { Layers } from "../ui/Layers";
import { Palette } from "../ui/Palette";
import { NewProjectModal } from "../ui/NewProjectModal";
import { ContextMenu, type ContextMenuState } from "../ui/ContextMenu";

export function Editor() {
  const [booted, setBooted] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const toast = useStore((s) => s.toast);

  useKeyboard();

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
        <Inspector />
      </div>
      <StatusBar />
      <Palette />
      <NewProjectModal />
      <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
