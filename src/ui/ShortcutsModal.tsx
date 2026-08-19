/**
 * ShortcutsModal — referencia rápida de atajos (Fase 8).
 * Abierto desde el menú Ayuda (o ⌘/). La tabla completa vive en el README;
 * aquí se muestra la memoria muscular esencial, agrupada por área.
 */
import { useState } from "react";
import { Keyboard, X, Search } from "lucide-react";
import { useStore } from "../state/store";

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Herramientas",
    rows: [
      ["V · F · T · R · O · L · P", "Select · Frame · Text · Rect · Elipse · Línea · Trazo (Pen)"],
      ["H · Z · I", "Mano (pan) · Zoom (marquee) · Eyedropper"],
      ["Espacio (mantenido)", "Pan temporal"],
      ["⌘ / Ctrl + scroll", "Zoom al cursor"],
    ],
  },
  {
    title: "Selección y edición",
    rows: [
      ["Flechas / ⇧ + flechas", "Nudge 1 px / 10 px"],
      ["⌘D", "Duplicar (con offset del último nudge)"],
      ["⌘G / ⇧⌘G", "Agrupar / desagrupar"],
      ["[ / ]", "Mover capa atrás / adelante"],
      ["⌘L", "Bloquear / desbloquear nodo"],
      ["⌘⇧H / ⌘⇧J", "Voltear horizontal / vertical"],
      ["Doble clic", "Editar texto · color picker del relleno"],
      ["Supr", "Eliminar selección"],
    ],
  },
  {
    title: "Diseño",
    rows: [
      ["⌥A / ⌥D / ⌥W / ⌥S", "Alinear izquierda / derecha / arriba / abajo"],
      ["⌥C / ⌥M", "Centrar horizontal / vertical"],
      ["⌥⇧H / ⌥⇧V", "Distribuir horizontal / vertical"],
      ["⇧⌘C / ⇧⌘V", "Copiar / pegar estilo"],
    ],
  },
  {
    title: "Documento",
    rows: [
      ["⌘Z / ⇧⌘Z", "Deshacer / rehacer"],
      ["⌘H", "Panel de historial (undo/redo visible)"],
      ["⌘1 / ⌘2", "Zoom a pantalla / Zoom a selección"],
      ["⌘Y", "Modo outline (solo bordes, wireframe)"],
      ["⌘F", "Búsqueda global de nodos"],
      ["⌘↵", "Modo presentación (fullscreen sin UI)"],
      ["⌘S / ⌘O", "Guardar / abrir proyecto (.canvas)"],
      ["⌘K", "Palette de acciones"],
      ["⇧1 / ⇧0", "Ajustar a pantalla / zoom 100%"],
      ["Esc", "Salir del preview, deseleccionar, cerrar palettes"],
    ],
  },
];

export function ShortcutsModal() {
  const open = useStore((s) => s.shortcutsOpen);
  const setOpen = useStore((s) => s.setShortcutsOpen);
  const [filter, setFilter] = useState("");
  if (!open) return null;

  const q = filter.toLowerCase();
  const filtered = q
    ? GROUPS.map((g) => ({
        ...g,
        rows: g.rows.filter(
          ([keys, desc]) =>
            keys.toLowerCase().includes(q) || desc.toLowerCase().includes(q),
        ),
      })).filter((g) => g.rows.length > 0)
    : GROUPS;

  return (
    <div className="modal-overlay" onPointerDown={() => setOpen(false)}>
      <div className="modal shortcuts-modal" onPointerDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>
              <Keyboard size={16} /> Atajos de teclado
            </h2>
            <p className="dim">Memoria muscular de Figma, lista para usar.</p>
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="shortcuts-search">
          <Search size={14} />
          <input
            autoFocus
            placeholder="Buscar atajo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="shortcuts-grid">
          {filtered.map((g) => (
            <div key={g.title} className="shortcuts-group">
              <h3>{g.title}</h3>
              {g.rows.map(([keys, desc]) => (
                <div key={keys} className="shortcut-row">
                  <span className="shortcut-keys mono">{keys}</span>
                  <span className="shortcut-desc dim">{desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="modal-foot dim">
          <span>Todo se guarda localmente · sin cuenta · 100% offline</span>
        </div>
      </div>
    </div>
  );
}
