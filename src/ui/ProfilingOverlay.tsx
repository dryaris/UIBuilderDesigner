/**
 * ProfilingOverlay — Muestra métricas de rendimiento estimadas para la UI de juego:
 * - Número total de nodos
 * - Nodos con sombras (draw calls estimados)
 * - Nodos con gradientes (fill rate estimado)
 * - Nodo más profundo (depth)
 * - Estimación de texturas
 */
import { memo, useMemo } from "react";
import { useStore } from "../state/store";
import type { Node } from "../core/ir";

interface ProfileMetrics {
  totalNodes: number;
  leafNodes: number;
  maxDepth: number;
  shadowCount: number;
  gradientCount: number;
  opacityCount: number;
  blurCount: number;
  textNodes: number;
  imageNodes: number;
  vectorNodes: number;
  estimatedDrawCalls: number;
  estimatedFillRate: string;
}

function analyzeNode(node: Node, depth: number, metrics: ProfileMetrics): void {
  metrics.totalNodes++;
  if (depth > metrics.maxDepth) metrics.maxDepth = depth;

  if (node.type === "text") metrics.textNodes++;
  if (node.type === "image") metrics.imageNodes++;
  if (node.type === "vector") metrics.vectorNodes++;
  if (node.style.boxShadow) metrics.shadowCount++;
  if (node.style.gradient) metrics.gradientCount++;
  if (node.style.opacity !== undefined && node.style.opacity < 1) metrics.opacityCount++;
  if (node.style.filters?.blur) metrics.blurCount++;

  if (node.children.length === 0) {
    metrics.leafNodes++;
  } else {
    for (const child of node.children) {
      if (!child.hidden) analyzeNode(child, depth + 1, metrics);
    }
  }
}

function computeMetrics(root: Node): ProfileMetrics {
  const metrics: ProfileMetrics = {
    totalNodes: 0,
    leafNodes: 0,
    maxDepth: 0,
    shadowCount: 0,
    gradientCount: 0,
    opacityCount: 0,
    blurCount: 0,
    textNodes: 0,
    imageNodes: 0,
    vectorNodes: 0,
    estimatedDrawCalls: 0,
    estimatedFillRate: "",
  };

  analyzeNode(root, 0, metrics);

  // Estimación de draw calls: cada nodo con sombra, gradiente o blend mode = +1 draw call.
  // Cada imagen = +1 draw call (textura).
  // Cada nodo con opacity < 1 necesita un buffer offscreen.
  metrics.estimatedDrawCalls =
    metrics.leafNodes +
    metrics.shadowCount +
    metrics.gradientCount +
    metrics.imageNodes +
    metrics.opacityCount;

  // Estimación de fill rate: área total pintada / área de pantalla.
  const screenArea = root.style.width * root.style.height;
  let fillArea = 0;
  function estimateFill(n: Node) {
    if (n.hidden) return;
    const area = n.style.width * n.style.height;
    if (n.style.backgroundColor || n.style.gradient || n.style.boxShadow) {
      fillArea += area;
    }
    for (const c of n.children) estimateFill(c);
  }
  estimateFill(root);
  const ratio = screenArea > 0 ? fillArea / screenArea : 0;
  metrics.estimatedFillRate = `${ratio.toFixed(1)}x`;

  return metrics;
}

export const ProfilingOverlay = memo(function ProfilingOverlay() {
  const root = useStore((s) => s.doc.root);
  const metrics = useMemo(() => computeMetrics(root), [root]);

  const grade =
    metrics.estimatedDrawCalls < 50
      ? { label: "🟢 Excelente", color: "#4ade80" }
      : metrics.estimatedDrawCalls < 150
        ? { label: "🟡 Bueno", color: "#facc15" }
        : { label: "🔴 Pesado", color: "#f87171" };

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(0,0,0,0.85)",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 11,
        color: "#e0e0e0",
        fontFamily: "monospace",
        lineHeight: 1.6,
        zIndex: 100,
        minWidth: 200,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, color: grade.color }}>{grade.label}</div>
      <Row label="Nodos" value={`${metrics.totalNodes} (${metrics.leafNodes} hojas)`} />
      <Row label="Profundidad" value={`${metrics.maxDepth} niveles`} />
      <Row label="Draw calls est." value={String(metrics.estimatedDrawCalls)} />
      <Row label="Fill rate est." value={metrics.estimatedFillRate} />
      <Row label="Sombras" value={String(metrics.shadowCount)} />
      <Row label="Gradientes" value={String(metrics.gradientCount)} />
      <Row label="Blur" value={String(metrics.blurCount)} />
      <Row label="Textos" value={String(metrics.textNodes)} />
      <Row label="Imágenes" value={String(metrics.imageNodes)} />
      <Row label="Vectores" value={String(metrics.vectorNodes)} />
    </div>
  );
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#999" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
