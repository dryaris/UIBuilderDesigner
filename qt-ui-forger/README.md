# UI Forger — Qt/C++ Desktop Edition

> Editor visual de UI para games, nativo en todas las plataformas. Rendering via QPainter + QGraphicsView — sin Chromium, sin dependencias de navegador, sin problemas de GPU.

## 📥 Downloads

| Plataforma | Archivo | Notas |
|---|---|---|
| **Windows** | `UIForger-Windows-x64.zip` | Windows 10+, x64 |
| **macOS** | `UIForger.dmg` | Universal Binary (Apple Silicon + Intel) |
| **Linux** | `UIForger-x86_64.AppImage` | Portable, sin instalación |

Descarga desde [Releases](https://github.com/dryaris/UIBuilderDesigner/releases).

---

## 🖥️ Requisitos del sistema

| Plataforma | Mínimo | Recomendado |
|---|---|---|
| **Windows** | Windows 10 (build 1903+), 4 GB RAM, OpenGL 3.3 | Windows 11, 8 GB RAM |
| **macOS** | macOS 12 Monterey+, 4 GB RAM, Metal GPU | macOS 14 Sonoma+ |
| **Linux** | Ubuntu 22.04+ / Fedora 38+, 4 GB RAM, OpenGL 3.3 | Ubuntu 24.04+ |

### Si se compila desde código fuente

| Herramienta | Versión | Notas |
|---|---|---|
| **CMake** | 3.20+ | Build system |
| **Qt** | 6.2+ (6.7 recomendado) | Core, Gui, Widgets, Svg |
| **Compilador C++** | C++20 compatible | MSVC 2019+, GCC 11+, Clang 13+ |

### Instalar dependencias por plataforma

**Windows (vcpkg):**
```powershell
git clone https://github.com/microsoft/vcpkg.git C:\vcpkg
C:\vcpkg\bootstrap-vcpkg.bat
C:\vcpkg\vcpkg install qt6-base qt6-svg
```

**macOS (Homebrew):**
```bash
brew install qt cmake
# Qt se instala en /opt/homebrew/Cellar/qt/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install qt6-base-dev qt6-svg-dev cmake g++ libgl1-mesa-dev
```

**Linux (Fedora):**
```bash
sudo dnf install qt6-qtbase-devel qt6-qtsvg-devel cmake gcc-c++ mesa-libGL-devel
```

---

## 🚀 Compilar y ejecutar

```bash
# Clonar
git clone https://github.com/dryaris/UIBuilderDesigner.git
cd UIBuilderDesigner/qt-ui-forger

# Build (CMake)
mkdir build && cd build

# Windows (MSVC)
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release

# macOS / Linux (Make)
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)

# Ejecutar
./UIForger          # Linux
./UIForger          # macOS
Release\UIForger.exe  # Windows
```

### Build con Qt instalado manualmente

Si Qt no está en el PATH estándar:
```bash
cmake .. -DCMAKE_PREFIX_PATH=/ruta/a/qt6
```

### Build con vcpkg (Windows)

```powershell
cmake .. -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build . --config Release
```

---

## ⌨️ Controles

### Canvas

| Acción | Control |
|---|---|
| **Zoom** | Scroll wheel |
| **Zoom in/out** | Ctrl++ / Ctrl+- |
| **Reset zoom** | Ctrl+0 (100%) |
| **Pan** | Click medio + drag |
| **Pan** | Click derecho + drag |
| **Pan** | Space + drag |

### Edición

| Acción | Atajo |
|---|---|
| **Nuevo proyecto** | Ctrl+N |
| **Abrir proyecto** | Ctrl+O |
| **Guardar proyecto** | Ctrl+S |
| **Deshacer** | Ctrl+Z |
| **Rehacer** | Ctrl+Y |
| **Añadir nodo** | N |
| **Eliminar nodo** | Delete |
| **Duplicar nodo** | Ctrl+D |
| **Seleccionar todo** | Ctrl+A |
| **Ayuda** | F1 |

### Navegación

| Acción | Atajo |
|---|---|
| **Buscar nodos** | Barra de búsqueda en TopBar |
| **Filtrar capas** | Barra de filtro en panel izquierdo |
| **Zoom a todo** | Ctrl+Shift+0 |
| **Zoom a selección** | Ctrl+1 |

---

## 🎨 Características

### Canvas
- **QGraphicsView** con rendering hardware-acelerado via QPainter
- **Zoom** con scroll wheel (0.5% a 1000%)
- **Pan** con click medio/derecho/space+drag
- **Drag & drop** de nodos con snap
- **Selección** por clic o marquee
- **MiniMap** en tiempo real (esquina inferior derecha)

### Nodos
- **Tipos disponibles**: container, button, label, title, image, slider, progressBar, healthBar, miniMap, tooltip, panel, text, icon, checkbox, input, dropdown, avatar, badge, divider, spacer, scrollArea, tabBar, dialog, toast, inventory, statDisplay, radarChart, damagePopup, staminaBar, abilitySlot, cooldownIndicator, compass, chatBox, leaderboard, radialMenu
- **Rendering**: gradiente de fondo, barra de color, label, badge de tipo, indicador de visibilidad condicional
- **Estilos**: background color, accent color, border, border radius, opacity, shadow, font family/size/weight/style, text align, text color
- **Estados**: locked (no se puede mover), hidden (no se renderiza)

### Inspector (panel derecho)
- Editar todas las propiedades de un nodo seleccionado
- Sección Node: ID, label, tipo, locked, hidden
- Sección Transform: posición X/Y, ancho/alto
- Sección Style: colores, border, fill, opacity, shadow
- Sección Typography: font family, size, bold, italic, align, text color
- Sección Conditional Visibility: reglas de visibilidad por variables de juego

### Panel de Capas (panel izquierdo)
- Árbol visual de todos los nodos
- Iconos por tipo de nodo
- Filtro de búsqueda
- Añadir/eliminar nodos
- Indicadores de estado (🔒 locked, 👁‍🗨 hidden)

### TopBar
- **File**: New, Open, Save
- **Edit**: Undo, Redo
- **Export**: HTML, PNG, Unity UXML, Unreal C++ header, Godot .tscn
- **View**: Grid toggle, MiniMap toggle
- **Search**: Búsqueda de nodos
- **Zoom**: Controles +/-/reset
- **Help**: Diálogo de ayuda

### Persistencia
- **Guardar/Abrir**: Archivos `.canvas` (JSON)
- **Autosave**: Cada 30 segundos a `autosave.canvas`
- **Compatible**: Formato JSON compatible con la versión web

### Exportadores

| Destino | Formato | Descripción |
|---|---|---|
| **HTML** | `.html` | HTML autocontenido con CSS inline, responsive |
| **PNG** | `.png` | Renderizado a imagen via QPainter |
| **Unity** | `.uxml` | Unity UI Toolkit XML |
| **Unreal** | `.h` | C++ header con UPROPERTY BindWidget |
| **Godot** | `.tscn` | Godot Scene Tree format |

### Escena Demo
Al iniciar, la app carga una escena demo con:
- Panel principal (RPG HUD)
- Barra de vida (healthBar) con gradiente verde
- Barra de stamina con gradiente azul
- Botones Attack/Defend con colores temáticos
- MiniMap con overview del canvas
- Tooltip "+250 Gold"
- Label "FPS: 60"

---

## 📁 Estructura del proyecto

```
qt-ui-forger/
├── CMakeLists.txt              # Build configuration
├── README.md                   # Este archivo
└── src/
    ├── main.cpp                # Entry point (dark theme, fonts, palette)
    ├── core/
    │   ├── ir.h                # Tipos: Node, Style, Connection, ConditionalRule
    │   ├── ir.cpp
    │   ├── scene_store.h       # Estado central (signals/slots, como Zustand)
    │   ├── scene_store.cpp
    │   ├── persistence.h       # Guardar/cargar archivos .canvas JSON
    │   └── persistence.cpp
    ├── canvas/
    │   ├── canvas_view.h       # QGraphicsView: zoom, pan, drag
    │   ├── canvas_view.cpp
    │   ├── node_item.h         # QGraphicsObject: pintar nodos
    │   ├── node_item.cpp
    │   ├── mini_map.h          # Widget minimap
    │   └── mini_map.cpp
    ├── ui/
    │   ├── mainwindow.h        # Ventana principal
    │   ├── mainwindow.cpp
    │   ├── topbar.h            # Barra de herramientas
    │   ├── topbar.cpp
    │   ├── inspector.h         # Panel de propiedades
    │   ├── inspector.cpp
    │   ├── tree_panel.h        # Panel de capas
    │   └── tree_panel.cpp
    └── export/
        ├── exporters.h         # Exportadores HTML/PNG/Unity/Unreal/Godot
        └── exporters.cpp
```

---

## 🔄 Comparación con la versión Web

| Aspecto | Web (React/Vite) | Desktop (Qt/C++) |
|---|---|---|
| **Rendering** | CSS DOM | QPainter + QGraphicsScene |
| **Canvas zoom** | Transform CSS | QTransform scale |
| **Estado** | Zustand | SceneStore (signals) |
| **Guardar** | File System Access API | QFile + QJsonDocument |
| **GPU** | Bugs de Chromium en NVIDIA/AMD | Sin problemas (rendering nativo) |
| **Offline** | Service Worker PWA | Siempre offline |
| **Performance** | Limitado por browser | Nativo C++ |
| **Memoria** | ~50MB (browser) | ~40MB (proceso nativo) |
| **Instalación** | Ninguna (URL) | Descargar y ejecutar |
| **Actualizaciones** | Automáticas (PWA) | Manual (descargar nuevo release) |

---

## 🐛 Solución de problemas

### No compila
- **"Qt6 not found"**: Instala Qt6 o pasa `-DCMAKE_PREFIX_PATH=/ruta/a/qt6`
- **"CMake 3.20+ required"**: Actualiza CMake con `cmake --version`
- **"C++20 not supported"**: Usa GCC 11+, Clang 13+, o MSVC 2019+

### App no inicia en Windows
- Verifica que `Qt6Core.dll`, `Qt6Gui.dll`, `Qt6Widgets.dll` estén en la misma carpeta que el `.exe`
- Usa `windeployqt UIForger.exe` para copiar todas las DLLs necesarias

### App no inicia en Linux
- Verifica que Qt6 esté instalado: `dpkg -l | grep qt6`
- Ejecuta con `QT_DEBUG_PLUGINS=1 ./UIForger` para ver errores de plugins

### Performance lenta
- Verifica que OpenGL esté disponible: `glxinfo | grep "OpenGL version"`
- En VMs sin GPU, usa `LIBGL_ALWAYS_SOFTWARE=1 ./UIForger`

---

## 📜 Licencia

MIT
