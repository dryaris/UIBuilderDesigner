# Pauta de prueba — Canvas

Guion de validación con diseñadores reales. Objetivo: comprobar la **regla de los 10 minutos** (una pantalla de menú de juego bonita y animada en los primeros 10 minutos de uso) y la calidad de los **entregables por destino**.

## Cómo usar esta pauta

- Sesión individual (30–40 min), con el diseñador **solo** ante la app (no se le guía: se observa).
- Anotar dónde duda, dónde busca un atajo que no existe y qué hace en lugar de preguntar.
- Marcar cada ítem como ✅ (sin fricción) / ⚠️ (duda puntual) / ❌ (bloqueo).
- El umbral de aprobación de la fase: **ningún ❌ y menos de 3 ⚠️** en el recorrido de 10 minutos.

---

## A. Regla de los 10 minutos (recorrido cronometrado)

### A1. Primeros 3 minutos — arrancar y orientarse
- [ ] Abre la app: ¿el tour de primera vez la orienta o molesta?
- [ ] Crea un proyecto nuevo (o usa el starter "Menú de juego").
- [ ] Sin ayuda, identifica qué es cada zona del editor (capas, lienzo, inspector).

### A2. Minutos 3–6 — editar la pantalla de ejemplo
- [ ] **Selecciona** el título con un clic (¿se selecciona el texto y no el frame?).
- [ ] **Doble clic** para reescribir el texto de memoria.
- [ ] **Mueve** un botón con el ratón: ¿se pega a enteros? ¿aparecen las **guías de snap** y las **medidas de distancia**?
- [ ] **Redimensiona** el banner desde un handle.
- [ ] `⌘D` para **duplicar** un botón y `flechas` para nudge de 1 px; `Shift+flechas` 10 px.
- [ ] **Centra** un elemento con `Alt+C` (o el menú de alineación).
- [ ] Cambia el **color** de un botón desde el Inspector: picker + chips de tokens.
- [ ] Marca el color como **token** ("+ Guardar como token") y aplícalo a otro nodo.

### A3. Minutos 6–9 — darle vida
- [ ] Pestaña **Animar**: crea una línea de tiempo y **captura keyframes** (título que entra, botón que se ilumina).
- [ ] Cambia la **curva** de easing desde el panel Diseño: presets de un clic, y arrastra los puntos de control. ¿El botón **Probar** la ayuda a elegir?
- [ ] Pulsa **▶** y reproduce: ¿se ve la animación con el ritmo elegido?

### A4. Minuto 10 — el resultado
- [ ] ¿La pantalla final es **bonita** y se parece a un menú de juego de verdad?
- [ ] ¿El flujo total requirió ≤ 10 min **sin ayuda**?
- [ ] ¿Qué fue lo último que buscó y no encontró? (registrar como backlog)

### A5. Extras rápidos (si hay tiempo)
- [ ] **Auto-layout**: activa "apilar y distribuir hijos" en un frame y reordena hijos con las flechas del panel Capas.
- [ ] **Responsive**: selecciona un hijo, elige "Fijo a la derecha / Estirar" en la sección Responsive y redimensiona la pantalla con "Redimensionar a": el hijo debe reaccionar.
- [ ] **Importa un SVG** arrastrándolo al lienzo: debe quedar seleccionado y editable.
- [ ] **Anota**: modo anotar → pin → nota; marca una resuelta.

---

## B. Criterios de exportación por destino

Para cada destino: exportar la misma pantalla animada y comprobar los criterios.

### B1. HTML/CSS/JS
- [ ] El `.html` se abre en cualquier navegador sin servidor.
- [ ] La pantalla **escala al viewport** (preview de Figma) y se ve idéntica al editor (WYSIWYG).
- [ ] Los **estados hover/pressed** funcionan al pasar/ mantener el ratón.
- [ ] Las **animaciones** se reproducen al cargar.
- [ ] El **flujo del prototipo** navega entre pantallas con su fundido al pulsar los nodos conectados.
- [ ] Los **tokens** aparecen como custom properties (`--primary` etc.) y los colores referenciados los usan.
- [ ] Los **constraints** emiten CSS responsive (left/right/bottom/%, width auto) — si se cambia el tamaño del contenedor, el layout responde.
- [ ] El código es **legible y editable** (una clase por nodo, estilos inline en el `<style>`).

### B2. PNG / paquete web
- [ ] Los PNG 1x/2x/3x coinciden con el lienzo (pixel-perfect, sin bordes cortados).
- [ ] El paquete ZIP incluye HTML + PNGs y se abre sin red.

### B3. Unity UI Toolkit (UXML + USS)
- [ ] El árbol de la escena coincide con las capas del editor (nombres incluidos).
- [ ] Los tokens salen como variables USS y los estilos como reglas.
- [ ] Los estados → pseudo-clases USS (`:hover`, `:pressed`) con su transition.
- [ ] El auto-layout usa el flexbox nativo de UI Toolkit y se ve igual.
- [ ] Los constraints → anclas (anchors) si el panel lo soporta.
- [ ] La guía de timelines explica cómo reconstruir cada animación (corrutina/AnimationCurve).
- [ ] Contrato cumplido: **fiel, no idéntico** — un técnico de Unity puede llegar al resultado sin redibujar.

### B4. Unreal UMG (manifest + guía)
- [ ] El manifest lista cada widget con su tipo (Canvas Panel / Border / TextBlock / Image).
- [ ] Los constraints → **Anchors** mapeados (los slots los llevan).
- [ ] La GUIA.txt es suficiente para reconstruir la pantalla en Blueprint sin ambigüedad.
- [ ] Las animaciones tienen tracks de UMG Animation descritos (qué propiedad, cuándo, con qué curva).

### B5. Lottie
- [ ] El JSON se abre en **lottiefiles.com** o se reproduce con `lottie-web` y se ve igual que el preview.
- [ ] Los keyframes conservan sus curvas (easing por tramo).
- [ ] Las capas conservan nombres reconocibles (no "shape_001").

### B6. Design tokens (DTCG + Style Dictionary)
- [ ] `tokens.json` valida contra el esquema W3C DTCG ($type/$value).
- [ ] `npx style-dictionary build` compila sin errores y genera los outputs.
- [ ] Con temas múltiples: cada tema produce su `themes/<nombre>.json` + `.css`.
- [ ] Los nombres de token son los del editor (sin renombres sorpresa).

### B7. PDF de revisión
- [ ] El documento abre con "Guardar como PDF" y se ve limpio en papel.
- [ ] Lista cada anotación con su pin, pantalla, nota y estado ✓/pendiente.
- [ ] Incluye una ficha de specs por pantalla (medidas, colores, tipografía).

---

## C. Fricciones a vigilar (registro cualitativo)

- ¿Cuándo miró el cursor esperando otra herramienta?
- ¿Buscó "agrupar", "alinear", "guías" en un menú que no era?
- ¿Dónde dijo "no sé qué va a pasar si hago esto"?
- ¿Dónde intentó un atajo de Figma que no funcionó? (anotar cuál)

## D. Cierre

- Recoger 3 cosas que le encantaron y 3 que le frustraron.
- Pedir un caso real de su trabajo: ¿qué pantalla haría y por qué Canvas (y no Figma)?
- Subir los hallazgos como issues del repo con etiqueta `ux-feedback`.
