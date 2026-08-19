/**
 * SearchPanel — búsqueda global de nodos (Cmd/Ctrl+F).
 * Lista todas las pantallas + nodos que coinciden con la query; al seleccionar
 * uno, hace switch a su pantalla y lo selecciona en el lienzo.
 */
import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useStore } from "../state/store";
import { nodeRect } from "../core/tree";
import type { Node } from "../core/ir";

interface SearchResult {
  screenId: string;
  screenName: string;
  node: Node;
}

function collectNodes(
  root: Node,
  screenId: string,
  screenName: string,
  query: string,
  results: SearchResult[],
  depth = 0,
) {
  if (root.name.toLowerCase().includes(query) || (root.text ?? "").toLowerCase().includes(query)) {
    results.push({ screenId, screenName, node: root });
  }
  for (const child of root.children) {
    collectNodes(child, screenId, screenName, query, results, depth + 1);
  }
}

export function SearchPanel() {
  const open = useStore((s) => s.searchOpen);
  const setOpen = useStore((s) => s.setSearchOpen);
  const doc = useStore((s) => s.doc);
  const screens = useStore((s) => s.screens);
  const select = useStore((s) => s.select);
  const switchScreen = useStore((s) => s.switchScreen);
  const fitTo = useStore((s) => s.fitTo);

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const results: SearchResult[] = [];
  if (q.length > 0) {
    collectNodes(doc.root, doc.root.id, doc.root.name, q, results);
    for (const sc of screens) {
      collectNodes(sc, sc.id, sc.name, q, results);
    }
  }

  function goTo(result: SearchResult) {
    if (result.screenId !== doc.root.id) {
      switchScreen(result.screenId);
    }
    setTimeout(() => {
      select([result.node.id]);
      fitTo(nodeRect(result.node));
    }, 60);
    setOpen(false);
  }

  return (
    <div className="search-panel">
      <div className="search-panel-inner">
        <Search size={14} className="search-icon" />
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Buscar nodo por nombre…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && results[activeIdx]) goTo(results[activeIdx]);
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <button className="icon-btn" onClick={() => setOpen(false)}><X size={14} /></button>
      </div>
      {q.length > 0 && (
        <div className="search-results">
          {results.length === 0 && <div className="search-empty dim">Sin resultados</div>}
          {results.map((r, i) => (
            <button
              key={`${r.screenId}-${r.node.id}`}
              className={`search-result${i === activeIdx ? " is-active" : ""}`}
              onClick={() => goTo(r)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="search-result-name">{r.node.name}</span>
              <span className="search-result-screen dim">{r.screenName}{r.node.type !== "frame" ? ` › ${r.node.type}` : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
