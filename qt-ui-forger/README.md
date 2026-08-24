# UI Forger — Qt/C++ Desktop Edition

A visual game UI editor built with Qt 6 + QGraphicsView, replacing the previous Tauri/web version.

## Features

- **QGraphicsView Canvas** — Hardware-accelerated 2D canvas with zoom (scroll wheel), pan (middle-click / right-click / space+drag)
- **Node Rendering** — Each UI node is a `QGraphicsObject` with background gradient, accent bar, label, component badge, conditional visibility indicator, and drop shadow
- **Inspector Panel** — Edit node properties: type, label, position, size, colors, border, shadow, font, opacity, conditional visibility
- **Layer Panel (Tree)** — Visual tree of all nodes with icons, filter, add/delete
- **MiniMap** — Overview of the entire canvas, updated in real-time
- **TopBar** — File operations (New/Open/Save), Undo/Redo, Export menu, Grid/MiniMap toggles, search, zoom controls, help
- **Persistence** — Save/load `.canvas` JSON files (compatible with the web version)
- **Exporters** — HTML, PNG, Unity UXML, Unreal C++ header, Godot .tscn scene
- **Autosave** — Every 30 seconds to `autosave.canvas`
- **Demo Scene** — Pre-loaded RPG HUD with health bar, stamina bar, buttons, minimap, tooltip, FPS label

## Tech Stack

| Component | Technology |
|---|---|
| Language | C++20 |
| GUI Framework | Qt 6 (Widgets + OpenGL) |
| Canvas | QGraphicsView / QGraphicsScene |
| Rendering | QPainter (antialiased, hardware-accelerated) |
| State Management | SceneStore (QObject + signals/slots) |
| Undo/Redo | QUndoStack |
| Persistence | QJsonDocument (`.canvas` JSON) |
| Build System | CMake 3.20+ |
| Dark Theme | Fusion style + custom QPalette |

## Build & Run

```bash
# Prerequisites: Qt 6.2+, CMake 3.20+, C++ compiler (GCC/Clang/MSVC)

# Clone
git clone https://github.com/dryaris/UIBuilderDesigner.git
cd UIBuilderDesigner/qt-ui-forger

# Build
mkdir build && cd build
cmake .. -DCMAKE_PREFIX_PATH=/path/to/qt6
cmake --build .

# Run
./UIForger
```

### Linux (apt)
```bash
sudo apt install qt6-base-dev qt6-svg-dev cmake g++
```

### macOS (brew)
```bash
brew install qt cmake
```

### Windows (vcpkg)
```powershell
vcpkg install qt6-base qt6-svg
```

## Controls

| Shortcut | Action |
|---|---|
| Scroll Wheel | Zoom in/out |
| Middle-click + Drag | Pan canvas |
| Right-click + Drag | Pan canvas |
| Space + Drag | Pan canvas |
| Ctrl++ | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom (100%) |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+N | New project |
| Ctrl+O | Open project |
| Ctrl+S | Save project |
| N | Add new node |
| Delete | Delete selected node |
| Ctrl+D | Duplicate selected |
| F1 | Help dialog |

## Project Structure

```
qt-ui-forger/
├── CMakeLists.txt
└── src/
    ├── main.cpp                    # App entry point (dark theme, fonts)
    ├── core/
    │   ├── ir.h / ir.cpp          # Core types: Node, Style, Connection, etc.
    │   ├── scene_store.h / .cpp   # Central state manager (Zustand equivalent)
    │   └── persistence.h / .cpp   # Save/load .canvas JSON files
    ├── canvas/
    │   ├── canvas_view.h / .cpp   # QGraphicsView with zoom/pan/drag
    │   ├── node_item.h / .cpp     # QGraphicsObject node rendering
    │   └── mini_map.h / .cpp      # Overview minimap widget
    ├── ui/
    │   ├── mainwindow.h / .cpp    # Main window wiring everything together
    │   ├── topbar.h / .cpp        # Toolbar with file/edit/export/zoom
    │   ├── inspector.h / .cpp     # Property inspector panel
    │   └── tree_panel.h / .cpp    # Layer tree panel
    └── export/
        └── exporters.h / .cpp     # HTML, PNG, Unity, Unreal, Godot export
```

## Migration from Web Version

This Qt version replaces the previous Tauri web app. Key differences:

| Aspect | Web (Tauri) | Qt Desktop |
|---|---|---|
| Rendering | CSS DOM | QPainter + QGraphicsScene |
| Canvas zoom | Transform CSS | QTransform scale |
| State | Zustand | SceneStore (signals) |
| Save | File System API | QFile + QJsonDocument |
| GPU issues | Chromium bugs | None (native rendering) |
| Offline | Service Worker | Always offline |
| Performance | Browser limits | Native C++ |

## License

MIT
