# UI Forger — Editor visual de UI para videojuegos

> Editor nativo de escritorio para diseñar interfaces de videojuegos. Canvas 2D con **QGraphicsView**, exporta a **HTML**, **Unity**, **Unreal**, **Godot** y **PNG**. Sin navegador, sin Chromium, sin problemas de GPU.

---

## Requisitos

| Componente | Mínimo | Recomendado |
|---|---|---|
| **Sistema operativo** | Windows 10, macOS 12, Ubuntu 22.04 | Windows 11, macOS 14, Ubuntu 24.04 |
| **Qt** | 6.2+ | 6.7+ |
| **CMake** | 3.20+ | 3.28+ |
| **Compilador** | C++20 (MSVC 2019+, GCC 11+, Clang 14+) | C++20 (MSVC 2022+, GCC 13+, Clang 16+) |
| **RAM** | 4 GB | 8 GB |
| **Disco** | 200 MB (build) | 1 GB |

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| **C++** | 20 | Lenguaje principal |
| **Qt 6** | 6.2+ | Framework GUI (Core, Gui, Widgets, Svg) |
| **QGraphicsView** | Qt6 | Canvas 2D hardware-accelerado con zoom/pan/drag |
| **CMake** | 3.20+ | Build system |
| **QJsonDocument** | Qt6 | Persistencia `.canvas` JSON |
| **QUndoStack** | Qt6 | Undo/Redo con historial |

### Plataformas de distribución

| Plataforma | Formato |
|---|---|
| **Windows** | `UIForger-Windows-x64.zip` (`.exe` portátil) |
| **macOS** | `UIForger-macOS.dmg` (Intel) |
| **Linux** | `UIForger-Linux-x64.tar.gz` (portátil, sin instalación) |

---

## Instalación rápida

**Windows:** Descarga `UIForger-Windows-x64.zip`, descomprime y ejecuta `UIForger.exe`

**macOS:** Descarga `UIForger-macOS.dmg`, abre y arrastra a Applications

**Linux:** Descarga `UIForger-Linux-x64.tar.gz`, descomprime y ejecuta `./UIForger`

---

## Compilar desde código

### Linux / macOS
```bash
# Instalar Qt6 (ejemplo Ubuntu)
sudo apt install qt6-base-dev libgl1-mesa-dev

# Build
cmake -B build -DCMAKE_PREFIX_PATH=/path/to/qt6
cmake --build build -j$(nproc)
./build/UIForger
```

### Windows (MSVC)
```powershell
# Instalar Qt6 via Qt Installer o vcpkg
cmake -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\UIForger.exe
```

### macOS (Universal)
```bash
cmake -B build \
  -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
  -DCMAKE_PREFIX_PATH=$(brew --prefix qt@6)
cmake --build build
open build/UIForger.app
```

---

## Controles

| Acción | Comando |
|---|---|
| **Pan del canvas** | `Click derecho + drag` o `Espacio + drag` o `Botón medio + drag` |
| **Zoom** | `Scroll wheel` |
| **Seleccionar nodo** | `Click izquierdo` |
| **Mover nodo** | `Drag` sobre nodo seleccionado |
| **Deseleccionar** | `Click en vacío` |
| **Multiselección** | `Ctrl + click` o `Ctrl + drag` (marquee) |
| **Nudge 1px** | `Flechas` |
| **Nudge 10px** | `Shift + Flechas` |
| **Deshacer/Rehacer** | `Ctrl+Z` / `Ctrl+Shift+Z` |
| **Guardar** | `Ctrl+S` |
| **Duplicar** | `Ctrl+D` o click derecho → Duplicate |
| **Eliminar** | `Supr` o click derecho → Delete |
| **Zoom in/out** | `Ctrl++` / `Ctrl+-` |
| **Reset zoom** | `Ctrl+0` |
| **Menú contextual** | `Click derecho` en nodo o canvas vacío |

---

## Features

### Canvas
- **QGraphicsView** con zoom (scroll wheel), pan (right-click drag / space+drag / middle-click drag)
- Cuadrícula configurable con **snap a 10px** (toggle desde menú View o botón Grid)
- **Multiselección** por Ctrl+click y rubber band marquee (Ctrl+drag)
- **Nudge** con flechas: 1px default, Shift+Flechas = 10px
- Mini-map de navegación en tiempo real
- Reglas y guías arrastrables

### Menú contextual (click derecho)
- **Duplicate** — Duplica el nodo seleccionado
- **Delete** — Elimina el nodo seleccionado
- **Copy Style** — Copia el estilo (colores, tipografía, border, opacidad)
- **Paste Style** — Pega el estilo copiado a otro nodo
- **Select All** — Selecciona todos los nodos del canvas

### Nodos
- Tipos: container, button, label, title, image, slider, progressBar, healthBar, staminaBar, tooltip, miniMap, panel, text, icon, checkbox, input, dropdown, avatar, badge, divider, spacer, scrollArea, tabBar, dialog, toast, inventory, statDisplay, radarChart, damagePopup, abilitySlot, cooldownIndicator, compass, chatBox, leaderboard, radialMenu
- Renderizado con gradientes, accent bars, badges, sombras, highlight de selección
- Drag & drop con **snap a grid** (enteros, sin medios píxeles)
- **Arrow key nudge** (1px / 10px con Shift)

### Inspector (panel derecho)
- **Edición en tiempo real**: cada cambio se refleja instantáneamente en el canvas
- Propiedades: tipo, label, posición (X, Y), tamaño (Width, Height)
- Estilo: BG Color, Accent Color, Border, Radius, Fill, Opacity, Shadow
- Tipografía: Font family, Size, Bold, Italic, Alignment, Text Color
- Propiedades: Locked, Hidden
- **Copy/Paste Style**: copia y pega estilos entre nodos
- Condiciones de visibilidad

### Árbol de capas (panel izquierdo)
- Lista jerárquica con iconos por tipo
- **Filtro de búsqueda** en tiempo real
- Agregar/eliminar nodos
- Indicadores de estado: 🔒 locked, 👁‍🗨 hidden

### TopBar
- Archivo: Nuevo, Abrir, Guardar
- Edición: Deshacer, Rehacer
- Herramientas: Grid toggle, Mini-map toggle
- **Exportar**: HTML, PNG, Unity, Unreal, Godot
- **Zoom**: controles −/+, indicador de porcentaje, reset
- **Búsqueda** de nodos
- Botón de ayuda

### Menú
- **File**: New, Open, Save, Export HTML/PNG, Exit
- **Edit**: Undo, Redo, Add Node, Delete Node, Duplicate
- **View**: Zoom In/Out/Reset, **Snap to Grid** (toggle), **Show Grid Lines** (toggle)

### Persistencia
- Guardar/cargar archivos `.canvas` (JSON)
- Autosave cada 30 segundos
- Demo RPG HUD pre-cargado al iniciar

### Exportación
| Destino | Formato | Detalle |
|---|---|---|
| **Web** | HTML autocontenido | CSS custom properties, accent bars, badges |
| **PNG** | Imagen 1920×1080 | Renderizado con gradientes y tipografía |
| **Unity** | UXML | UI Toolkit compatible |
| **Unreal** | C++ Header | UPROPERTY BindWidget macros |
| **Godot** | .tscn | Control nodes con anchors |

---

## Estructura del proyecto

```
src/
├── main.cpp                    # Entry point, dark theme Fusion
├── core/
│   ├── ir.h                    # Tipos: Node, Style, Connection, ConditionalRule
│   ├── ir.cpp                  # Implementación de tipos IR
│   ├── scene_store.h           # Estado central (equivalente Zustand)
│   ├── scene_store.cpp         # Emite señales cuando el estado cambia
│   └── persistence.h/.cpp      # Guardar/cargar .canvas JSON
├── canvas/
│   ├── canvas_view.h           # QGraphicsView: zoom, pan, drag, multi-select, marquee, context menu
│   ├── canvas_view.cpp         # Implementación del canvas con snap y rubber band
│   ├── node_item.h             # QGraphicsObject: paint, selection, shadow, snap-to-grid
│   ├── node_item.cpp           # Renderizado de cada nodo con snap durante drag
│   ├── mini_map.h              # Overview minimap
│   └── mini_map.cpp            # Implementación del minimap
├── ui/
│   ├── mainwindow.h            # Ventana principal (wires todo, copy/paste style)
│   ├── mainwindow.cpp          # Layout + signal wiring completo
│   ├── topbar.h                # Toolbar (file, edit, export, zoom, search)
│   ├── topbar.cpp              # Implementación del toolbar con indicador de zoom
│   ├── inspector.h             # Editor de propiedades (signal propertyChanged)
│   ├── inspector.cpp           # Formulario dinámico con conexión directa al store
│   ├── tree_panel.h            # Panel de capas con filtro
│   └── tree_panel.cpp          # Lista con iconos, filtro, add/delete
└── export/
    ├── exporters.h             # Generadores: HTML, PNG, Unity, Unreal, Godot
    └── exporters.cpp           # Implementación de exportadores
```

---

## Changelog

### v1.1.0 (2026-08-24)

**Canvas & Selección**
- Multiselección por Ctrl+click y rubber band marquee (Ctrl+drag)
- Nudge con flechas: 1px default, Shift+Flechas = 10px
- Menú contextual (click derecho): Duplicate, Delete, Copy/Paste Style, Select All
- Snap a grid de 10px durante drag (enteros, sin medios píxeles)
- Toggle snap desde menú View

**Inspector**
- Edición en tiempo real: todos los cambios se reflejan instantáneamente
- Conexión completa: spinboxes, combos, checkboxes, color buttons → store → canvas
- Copy/Paste Style entre nodos

**TopBar**
- Indicador de zoom con porcentaje actual
- Búsqueda de nodos en tiempo real con filtro
- Undo/Redo conectados al QUndoStack

**Árbol de capas**
- Filtro de búsqueda en tiempo real

### v1.0.0-qt
- Migración completa de web (React/TypeScript) a Qt/C++ desktop
- Canvas QGraphicsView con zoom/pan/drag
- Inspector de propiedades
- Panel de capas con iconos
- MiniMap en tiempo real
- Guardar/cargar proyectos .canvas (JSON)
- Exportar: HTML, PNG, Unity, Unreal, Godot
- Dark theme nativo Fusion
- Autosave cada 30 segundos
- Demo RPG HUD pre-cargado
- CI cross-platform: Windows (MSVC), macOS (clang), Linux (GCC)

---

## Licencia

Proyecto privado. Todos los derechos reservados.
