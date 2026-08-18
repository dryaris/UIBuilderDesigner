/**
 * EasingEditor.tsx — Editor visual de curvas de easing (Fase 8).
 *
 * Sustituye el campo de texto técnico por una gráfica arrastrable: cada easing
 * token es una curva con dos puntos de control; se arrastran con el ratón y el
 * valor se escribe como "cubic-bezier(x1, y1, x2, y2)" (el mismo contrato que
 * usan el canvas, el preview, HTML y Lottie). Presets de un clic + demo animada
 * para que el diseñador SIENTA la curva, sin leer números.
 *
 * El arrastre es una sesión local (como el drag del lienzo): la curva se
 * actualiza en vivo en el componente y se commitea al token una sola vez al
 * soltar → una entrada de undo por gesto.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Play, Pause } from "lucide-react";
import {
  clampCubicBezier,
  cubicBezierPath,
  cubicBezierPoint,
  EASING_PRESETS,
  EASING_Y_MAX,
  formatCubicBezier,
  parseCubicBezier,
  type CubicBezier,
} from "../core/bezier";

const S = 100;
const SPAN = EASING_Y_MAX - -0.5; // 2.0 — rango visible de Y (admite resorte)

/** Y de curva → Y de pantalla (viewBox 0..100, invertida). */
const sy = (y: number) => ((EASING_Y_MAX - y) / SPAN) * S;

interface Props {
  name: string;
  value: string;
  onCommit: (value: string) => void;
}

export function EasingEditor({ name, value, onCommit }: Props) {
  const parsed = parseCubicBezier(value) ?? { x1: 0.4, y1: 0, x2: 0.2, y2: 1 };
  const [draft, setDraft] = useState<CubicBezier | null>(null);
  const [demo, setDemo] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const liveRef = useRef<CubicBezier>(parsed); // curva viva durante el gesto

  const curve = draft ?? parsed;
  liveRef.current = curve;

  // Demo animada: la bolita cruza la gráfica; su altura sigue la curva.
  useEffect(() => {
    if (!demo) return;
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / 1100);
      const p = cubicBezierPoint(liveRef.current, t);
      if (dotRef.current) {
        dotRef.current.setAttribute("cx", String(p.x));
        dotRef.current.setAttribute("cy", String(p.y));
      }
      if (t < 1) raf = requestAnimationFrame(step);
      else setDemo(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  const startDrag = (handle: 1 | 2) => (e: ReactPointerEvent<SVGCircleElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);

    const apply = (ev: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const px = Math.min(S, Math.max(0, ((ev.clientX - rect.left) / rect.width) * S));
      const yFromScreen = EASING_Y_MAX - ((ev.clientY - rect.top) / rect.height) * SPAN;
      const next: CubicBezier = { ...liveRef.current };
      if (handle === 1) {
        next.x1 = px / S;
        next.y1 = yFromScreen;
      } else {
        next.x2 = px / S;
        next.y2 = yFromScreen;
      }
      const clamped = clampCubicBezier(next);
      liveRef.current = clamped;
      setDraft(clamped);
    };
    const up = (ev: PointerEvent) => {
      apply(ev);
      svg.releasePointerCapture(e.pointerId);
      svg.removeEventListener("pointermove", apply);
      svg.removeEventListener("pointerup", up);
      const finalCurve = liveRef.current;
      setDraft(null);
      onCommit(formatCubicBezier(finalCurve));
    };
    svg.addEventListener("pointermove", apply);
    svg.addEventListener("pointerup", up);
  };

  const choosePreset = (c: CubicBezier) => {
    setDraft(null);
    onCommit(formatCubicBezier(clampCubicBezier(c)));
  };

  const d = cubicBezierPath(curve);
  const P1 = { x: curve.x1 * S, y: sy(curve.y1) };
  const P2 = { x: curve.x2 * S, y: sy(curve.y2) };
  const A = { x: 0, y: sy(0) };
  const B = { x: S, y: sy(1) };

  return (
    <div className="easing-editor">
      <svg ref={svgRef} viewBox={`0 0 ${S} ${S}`} className="easing-graph" onPointerDown={() => setDemo(false)}>
        {/* Cuadrícula */}
        {[0, 25, 50, 75, 100].map((v) => (
          <line key={`v${v}`} x1={v} y1={0} x2={v} y2={S} className="easing-grid" />
        ))}
        {[0, 25, 50, 75, 100].map((v) => (
          <line key={`h${v}`} x1={0} y1={v} x2={S} y2={v} className="easing-grid" />
        ))}
        {/* Guías y=0 e y=1 */}
        <line x1={0} y1={A.y} x2={S} y2={A.y} className="easing-guide" />
        <line x1={0} y1={B.y} x2={S} y2={B.y} className="easing-guide" />
        {/* Referencia lineal */}
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} className="easing-diag" />
        {/* Líneas de control */}
        <line x1={A.x} y1={A.y} x2={P1.x} y2={P1.y} className="easing-control" />
        <line x1={B.x} y1={B.y} x2={P2.x} y2={P2.y} className="easing-control" />
        {/* La curva */}
        <path d={d} className="easing-curve" />
        {/* Demo */}
        <circle ref={dotRef} r={5.5} className="easing-dot" style={{ opacity: demo ? 1 : 0 }} />
        {/* Handles */}
        <circle cx={P1.x} cy={P1.y} r={7} className="easing-handle" onPointerDown={startDrag(1)} />
        <circle cx={P2.x} cy={P2.y} r={7} className="easing-handle" onPointerDown={startDrag(2)} />
      </svg>

      <div className="easing-presets">
        {EASING_PRESETS.map((p) => {
          const c = p.curve;
          const active =
            Math.abs(curve.x1 - c.x1) < 0.001 &&
            Math.abs(curve.y1 - c.y1) < 0.001 &&
            Math.abs(curve.x2 - c.x2) < 0.001 &&
            Math.abs(curve.y2 - c.y2) < 0.001;
          return (
            <button
              key={p.name}
              className={`easing-chip${active ? " is-active" : ""}`}
              title={p.desc}
              onClick={() => choosePreset(c)}
            >
              {p.label}
            </button>
          );
        })}
        <button
          className={`easing-chip demo${demo ? " is-active" : ""}`}
          title="Ver la curva en movimiento"
          onClick={() => setDemo((v) => !v)}
        >
          {demo ? <Pause size={10} /> : <Play size={10} />} {demo ? "Parar" : "Probar"}
        </button>
      </div>
      <div className="easing-value mono dim">${name}</div>
    </div>
  );
}
