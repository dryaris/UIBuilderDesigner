/**
 * CommentsThread — Hilo de comentarios en nodos (estilo Figma).
 * Los comentarios se almacenan en el IR como anotaciones con threading.
 */
import { useStore } from "../state/store";

export function CommentsThread() {
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId);
  const annotations = useStore((s) => s.doc.annotations ?? []);

  if (!selectedAnnotationId) return null;

  const annotation = annotations.find((a) => a.id === selectedAnnotationId);
  if (!annotation) return null;

  return (
    <div
      className="comment-thread"
      style={{
        position: "fixed",
        top: 100,
        right: 320,
        width: 260,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}>
        💬 Comentario #{annotations.indexOf(annotation) + 1}
      </div>
      <div
        style={{
          padding: "6px 8px",
          background: "var(--bg-card)",
          borderRadius: 4,
          marginBottom: 6,
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {annotation.text || "(sin texto)"}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <button
          onClick={() => {
            useStore.getState().updateAnnotation(annotation.id, { resolved: !annotation.resolved });
          }}
          style={{
            flex: 1,
            padding: "3px 6px",
            fontSize: 10,
            background: annotation.resolved ? "#4ade8022" : "var(--bg-input)",
            color: annotation.resolved ? "#4ade80" : "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            cursor: "pointer",
          }}
        >
          {annotation.resolved ? "✓ Resuelto" : "Marcar resuelto"}
        </button>
        <button
          onClick={() => {
            useStore.getState().removeAnnotation(annotation.id);
            useStore.getState().setSelectedAnnotationId(null);
          }}
          style={{
            padding: "3px 6px",
            fontSize: 10,
            background: "none",
            color: "#f44",
            border: "1px solid var(--border)",
            borderRadius: 3,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      <textarea
        className="comment-input"
        value={annotation.text}
        onChange={(e) => {
          useStore.getState().updateAnnotation(annotation.id, { text: e.target.value });
        }}
        placeholder="Escribe un comentario..."
      />
    </div>
  );
}
