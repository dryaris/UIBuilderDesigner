/**
 * Tour — onboarding de primera vez (Fase 8).
 *
 * Cuatro pasos breves que llevan la vista por las zonas del editor
 * (herramientas, lienzo, paneles, exportación) con un spot pulsante sobre
 * cada zona y una tarjeta con texto, indicador de paso y controles.
 * Se muestra solo la primera vez (flag en localStorage) y se puede reabrir
 * desde el menú Ayuda.
 */
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useStore } from "../state/store";
import { markTourSeen } from "../persistence/persistence";

interface Step {
  /** Clase CSS del spot (zona del editor que se ilumina). */
  spot: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    spot: "tour-spot-canvas",
    title: "El lienzo es tu pantalla",
    body: "Arrastra para mover, arrastra los tiradores para redimensionar, doble clic en un texto para reescribirlo y en cualquier nodo para abrir su color. Todo se ajusta a píxeles exactos.",
  },
  {
    spot: "tour-spot-toolbar",
    title: "Herramientas y atajos",
    body: "V, F, T, R, O, L, H, Z cambian de herramienta. Espacio panea, ⌘/Ctrl + scroll acerca, flechas mueven 1 px y ⇧+flechas 10 px.",
  },
  {
    spot: "tour-spot-panels",
    title: "Estilos, tokens y animación",
    body: "Inspector edita el nodo seleccionado; Diseño guarda colores, tipografías y componentes reutilizables; Animar crea líneas de tiempo y Prototipo une pantallas con conexiones.",
  },
  {
    spot: "tour-spot-topbar",
    title: "Exporta a cualquier destino",
    body: "Desde Archivo (o ⌘K) exporta a HTML/CSS, PNG 1x/2x/3x, Unity UI Toolkit, Unreal UMG y spec sheets para el equipo de desarrollo.",
  },
];

export function Tour() {
  const open = useStore((s) => s.tourOpen);
  const setOpen = useStore((s) => s.setTourOpen);
  const [step, setStep] = useState(0);
  if (!open) return null;

  const close = () => {
    markTourSeen();
    setOpen(false);
  };
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="tour-overlay" onPointerDown={close}>
      <div className={`tour-spot ${current.spot}`} />
      <div className="tour-card" onPointerDown={(e) => e.stopPropagation()}>
        <div className="tour-card-head">
          <span className="tour-icon">
            <Sparkles size={14} />
          </span>
          <span className="tour-title">{current.title}</span>
          <button className="icon-btn" onClick={close} title="Saltar el tour (Esc)">
            <X size={14} />
          </button>
        </div>
        <p className="tour-body">{current.body}</p>
        <div className="tour-foot">
          <div className="tour-dots">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`tour-dot${i === step ? " is-active" : ""}`}
                onClick={() => setStep(i)}
                aria-label={`Paso ${i + 1}`}
              />
            ))}
          </div>
          <div className="tour-actions">
            {!last ? (
              <>
                <button className="mini-btn" onClick={close}>
                  Saltar
                </button>
                <button className="mini-btn is-primary" onClick={() => setStep(step + 1)}>
                  Siguiente
                </button>
              </>
            ) : (
              <button className="mini-btn is-primary" onClick={close}>
                ¡A diseñar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
