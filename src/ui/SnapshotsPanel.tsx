/**
 * SnapshotsPanel — Panel de snapshots: guarda y restaura versiones del diseño.
 * Acceso: Cmd+Shift+S para guardar, o desde este panel.
 */
import { useStore } from "../state/store";

export function SnapshotsPanel() {
  const snapshots = useStore((s) => s.snapshots);
  const open = useStore((s) => s.historyPanelOpen); // Reuse history panel toggle

  if (!open || snapshots.length === 0) return null;

  return (
    <div className="snapshots-panel">
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11, color: "var(--text-dim)" }}>
        📸 Snapshots
      </div>
      {snapshots.map((snap, i) => (
        <div key={i} className="snap-item">
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {snap.name}
          </span>
          <button onClick={() => useStore.getState().restoreSnapshot(i)}>
            Restaurar
          </button>
        </div>
      ))}
    </div>
  );
}
