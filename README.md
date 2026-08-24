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
| **macOS** | `UIForger.dmg` (Universal Binary ARM + x64) |
| **Linux** | `UIForger-x86_64.AppImage` (portátil, sin instalación) |

---

## Compilar

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
| **Multiselección** | `Ctrl + click` o `marquee` |
| **Deshacer/Rehacer** | `Ctrl+Z` / `Ctrl+Shift+Z` |
| **Guardar** | `Ctrl+S` |
| **Duplicar** | `Ctrl+D` |
| **Eliminar** | `Supr` |

---

## Features

### Canvas
- **QGraphicsView** con zoom (scroll wheel), pan (right-click drag / space+drag / middle-click drag)
- Cuadrícula configurable con snap
- Mini-map de navegación
- Reglas y guías arrastrables
- Modo outline (wireframe)

### Nodos
- Tipos: rectángulo, elipse, texto, imagen, frame, línea, botón, barra de progreso, tooltip, ícono
- Renderizado con gradientes, accent bars, badges, sombras, highlight de selección
- Resize con 8 handles
- Drag & drop con snapping

### Inspector
- Editar: tipo, label, posición, tamaño, colores (fill/stroke/accent), border, sombra, fuente, opacidad
- Auto-layout visual: dirección, espaciado, padding, alineación

### Árbol de capas
- Lista jerárquica con iconos por tipo
- Filtro de búsqueda
- Agregar/eliminar nodos

### TopBar
- Archivo: Nuevo, Abrir, Guardar, Guardar como
- Edición: Deshacer, Rehacer
- Herramientas: Grid, Mini-map
- Exportar: HTML, PNG, Unity, Unreal, Godot
- Zoom: 25%-800%, Zoom to fit

### Persistencia
- Guardar/cargar archivos `.canvas` (JSON)
- Autosave cada 30 segundos
- Demo RPG HUD pre-cargado

### Exportación
| Destino | Formato |
|---|---|
| **Web** | HTML autocontenido + CSS custom properties |
| **PNG** | Captura del canvas como imagen |
| **Unity** | UXML + USS (UI Toolkit) |
| **Unreal** | manifest.json + Blueprint guide |
| **Godot** | .tscn + .theme + anchors |

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
│   ├── canvas_view.h           # QGraphicsView: zoom, pan, drag
│   ├── canvas_view.cpp         # Implementación del canvas
│   ├── node_item.h             # QGraphicsObject: paint, selection, shadow
│   ├── node_item.cpp           # Renderizado de cada nodo
│   ├── mini_map.h              # Overview minimap
│   └── mini_map.cpp            # Implementación del minimap
├── ui/
│   ├── mainwindow.h            # Ventana principal (wires todo)
│   ├── mainwindow.cpp          # Layout: toolbar + tree + canvas + inspector
│   ├── topbar.h                # Toolbar (file, edit, export, zoom)
│   ├── topbar.cpp              # Implementación del toolbar
│   ├── inspector.h             # Editor de propiedades
│   ├── inspector.cpp           # Formulario dinámico por tipo de nodo
│   ├── tree_panel.h            # Panel de capas
│   └── tree_panel.cpp          # Lista con iconos, filtro, add/delete
└── export/
    ├── exporters.h             # Generadores: HTML, PNG, Unity, Unreal, Godot
    └── exporters.cpp           # Implementación de exportadores
```

---

## Licencia

Proyecto privado. Todos los derechos reservados.
