# UI Forger — Editor visual de UI/UX offline

> Un editor de diseño de interfaces **100% offline, sin cuenta y sin backend**, tan fácil de usar como PowerPoint pero con potencia de animación de calidad AAA. Multi-destino: exporta a **HTML/CSS/JS**, **Unity UI Toolkit**, **Unreal UMG**, **Godot** y **Lottie**.

> 🌐 **100% Web**: editor completo en el navegador — sin instalación, sin problemas de GPU  
> 📱 **PWA**: funciona offline después de la primera visita  
> 🖥️ **Desktop Qt/C++**: aplicación nativa para Windows, macOS y Linux — sin Chromium, sin dependencias de navegador  

---

## Requisitos del sistema

### Windows
| Requisito | Mínimo | Recomendado |
|---|---|---|
| **Navegador** | Chrome 86+, Edge 86+ | Chrome 120+ |
| **RAM** | 4 GB | 8 GB |
| **Disco** | Ninguno (localStorage) | — |

### macOS / Linux / Cualquier SO
| Requisito | Mínimo |
|---|---|
| **Navegador** | Chrome 86+, Edge 86+, Firefox 78+, Safari 14+ |
| **RAM** | 4 GB |
| **Instalación** | Ninguna — abre la URL |

### Web (navegador)
| Requisito | Mínimo |
|---|---|
| **Navegador** | Chrome 86+, Edge 86+, Firefox 78+, Safari 14+ |
| **RAM** | 4 GB |
| **Instalación** | Ninguna — abre la URL y listo |

### ✅ Sin problemas de GPU
Al ser una app web, el navegador maneja la GPU. No hay problemas de pantalla negra con NVIDIA, AMD o Intel. La app funciona en cualquier navegador moderno.

---

## Stack tecnológico

### Frontend — Motor del editor

| Tecnología | Versión | Uso |
|---|---|---|
| **TypeScript** | 5.8.3 | Lenguaje principal del frontend (~30k líneas) |
| **React** | 19.2 | UI framework (componentes, hooks, rendering) |
| **Vite** | 6.4 | Build tool y dev server (HMR) |
| **Zustand** | 5.0 | State management global (store reactivo + Immer) |
| **Immer** | 10.2 | Immutable state updates (patches para undo/redo) |
| **JSZip** | 3.10 | Empaquetado ZIP para exports (.canvas, Unity, Unreal, Godot, Lottie, tokens) |
| **Lucide React** | 0.525 | Iconos SVG en la UI (herramientas, inspector, menús) |

### Backend / Persistencia

| Tecnología | Versión | Uso |
|---|---|---|
| **localStorage** | Web API | Autosave cada 3s + recuperación |
| **File System Access API** | Chrome 86+ | Guardar/abrir archivos directamente en disco |
| **Service Worker** | PWA | Cache offline para uso sin conexión |

### Canvas y rendering

| Tecnología | Uso |
|---|---|
| **CSS DOM rendering** | El canvas del editor es HTML/CSS puro (no canvas2D ni WebGL) — WYSIWYG exacto |
| **SVG** | Overlay de gizmos: selección, handles, marquee, snap lines, spacing hints, guías, reglas |
| **Web Animations API** | Reproducción de timelines y keyframes en preview |
| **ResizeObserver** | Detección de tamaño del canvas para zoom-to-fit |
| **File System Access API** | Guardar/abrir archivos directamente en el disco (Chrome/Edge) |
| **EyeDropper API** | Captura global de color desde cualquier parte de la pantalla |
| **Clipboard API** | Copy/paste de nodos y estilos |
| **offscreenCanvas + html-to-image** | Exportación PNG 1x/2x/3x del canvas |
| **WebGL** | Detección de GPU para fallback NVIDIA (lectura de renderer) |

### Exportadores

| Destino | Formato | Tecnología |
|---|---|---|
| **Web** | HTML autocontenido + CSS custom properties | Generador TS → string HTML |
| **PNG** | 1x / 2x / 3x pixel-perfect | html-to-image (offscreen render) |
| **Unity** | UXML + USS (UI Toolkit) | Generador TS → ZIP |
| **Unreal** | UMG manifest.json + Blueprint guide | Generador TS → ZIP |
| **Godot** | .tscn + .theme + anchors | Generador TS → ZIP |
| **Lottie** | Bodymovin JSON (.lottie) | Generador TS → JSON |
| **DTCG** | W3C Design Tokens + Style Dictionary | Generador TS → ZIP |
| **Spec Sheet** | HTML de revisión | Generador TS → HTML |
| **PDF** | Documento de revisión imprimible | print() + fallback HTML |

### Formato del proyecto

| Aspecto | Detalle |
|---|---|
| **Extensión** | `.canvas` (ZIP con `project.json` + assets + thumbnails) |
| **Serialización** | JSON con migraciones SemVer (cada versión del IR es backwards-compatible) |
| **Storage** | localStorage (web) + app_data_dir (Tauri) — autosave cada 3s |
| **Componentes** | Definiciones en IR con variantes, props boolean/string, instancias con overrides |
| **Tokens** | Colores, radios, espaciado, tipografía, sombras, easings — exportables como DTCG |

### Desktop — Qt/C++ (alternativa nativa)

| Tecnología | Versión | Uso |
|---|---|---|
| **C++** | 20 | Lenguaje del desktop |
| **Qt** | 6.7 | Framework GUI (Widgets + OpenGL) |
| **QGraphicsView** | Qt6 | Canvas 2D hardware-accelerado |
| **CMake** | 3.20+ | Build system |
| **QJsonDocument** | Qt6 | Persistencia `.canvas` JSON |
| **QUndoStack** | Qt6 | Undo/Redo |

### Herramientas de desarrollo

| Herramienta | Uso |
|---|---|
| **Git** | Control de versiones |
| **GitHub** | Repositorio + Releases con artifacts (Windows .exe, macOS .dmg, Linux .AppImage) |
| **GitHub Actions** | CI/CD: build automático por plataforma en cada tag |
| **Bun** | Runtime JS + package manager |
| **ESLint / TypeScript** | Type checking estricto (`tsc --noEmit`) |

### Plataformas de distribución

| Plataforma | Formato | Canal |
|---|---|---|
| **Web** | HTML estático + PWA | GitHub Pages / cualquier hosting |
| **ZIP** | `uiforger.zip` | Descarga para uso offline |
| **Windows** | `UIForger-Windows-x64.zip` (`.exe`) | GitHub Releases |
| **macOS** | `UIForger.dmg` (Universal Binary) | GitHub Releases |
| **Linux** | `UIForger-x86_64.AppImage` | GitHub Releases |
| **Qt Source** | `qt-ui-forger/` (C++20 + CMake) | Compilar desde código |

---

## Características principales

### 🎨 Canvas y diseño
- **Drag & drop** con pixel-snap, snapping a guías/nodos/bordes, 8 handles de resize
- **Marquee mejorado** (selección con hijos anidados)
- **Reglas y guías** arrastrables desde las reglas
- **Cuadrículas de layout** por frame (columnas/filas con margin/gutter)
- **Mini-map** de navegación (esquina inferior)
- **Measure distances** con Alt (distancias exactas entre nodos)
- **Modo outline** (wireframe, `Cmd+Y`)
- **Modo presentación** (fullscreen sin UI, `Cmd+Enter`)

### ✏️ Herramientas
- Select (V), Frame (F), Text (T), Rect (R), Elipse (O), Línea (L), Mano (H), Zoom (Z), Pen (P), Imagen (I), Eyedropper (I)

### 🎭 Estilos y tokens
- Fill (sólido/lineal/radial), Stroke, Border radius, Drop shadow, Inner shadow, Blur, Blend mode, Opacidad
- **Design tokens** de 6 tipos: colores, radios, espaciado, tipografía, sombras, easings
- **Temas múltiples** (light/dark/variantes) con undo/redo
- **Editor de easing visual** (estilo After Effects: puntos de control arrastrables)

### 🧩 Componentes
- Crear componente → librería → insertar instancias
- **Variantes** con chips insertables
- **Props boolean/string** por componente
- **Sync bidireccional** (push/pull desde el inspector)
- Badge ◆ en capas para instancias

### 📐 Auto-layout
- Flexbox visual: dirección, espaciado, padding, alineación H/V, wrap, tamaño Fijo/Contenido

### ⚡ Estados interactivos
- Hover, Pressed, Disabled, Focused con overrides de estilo
- Transición por tramo (duración + curva de los tokens de easing)
- **Preview mode** en vivo con máquina de estados

### 🎬 Animación
- **Líneas de tiempo** con keyframes (posición, opacidad, escala, color, tamaño, rotación)
- **Web Animations API** para reproducción en canvas
- **Loop** y easing por tramo
- **Export Lottie** (Bodymovin JSON) — funciona en After Effects, web, iOS, Android

### 🔗 Prototipado
- Múltiples pantallas con undo/redo independiente
- Conexiones entre nodos → pantallas con **transiciones** (fade, slide, zoom)
- **Preview interactivo** con navegación entre pantallas
- **Export HTML** que reproduce el flujo completo

### 📱 Constraints (responsive)
- Fijo a borde / centrado / estirar / escalar
- **Export HTML responsive** (CSS left/right/bottom/%)
- **Export Unity** → UI Toolkit flexbox
- **Export Unreal** → Anchors nativos
- **Export Godot** → Anchors + Container nodes

### 🖥️ Game UI
- **9-slice / 9-patch** scaling (border-image-slice CSS)
- **Anchoring + pivot points** (H/V: left/center/right/stretch)
- **Conditional visibility** por variables de juego
- **Localization placeholders** (`{key}`)
- **Sprite sheet** animation preview
- **Audio cue markers** por evento (hover, press, etc.)
- **Multi-resolution preview** (720p → 4K, iPhone, Android, Web)
- **Platform overrides** (📱 Mobile, 🎮 Console, 🖥️ PC, 🌐 Web)
- **Profiling overlay** (draw calls, nodos, depth, grade)
- **Templates** por género (RPG Inventory, FPS HUD, Racing, Platformer, Strategy)

### 💾 Persistencia
- **Autosave** cada 3s (localStorage)
- **Guardar/Abrir** `.canvas` (ZIP)
- **File System Access API** (Chrome/Edge): carpeta del proyecto + exports organizados
- **Snapshots nombrados** (Cmd+Shift+S) con panel de restauración
- **Undo/redo global** (100 pasos con historial visual)

### 📤 Exportación
- HTML/CSS/JS autocontenido
- PNG 1x/2x/3x
- Paquete web (ZIP)
- Unity UI Toolkit (UXML + USS)
- Unreal UMG (manifest.json)
- Godot (.tscn + .theme)
- Lottie (Bodymovin)
- Design Tokens (DTCG + Style Dictionary)
- PDF de revisión
- Spec sheet HTML

---

## Atajos de teclado principales

| Atajo | Acción |
|---|---|
| `Espacio` (mantenido) | Pan del canvas |
| `Scroll wheel` | Zoom al cursor |
| `Clic derecho + drag` | Pan del canvas |
| `Cmd/Ctrl + Z` / `Shift+Z` | Deshacer / Rehacer |
| `Cmd/Ctrl + D` | Duplicar (con offset) |
| `Cmd/Ctrl + F` | Búsqueda global |
| `Cmd/Ctrl + K` | Palette de acciones |
| `Cmd/Ctrl + /` | Modal de atajos |
| `Cmd/Ctrl + Enter` | Modo presentación |
| `Cmd/Ctrl + 1` | Zoom a pantalla |
| `Cmd/Ctrl + 2` | Zoom a selección |
| `Cmd/Ctrl + Y` | Modo outline |
| `Cmd/Ctrl + S` | Guardar |
| `V/F/T/R/O/L/P/H/Z/I` | Herramientas |

→ Ver lista completa en **Cmd/Ctrl + /** o en `public/help.html`

---

## Notas

La app funciona 100% en el navegador, por lo que no hay problemas de compatibilidad con GPUs. El navegador se encarga del rendering GPU de forma transparente.

---

## Instalación

### Web (recomendado)
Abre la URL del deploy en tu navegador. No requiere instalación. La app es una PWA — funciona offline después de la primera visita.

### Offline
Descarga `uiforger.zip` desde [Releases](https://github.com/dryaris/UIBuilderDesigner/releases) y abre `index.html` en tu navegador. Sin instalación, sin permisos de admin.

### Desarrollo local
```bash
git clone https://github.com/dryaris/UIBuilderDesigner.git
cd UIBuilderDesigner
bun install
bun run dev       # abre http://localhost:5173
bun tsc -b --noEmit  # typecheck
```

### Desarrollo
```bash
git clone https://github.com/dryaris/UIBuilderDesigner.git
cd UIBuilderDesigner
bun install
bun run dev       # abre http://localhost:5173
bun tsc -b --noEmit  # typecheck
```

---

## Estructura del proyecto

```
src/
├── core/
│   ├── ir.ts              # Intermediate Representation (tipos y funciones)
│   ├── defaults.ts         # Factory functions para nodos
│   └── gameTemplates.ts    # Templates predefinidos por género
├── state/
│   └── store.ts           # Zustand store (estado global + acciones)
├── canvas/
│   ├── Canvas.tsx          # Lienzo principal
│   ├── NodeView.tsx        # Renderizado de cada nodo
│   ├── Gizmos.tsx          # Overlay SVG (selección, handles, snap, etc.)
│   ├── pointer.ts          # Handlers de pointer/wheel/keyboard
│   └── transform.ts        # Conversión viewport ↔ world
├── ui/
│   ├── Inspector.tsx       # Panel derecho (propiedades del nodo)
│   ├── TopBar.tsx          # Barra superior (menú, herramientas, export)
│   ├── ShortcutsModal.tsx  # Modal de atajos con búsqueda
│   ├── SearchPanel.tsx     # Búsqueda global (Cmd+F)
│   ├── GamePanel.tsx       # Panel de Game UI (variables, audio, 9-slice)
│   ├── MiniMap.tsx         # Mini-map de navegación
│   ├── ProfilingOverlay.tsx # Métricas de rendimiento
│   ├── PlatformSelector.tsx # Selector de plataforma (mobile/console/PC/web)
│   ├── CanvasThemeSelector.tsx # Tema del canvas (dark/light)
│   ├── SnapshotsPanel.tsx  # Gestión de snapshots versionados
│   └── CommentsThread.tsx  # Sistema de comentarios
├── export/
│   ├── html.ts             # Exportador HTML/CSS/JS
│   ├── unity.ts            # Exportador Unity UI Toolkit
│   ├── unreal.ts           # Exportador Unreal UMG
│   ├── godot.ts            # Exportador Godot .tscn + .theme
│   ├── lottie.ts           # Exportador Lottie/Bodymovin
│   └── tokens.ts           # Exportador DTCG + Style Dictionary
├── import/
│   └── figma.ts            # Importador Figma JSON
├── persistence/
│   ├── persistence.ts      # Autosave + localStorage
│   ├── fileSystem.ts       # File System Access API
│   └── projectFolder.ts    # Gestión de carpeta del proyecto
├── shortcuts/
│   └── keys.ts             # Atajos de teclado
├── editor/
│   └── Editor.tsx          # Layout principal del editor
├── App.tsx                 # Entry point + GPU error handler
├── main.tsx                # React root
└── index.css               # Estilos globales (~3100 líneas)
```

---

## Licencia

Proyecto privado. Todos los derechos reservados.
