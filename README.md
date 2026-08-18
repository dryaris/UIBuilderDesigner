# Canvas — Editor visual de UI/UX offline

Un editor de diseño de interfaces **100% offline, sin cuenta y sin backend**, tan fácil de usar como PowerPoint pero con potencia de animación de calidad AAA. Multi-destino: exporta a **HTML/CSS/JS**, **Unity UI Toolkit (UXML + USS)** y **Unreal UMG**.

> "Un Figma más agnóstico": el diseñador no necesita saber nada de motores ni de código; un diseñador técnico llega al detalle fino.

## Estado actual — Fases 1–6 completas, Fase 7 en curso ✅

Lo que ya funciona:

- **Canvas con drag & drop**: selección (clic, Shift+clic, marquee, clic en vacío dentro del artboard = seleccionar pantalla), mover, redimensionar con 8 handles, **pixel-snap estricto a enteros** y **snapping** a guías, bordes del frame y nodos hermanos con líneas de guía visuales.
- **Spacing hints (medición al mover)**: al arrastrar un nodo cerca de otros se muestran las distancias exactas en px, estilo Figma (líneas rojas con etiqueta).
- **Alineación y distribución**: `Alt+A/D/W/S` = izquierda/derecha/arriba/abajo, `Alt+C/M` = centrar H/V, `Alt+Shift+H/V` = distribuir — los atajos exactos de Figma.
- **Cuadrículas de layout por frame**: columnas/filas con margin y gutter, configurables desde el Inspector y dibujadas sobre el lienzo.
- **Design tokens de primera clase**: pestaña **Diseño** con editor visual de colores, radios, espaciado, tipografías, sombras y easing. Los colores y radios se aplican como referencias `"$nombre"` desde chips en el Inspector, y cualquier color se puede guardar como token con un clic.
- **Librería de componentes**: clic derecho → **Crear componente** guarda el elemento en tu librería; desde la pestaña Diseño insertas instancias con un clic (se colocan en el centro del lienzo).
- **Atajos sagrados (memoria muscular de Figma)**: `Espacio` = pan, `Cmd/Ctrl+scroll` = zoom al cursor, flechas = nudge 1px, `Shift+flechas` = 10px, `Cmd+D` = duplicar, `Cmd+Z` = undo, `Cmd+K` = palette de acciones.
- **Frames con presets de videojuego**: TV 1080p/720p/4K, ultrawide 21:9, iPhone, Android y web — con **overlays de safe areas** (5% title / 10% action) desde el primer día.
- **Reglas y guías**: arrastrables desde las reglas, con snap y borrado (arrastra la guía fuera del canvas).
- **Herramientas**: Select (V), Frame (F), Text (T, edición inline con doble clic), Rect (R), Elipse (O), Línea (L), Mano (H), Zoom (Z, marquee para ampliar zona).
- **Menú contextual** en nodos: duplicar, envolver en frame, agrupar, crear componente, copiar/pegar estilo, eliminar.
- **Undo/redo** con patches de Immer (100 pasos) y **autosave** con debounce de 3s + recuperación al abrir.
- **Formato `.canvas`** (ZIP con `project.json` versionado + migraciones SemVer + slots para assets/thumb/annotations).
- **Exportador HTML/CSS completo** que valida el IR: tokens → custom properties, estados → pseudo-clases, y un `.html` autocontenido que escala la pantalla al viewport.
- **Export de assets PNG 1x/2x/3x** y **paquete web** (HTML + PNGs en un `.zip`), renderizado offscreen con el mismo motor que el editor (WYSIWYG exacto).
- **Estados interactivos** (Fase 3): edita overrides de Hover / Pulsado / Desactivado / Foco por nodo (relleno, color, opacidad, escala, sombra), con **transición** (duración + curva de los tokens de easing) y **vista previa en el lienzo**.
- **Comprobador de contraste WCAG** para texto: ratio en vivo con calificación AA/AAA.
- **Modo Preview (máquina de estados)**: botón ▶ en la barra superior (o pestaña Animar) → el lienzo deja de editar y el cursor activa los estados hover/pulsado de cada nodo con sus transiciones (duración + curva desde los tokens de easing).
- **Líneas de tiempo con keyframes**: pestaña Animar → crea una línea, selecciona elementos y **captura keyframes** en distintos instantes; reproduce en el preview con **Web Animations API** (loop opcional, easing por tramo con tokens).
- **Exportador Unity UI Toolkit (UXML + USS)**: style → USS, tokens → custom properties, estados → pseudo-clases con transitions, timelines documentadas como corrutinas/AnimationCurve. Contrato "fiel, no idéntico".
- **Exportador Unreal UMG**: manifest.json con el árbol de widgets (Canvas Panel / Border / TextBlock / Image), slots, estados → eventos Blueprint, animaciones → tracks de UMG Animation, tokens → paleta; + GUIA.txt paso a paso. Contrato "fiel, no idéntico" (UMG no tiene flexbox nativo).
- **Variantes e instancias con overrides** (Fase 7): crea variantes de un componente desde la librería (chips insertables), edita una instancia sin afectar la librería y usa **Actualizar componente** (clic derecho) para que las futuras instancias hereden los cambios. Las instancias llevan un badge ◆ en capas.
- **Modo Dev / spec sheet** (Fase 7): ficha HTML autocontenida con medidas, colores, tipografía, radios, sombras y trazos — del lienzo completo o de un nodo (clic derecho → "Spec sheet de este nodo").
- **Prototipado entre pantallas** (Fase 7): pestaña **Prototipo** → duplica o crea pantallas (cada una se edita en el lienzo con su propio undo), y conecta cualquier nodo a otra pantalla con transición (duración + curva de los tokens de easing). En modo Preview, pulsar un nodo conectado navega con fundido; el **exportador HTML reproduce el mismo flujo** con todas las pantallas y sus conexiones.
- **Anotaciones de review** (Fase 7): modo anotar → clic en la pantalla coloca un pin numerado (también disponible en la palette `⌘K`); escribe la nota en la pestaña Prototipo, márcala como resuelta ✓ o bórrala. Los pins se guardan en el proyecto y se seleccionan desde el lienzo o la lista.
- **Panel de capas, inspector sin jerga técnica** (sliders, pickers, iconos), tema claro/oscuro, palette `⌘K`, starter kits (menú de juego 1080p, HUD móvil).

**Regla de los 10 minutos**: abre la app → "Menú de juego" → ya tienes una pantalla de juego animable y bonita. Doble clic en el título para reescribir el texto, arrastra los botones, `⌘D` para duplicar, flechas para nudge, `Alt+C` para centrar y guarda el color del botón como token.

## Arquitectura

### IR (Intermediate Representation) — la única fuente de verdad

Todo (canvas, exportadores, autosave, preview) lee y escribe este modelo. Versionado con SemVer y migraciones puras aplicadas en memoria al abrir (`src/core/ir.ts`).

```jsonc
{
  "version": "0.1.0",              // SemVer; migrate() lleva versiones viejas a la actual
  "tokens":  { "colors": {}, "radii": {}, "spacing": {}, "typography": {}, "shadows": {}, "easings": {} },
  "library": { "components": {}, "variants": {} },   // Fase 2/7
  "timelines": [],                 // Fase 4 (keyframes con easing, loop, playMode)
  "assets":  [],                   // Fase 2 (hash SHA-256, deduplicación)
  "root": {                        // el frame raíz ES la pantalla/artboard
    "id": "...", "type": "frame", "name": "Menú principal",
    "style": { "x": 0, "y": 0, "width": 1920, "height": 1080,
               "gradient": { "type": "linear", "angle": 160, "stops": [...] } },
    "guides": { "vertical": [960], "horizontal": [540] },
    "safeArea": { "title": 0.05, "action": 0.1 },
    "children": [ /* nodos */ ]
  }
}
```

Un nodo: `id`, `type` (frame/text/image/component/shape/vector), `ref` (referencias `"$token"`), `style` (flexbox + visuales), `states` (overrides con `transition`), `animations` (triggers onLoad/onHover/onPress/onEvent), `constraints`, `children`. Los campos de fases futuras **ya están tipados** en el IR: el formato no cambia, solo crece.

### Stack técnico

| Capa | Elección | Nota |
|---|---|---|
| UI editor | React + TypeScript + Vite | Web-first: corre en navegador y en Tauri con la misma base |
| Estado | Zustand + Immer (`produceWithPatches`) | Undo/redo por patches; las sesiones de drag no mutan el doc y commitean una sola vez |
| Canvas | **DOM (decisión deliberada)** | El DOM ES el motor del exportador HTML → WYSIWYG exacto. PixiJS queda detrás de una abstracción de renderer si el perfil lo exige (miles de nodos vivos) |
| Desktop | Tauri 2 (Rust) | Comandos IPC de I/O y exportadores (`src-tauri/`) |
| Layout (Fase 3) | yoga-layout-wasm | Mismo motor que Unity UI Toolkit → paridad de layout |
| Preview animado (Fase 4) | Web Animations API / WAAPI | Con editor de easing |

### Estructura de carpetas

```
src/
  core/            # IR (tipos, migraciones), tokens, helpers de árbol, defaults/starters
  state/           # Store global (doc + historial + UI) con sesiones de drag
  canvas/          # Render de nodos, gizmos, reglas, transformaciones y sesiones de puntero
  interactions/    # (snapping vive en canvas/snapping.ts; sesiones en canvas/pointer.ts)
  shortcuts/       # Atajos de teclado + palette ⌘K
  ui/              # Toolbar, TopBar, Inspector, Layers, ContextMenu, Palette, Modal, StatusBar
  export/          # Exportador HTML temprano + formato de proyecto (.canvas ZIP)
  persistence/     # Autosave (3s, localStorage) + puente de plataforma (Tauri/browser)
  editor/          # Editor.tsx: ensambla todo, boot con recuperación
src-tauri/         # Shell Tauri 2: Cargo.toml, tauri.conf.json, comandos save/load/list
```

### Persistencia — formato `.canvas`

ZIP con: `project.json` (IR completo) + `assets/` (binarios por hash SHA-256, Fase 2) + `thumb.png` (Fase 2) + `annotations.json` (Fase 7). Guardado atómico (`.tmp` + rename) en Tauri; autosave con debounce de 3s y recuperación ante cierres.

### Exportadores (plan)

- **HTML/CSS/JS** — Fase 2 (ya hay validador temprano en `src/export/html.ts`): style→CSS, estados→pseudo-clases, timelines→@keyframes/WAAPI, tokens→custom properties.
- **Unity UI Toolkit** — Fase 5: style→USS, estados→pseudo-estados USS, timelines→AnimationCurve + coroutines, componentes→VisualTreeAsset, variantes→clases USS.
- **Unreal UMG** — Fase 6: flexbox→Anchors + Canvas Panel/ScaleBox, estados→eventos Blueprint, timelines→UMG Animations. Contrato aceptado: **"fiel, no idéntico"** (UMG no tiene flexbox nativo).

## Cómo ejecutar

```bash
bun install        # instala dependencias
bun run dev        # editor en el navegador (localhost:5173)
bun run typecheck  # tsc -b --noEmit

# App de escritorio (requiere toolchain Rust: rustup)
bunx tauri dev     # compila el shell Tauri y abre la ventana nativa
bunx tauri build   # binario de escritorio (requiere iconos: bunx tauri icon logo.png)
```

> El editor funciona **igual en navegador que en escritorio** gracias a la abstracción de plataforma (`src/persistence/persistence.ts` + `tauriBridge.ts`).

## Atajos

| Atajo | Acción |
|---|---|
| `Espacio` (mantenido) | Pan |
| `Cmd/Ctrl + scroll` | Zoom al cursor |
| `Flechas` / `Shift+Flechas` | Nudge 1px / 10px |
| `Cmd/Ctrl + D` | Duplicar |
| `Cmd/Ctrl + Z` / `Shift+Z` (o `Y`) | Deshacer / Rehacer |
| `Cmd/Ctrl + A` | Seleccionar todo |
| `Cmd/Ctrl + G` / `Shift+G` | Agrupar / Desagrupar |
| `Cmd/Ctrl + Shift + C/V` | Copiar / Pegar estilo |
| `Alt+A/D/W/S` | Alinear izquierda / derecha / arriba / abajo |
| `Alt+C` / `Alt+M` | Alinear centro H / centro V |
| `Alt+Shift+H` / `Alt+Shift+V` | Distribuir horizontal / vertical |
| `Cmd/Ctrl + K` | Palette de acciones |
| `Cmd/Ctrl + S` / `Shift+O` | Guardar / Abrir `.canvas` |
| `V F T R O L H Z` | Select / Frame / Text / Rect / Elipse / Línea / Mano / Zoom |
| `Shift+1` / `Shift+0` | Ajustar a pantalla / 100% |
| `Supr` | Eliminar · `Esc` deseleccionar / salir del preview |

## Roadmap de fases

1. **Fase 1** — Fundamentos tipo Figma: drag & drop con snap, atajos sagrados, presets + safe areas, reglas/guías, menú contextual, undo/redo, autosave. ✅
2. **Fase 2** — Alineación/distribución, grids, spacing hints, **tokens y componentes ANTES de animar**, exportador HTML/CSS completo y export de assets PNG 1x/2x/3x. ✅
3. **Fase 3** — Auto-layout visual (flexbox tras iconos), constraints/responsive, **estados interactivos ✅, contraste WCAG ✅**.
4. **Fase 4** — **Máquina de estados + preview local ✅, timelines/keyframes ✅** (WAAPI, loop, easing por tramo). Pendiente: editor de easing visual.
5. **Fase 5** — Exportador Unity UI Toolkit (UXML/USS). ✅
6. **Fase 6** — Exportador Unreal UMG (manifest JSON + guía Blueprint). ✅
7. **Fase 7** — **Variantes ✅, instancias con overrides ✅, modo Dev/spec sheets ✅, prototipado entre pantallas ✅, anotaciones ✅** (multi-pantalla + conexiones con transición, reproducibles en preview y exportadas al HTML; pins de review con resolución).
8. **Fase 8** — Pulido UX: micro-interacciones, onboarding, rendimiento, pruebas con diseñadores.

## Decisiones de ingeniería relevantes

- **Canvas en DOM en Fase 1 (no PixiJS)**: el WYSIWYG es exacto por definición (el DOM es el motor del exportador HTML) y sombras/gradientes/blend modes/texto salen gratis. PixiJS se añadiría solo si el perfil de rendimiento lo exige; el IR está desacoplado del render.
- **Sesiones de drag sin mutar el doc**: la UI muestra una vista previa en vivo y al soltar se hace **un solo commit** → una sola entrada de undo.
- **Guías en el IR** (campo opcional del frame raíz en Fase 1): se guardan en el proyecto, se arrastran desde las reglas o la propia línea, y soltarlas fuera las borra.
- **StrictMode de React**: los efectos de boot/autosave son idempotentes.
