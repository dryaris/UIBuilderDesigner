# UI Forger — Guía completa de uso

> Editor visual de UI/UX offline, agnóstico y multi-destino. Diseña pantallas como en Figma; exporta a HTML, Unity, Unreal, Godot, Lottie y más.

---

## 1. Primeros pasos

### Abrir la app
Al abrir UI Forger por primera vez verás un **tour guiado** que te muestra las zonas del editor:
- **Barra superior (TopBar)**: menú Archivo, nombre del proyecto, herramientas, modo Preview, exportaciones.
- **Lienzo (Canvas)**: el espacio de diseño donde creas y editas pantallas.
- **Panel derecho**: pestañas Inspector / Diseño / Animar / Prototipo.
- **Panel de Capas (izquierda)**: árbol de nodos de la pantalla actual.
- **Barra de estado (abajo)**: información contextual (atajos rápidos, estado del preview).

Puedes reabrir el tour desde **Ayuda → Tour de la app**.

### Crear un proyecto
- **Archivo → Nuevo proyecto** (o `Cmd/Ctrl+N`): elige un tamaño de pantalla (1080p, 720p, 4K, ultrawide, iPhone, Android, web) o usa un **starter kit** pre-diseñado (Menú de juego, HUD móvil).
- Los starters incluyen nodos listos para editar: selecciona, mueve, cambia colores y textos.

### Abrir un proyecto existente
- **Archivo → Abrir `.canvas`** (o `Cmd/Ctrl+Shift+O`): selecciona un archivo `.canvas` (ZIP con `project.json` + assets).
- El proyecto se carga con todo su historial de undo/redo.

### Guardar
- **`Cmd/Ctrl+S`**: guarda el proyecto como `.canvas`.
- **Autosave**: la app guarda automáticamente cada 3 segundos en localStorage. Si cierras el navegador y vuelves a abrir, se recupera el último estado.

---

## 2. El lienzo (Canvas)

### Navegación
| Acción | Cómo |
|---|---|
| **Pan (mover vista)** | Mantén `Espacio` y arrastra, o usa la herramienta Mano (`H`) |
| **Zoom** | `Cmd/Ctrl + scroll` (hacia el cursor); `Shift+0` = 100%; `Shift+1` = ajustar a pantalla |
| **Zoom marquee** | Herramienta Zoom (`Z`) + arrastra una zona para ampliarla |

### Herramientas
| Tecla | Herramienta | Uso |
|---|---|---|
| `V` | **Select** | Seleccionar, mover, redimensionar nodos |
| `F` | **Frame** | Crear frames (contenedores) — clic = 120×120, arrastrar = tamaño libre |
| `T` | **Text** | Crear texto — clic = coloca un nodo de texto |
| `R` | **Rect** | Crear rectángulos |
| `O` | **Elipse** | Crear elipses |
| `L` | **Línea** | Crear líneas |
| `H` | **Mano** | Pan del lienzo |
| `Z` | **Zoom** | Zoom marquee |

### Reglas y guías
- Las **reglas** aparecen en la parte superior e izquierda del lienzo.
- Arrastra desde una regla para crear una **guía** (línea de referencia magnética).
- Las guías se **pegan** a nodos al arrastrar (snapping).
- Arrastra una guía fuera del lienzo para **borrarla**.
- Activa/desactiva reglas y guías con los iconos en la barra de herramientas.

---

## 3. Seleccionar y mover

### Selección
- **Clic**: selecciona un nodo (el más profundo que tenga "pintura" — fondo, borde, texto).
- **Shift + clic**: añade/quita de la selección (multi-selección).
- **Arrastrar en vacío** (marquee): selecciona todos los nodos que toca el rectángulo.
- **`Cmd/Ctrl+A`**: seleccionar todos los nodos de primer nivel.
- **`Esc`**: deseleccionar todo.

### Mover
- **Arrastra** un nodo seleccionado: se mueve con **pixel-snap** (solo enteros).
- **Flechas**: nudge 1px en la dirección.
- **`Shift + flechas`**: nudge 10px.
- Al mover, aparecen **guías de snap** (líneas rojas) que indican alineación con otros nodos.
- **Spacing hints**: aparecen las distancias exactas (en px) entre el nodo y sus vecinos.
- **`Shift` durante el arrastre**: restringe al eje dominante (horizontal o vertical).

### Redimensionar
- Selecciona un nodo → aparecen **8 handles** (esquinas + medianos).
- Arrastra un handle para redimensionar.
- `Shift + handle`: mantiene la proporción (proporción áurea).

---

## 4. Formas y texto

### Formas
- **Rectángulo** (`R`): crea un rectángulo con color de relleno.
- **Elipse** (`O`): crea una elipse.
- **Línea** (`L`): crea una línea (horizontal/vertical/diagonal).
- Todas las formas son **editables** en el Inspector: color, borde, esquinas redondeadas, sombra, opacidad.

### Texto
- **Herramienta Text** (`T`): clic en el lienzo para crear un nodo de texto.
- **Doble clic** en un nodo de texto: editar inline (escribes directamente en el lienzo).
- **`Escape`** o clic fuera: termina la edición.
- En el Inspector: familia, peso, tamaño, tracking, line-height, alineación, transform.
- **Autosize**: el texto se ajusta al contenido cuando escribes.

### Vectores (SVG)
- **Arrastra un archivo `.svg`** al lienzo: se importa como nodo vector editable.
- **Archivo → Importar SVG**: importa y centra en la vista.
- Los vectores se renderizan como SVG puro (WYSIWYG exacto con el exportador HTML).
- Soporta: paths con arcos, gradientes, transformaciones, grupos, texto básico.

---

## 5. Estilos visuales

### Color
- Selecciona un nodo → en el Inspector, haz clic en el chip de color del relleno.
- **Color picker** con HEX/RGB/HSL.
- **Guardar como token**: clic en "+" junto al chip → el color se guarda en el sistema de tokens.
- **Tokens**: los colores se aplican como referencias `$nombre` — cambia el token y se actualizan todos los nodos que lo usen.

### Gradientes
- En el Inspector, cambia el tipo de relleno a **Lineal** o **Radial**.
- Configura ángulo (lineal) y paradas de color (posiciones 0–100%).
- Los gradientes se exportan igual en HTML, PNG y canvas.

### Sombras
- **Drop shadow**: offsetX, offsetY, blur, spread, color, inset.
- **Inner shadow**: sombra interior (inset).
- Múltiples sombras apilables.

### Bordes y radios
- **Stroke**: ancho, color, estilo.
- **Border radius**: radio de las esquinas (individual o uniforme).

### Mezcla y filtros
- **Blend mode**: multiply, screen, overlay, etc.
- **Blur**: desenfoque gaussiano (filtro CSS).

---

## 6. Design Tokens

Los tokens son **valores reutilizables** del sistema de diseño. Se gestionan en la pestaña **Diseño** del panel derecho.

### Tokens disponibles
| Tipo | Ejemplo | Uso |
|---|---|---|
| **Colores** | `primary: #7C5CFF` | Fondo, texto, bordes |
| **Radios** | `small: 4px` | Esquinas redondeadas |
| **Espaciado** | `md: 16px` | Padding, gaps |
| **Tipografía** | `heading: Inter 700 24px` | Fuentes |
| **Sombras** | `elevated: 0 4px 12px rgba(0,0,0,0.3)` | Sombras |
| **Easings** | `smooth: cubic-bezier(0.4, 0, 0.2, 1)` | Transiciones y animaciones |

### Crear un token
1. En la pestaña **Diseño**, expande la sección del tipo (Colores, Radios, etc.).
2. Escribe un nombre y un valor.
3. El token aparece como chip en el Inspector — haz clic para aplicarlo a cualquier nodo.

### Editar un token
- Cambia el valor en la pestaña Diseño → **todos los nodos que lo usen se actualizan automáticamente**.

### Exportar tokens
- **Archivo → Exportar tokens**: genera un ZIP con:
  - `tokens.json` (estándar W3C DTCG)
  - `tokens.css` (custom properties CSS listas para usar)
  - Proyecto Style Dictionary compilable con `npx style-dictionary build`

---

## 7. Componentes y variantes

### Crear un componente
1. Selecciona un nodo (o varios → se agrupan automáticamente).
2. **Clic derecho → Crear componente** (o `Cmd/Ctrl+Shift+C` → guarda en la librería).
3. El componente aparece en la pestaña **Diseño → Librería**.

### Insertar una instancia
- En la pestaña Diseño → Librería, haz clic en un componente → se inserta en el **centro del lienzo**.
- La instancia es una **copia independiente**: puedes editarla sin afectar la librería.

### Variantes
- Selecciona un componente → **Clic derecho → Añadir variante** (ej: "Primary", "Secondary", "Danger").
- Cada variante es una versión del componente con estilos diferentes.
- Las variantes aparecen como chips en la librería → inserta cualquiera.

### Actualizar componente
- Edita una instancia del componente en el lienzo.
- **Clic derecho → Actualizar componente**: la definición de la librería se actualiza.
- Las **futuras instancias** heredarán los cambios (las existentes no se modifican).

---

## 8. Auto-layout (flexbox visual)

El auto-layout apila y distribuye hijos automáticamente, como en Figma.

### Activar
1. Selecciona un **frame**.
2. En el Inspector → sección **Auto-layout**: activa el interruptor.

### Configurar
| Opción | Qué hace |
|---|---|
| **Dirección** | Horizontal (→) o Vertical (↓) |
| **Espaciado** | Distancia entre hijos (gap) |
| **Padding interior** | Espacio dentro del frame (4 campos: top, right, bottom, left) |
| **Alineación principal** | Inicio / Centro / Fin / Repartir (justify-content) |
| **Alineación cruzada** | Arriba / Centro / Abajo / Estirar (align-items) |
| **Envolver al rebosar** | Wrap cuando los hijos no caben (flex-wrap) |
| **Tamaño** | Fijo (tamaño manual) o Contenido (hug — se ajusta al contenido) |

### Reordenar hijos
- Los hijos de auto-layout **no se arrastran libremente** (como en Figma).
- Reordena con las **flechas del panel Capas** o con `[` / `]`.
- Su posición X/Y queda deshabilitada en el Inspector (la decide el layout).

---

## 9. Estados interactivos

Puedes definir cómo se ve un nodo en diferentes estados de interacción.

### Estados disponibles
| Estado | Cuándo se activa |
|---|---|
| **Hover** | El cursor está sobre el nodo (preview mode) |
| **Pressed** | Se mantiene el clic sobre el nodo |
| **Disabled** | El nodo está deshabilitado |
| **Focused** | El nodo tiene foco de teclado |

### Configurar
1. Selecciona un nodo → en el Inspector → sección **Estados**.
2. Activa un estado (ej: Hover) → edita los estilos que cambian (color, opacidad, escala, sombra).
3. Configura la **transición**: duración (ms) + curva de easing.

### Previsualizar
- En el panel Diseño, selecciona un estado en el chip → el lienzo muestra cómo se ve.
- En **modo Preview** (`▶` en la barra superior), pasa el cursor sobre nodos para ver los estados en vivo.

---

## 10. Animación (timelines y keyframes)

### Crear una línea de tiempo
1. Pestaña **Animar** → "Crear línea de tiempo".
2. Escribe un nombre (ej: "Entrada del título").

### Capturar keyframes
1. Selecciona un nodo en el lienzo.
2. Mueve el cursor de tiempo (barra deslizante en el panel Animar) al instante deseado.
3. Haz clic en **Capturar keyframe** → guarda la posición, opacidad, escala, color, etc. en ese instante.
4. Repite para otros instantes y nodos.

### Reproducir
- Haz clic en **▶** → la animación se reproduce en el lienzo (Web Animations API).
- **Loop**: activa el interruptor para repetir la animación.
- **Easing por tramo**: cada keyframe puede tener su propia curva de easing.

### Editor de easing visual
- En la pestaña **Diseño → Easings**: cada curva es una gráfica con dos puntos de control **arrastrables** (estilo After Effects).
- **Presets de un clic**: Lineal, Entrada, Salida, Entrada y salida, Resorte (con sobre-paso), Brusco.
- **Botón Probar**: anima una bolita sobre la curva para sentir el ritmo antes de aplicar.

---

## 11. Prototipado entre pantallas

### Crear pantallas
- Pestaña **Prototipo** → "Nueva pantalla" o "Duplicar pantalla".
- Cada pantalla se edita individualmente en el lienzo (con su propio undo).

### Conectar pantallas
1. En la pestaña Prototipo, selecciona un nodo en el lienzo.
2. Haz clic en "Conectar a..." → elige la pantalla destino.
3. Configura la **transición**: duración (ms) + curva de easing.

### Previsualizar
- **Modo Preview** (`▶`): pulsa un nodo conectado → navega a su pantalla con la transición configurada.
- El **exportador HTML** reproduce el mismo flujo de navegación entre pantallas.

---

## 12. Constraints (responsive)

Los constraints definen cómo reacciona un nodo al cambiar el tamaño de su pantalla.

### Configurar
1. Selecciona un nodo → en el Inspector → sección **Responsive**.
2. Elige el comportamiento por eje:
   - **Fijo a la izquierda/derecha**: mantiene distancia al borde.
   - **Fijo arriba/abajo**: mantiene distancia al borde.
   - **Centrado**: se mantiene centrado.
   - **Estirar**: se estira para llenar el espacio.
   - **Escalar**: mantiene la proporción (escala proporcional).

### Aplicar
- Redimensiona un frame arrastrando un handle o usa **"Redimensionar a"** en la sección Pantalla.
- Los hijos reaccionan en vivo según sus constraints.
- **Exportador HTML**: emite CSS responsive real (left/right/bottom/%, width auto).
- **Unreal UMG**: mapea los constraints a **Anchors** nativos.

---

## 13. Temas múltiples

Puedes crear variantes de color del proyecto (light/dark/...).

### Crear un tema
1. Pestaña **Diseño → Temas** → "Añadir tema".
2. Escribe un nombre (ej: "Dark Mode").
3. El tema se crea con los colores actuales.

### Editar un tema
- Haz clic en un tema → se activa.
- Edita los tokens de color en la pestaña Diseño → los cambios se guardan en el tema activo.
- Cambia entre temas con los botones de la sección Temas.

### Exportar
- El export de tokens incluye un DTCG + CSS **por tema**.

---

## 14. Exportación

### HTML/CSS/JS
- **Archivo → Exportar HTML**: genera un `.html` autocontenido que:
  - Escala la pantalla al viewport (como Figma).
  - Incluye estados hover/pressed como pseudo-clases CSS.
  - Incluye animaciones como `@keyframes` o Web Animations API.
  - Incluye tokens como custom properties CSS (`--primary`, etc.).
  - Incluye el flujo de prototipo (navegación entre pantallas).
  - Código legible y editable (una clase por nodo).

### PNG / paquete web
- **Archivo → Exportar PNG** (o palette `⌘K`): genera PNGs 1x/2x/3x pixel-perfect.
- **Paquete web**: ZIP con HTML + PNGs, listo para subir a cualquier hosting.

### Unity UI Toolkit (UXML + USS)
- **Archivo → Exportar Unity**: genera un ZIP con:
  - `scene.uxml` (árbol de la escena).
  - `styles.uss` (estilos + tokens como variables USS).
  - Estados → pseudo-clases USS (`:hover`, `:pressed`).
  - Auto-layout → flexbox nativo de UI Toolkit.
  - GUIA.txt: cómo reconstruir timelines (corrutina + AnimationCurve).

### Unreal UMG
- **Archivo → Exportar UMG**: genera un ZIP con:
  - `manifest.json` (árbol de widgets: Canvas Panel, Border, TextBlock, Image).
  - Constraints → **Anchors** nativos.
  - GUIA.txt paso a paso para reconstruir en Blueprint.

### Godot Engine
- **Archivo → Exportar Godot**: genera un ZIP con:
  - `scene.tscn` (árbol de nodos Control: PanelContainer, Label, ColorRect, etc.).
  - `theme.tres` (colores, radios, spacing, font sizes).
  - Constraints → **Anchors** responsive.
  - Auto-layout → Container nodes (HBoxContainer, VBoxContainer, FlowContainer).
  - GUIA.txt paso a paso.

### Lottie
- **Archivo → Exportar Lottie** (o palette `⌘K`): genera JSON Bodymovin (`.lottie`/`.json`) con:
  - Keyframes de posición, opacidad, escala, color, tamaño, rotación.
  - Easing por tramo desde los tokens.
  - Texto incluido.
  - Se reproduce igual en After Effects, web (lottie-web) y móvil (lottie-ios/android).

### Design Tokens (DTCG + Style Dictionary)
- **Archivo → Exportar tokens**: genera un ZIP con:
  - `tokens.json` (estándar W3C DTCG: `$type/$value`).
  - `tokens.css` (custom properties CSS listas para usar).
  - Proyecto Style Dictionary compilable con `npx style-dictionary build`.
  - Con temas múltiples: un DTCG + CSS por tema.

### PDF de revisión
- **Archivo → Exportar PDF de revisión**: genera un documento imprimible con:
  - Cabecera del proyecto y estado de la revisión.
  - Lista de anotaciones (pin, pantalla, nota, estado ✓/pendiente).
  - Ficha de especificaciones por pantalla (medidas, colores, tipografía, sombras).
  - Se abre el diálogo de impresión → "Guardar como PDF".
  - Fallback: descarga como `.html` autocontenido si el popup está bloqueado.

---

## 15. Anotaciones de review

### Modo anotar
1. Pestaña **Prototipo** → "Modo anotar" (o palette `⌘K` → "anotar").
2. Haz clic en la pantalla → se coloca un **pin numerado**.
3. Escribe la nota en la pestaña Prototipo.
4. Marca como **resuelta** ✓ o bórrala.

### Gestión
- Los pins se guardan en el proyecto y se seleccionan desde el lienzo o la lista.
- Cada pin muestra su número y color.

---

## 16. Tema del editor

- **Tema claro/oscuro**: cambia desde el icono en la barra de herramientas.
- **Fondo del canvas**: configurable (gris claro, oscuro, cuadrícula).
- **Rulers**: activa/desactiva desde la barra de herramientas.

---

## 17. Atajos de teclado completos

### Navegación
| Atajo | Acción |
|---|---|
| `Espacio` (mantenido) | Pan |
| `Cmd/Ctrl + scroll` | Zoom al cursor |
| `Shift+1` | Ajustar a pantalla |
| `Shift+0` | Zoom 100% |

### Edición
| Atajo | Acción |
|---|---|
| `Flechas` | Nudge 1px |
| `Shift + flechas` | Nudge 10px |
| `Cmd/Ctrl + D` | Duplicar (con offset del último nudge) |
| `Cmd/Ctrl + Z` | Deshacer |
| `Cmd/Ctrl + Shift+Z` / `Y` | Rehacer |
| `Cmd/Ctrl + A` | Seleccionar todo |
| `Delete` / `Backspace` | Eliminar |
| `Esc` | Deseleccionar / salir del modo actual |

### Herramientas
| Tecla | Herramienta |
|---|---|
| `V` | Select |
| `F` | Frame |
| `T` | Text |
| `R` | Rect |
| `O` | Elipse |
| `L` | Línea |
| `H` | Mano (pan) |
| `Z` | Zoom |

### Alineación y distribución
| Atajo | Acción |
|---|---|
| `Alt+A` | Alinear izquierda |
| `Alt+D` | Alinear derecha |
| `Alt+W` | Alinear arriba |
| `Alt+S` | Alinear abajo |
| `Alt+C` | Centrar horizontal |
| `Alt+M` | Centrar vertical |
| `Alt+Shift+H` | Distribuir horizontal |
| `Alt+Shift+V` | Distribuir vertical |

### Estilos y componentes
| Atajo | Acción |
|---|---|
| `Cmd/Ctrl + Shift+C` | Copiar estilo |
| `Cmd/Ctrl + Shift+V` | Pegar estilo |
| `Cmd/Ctrl + G` | Agrupar |
| `Cmd/Ctrl + Shift+G` | Desagrupar |

### Capas y z-order
| Atajo | Acción |
|---|---|
| `[` | Mover capa atrás |
| `]` | Mover capa adelante |
| `Cmd/Ctrl + L` | Bloquear/desbloquear nodo |

### Voltear
| Atajo | Acción |
|---|---|
| `Cmd/Ctrl + Shift+H` | Voltear horizontal |
| `Cmd/Ctrl + Shift+J` | Voltear vertical |

### Otros
| Atajo | Acción |
|---|---|
| `Cmd/Ctrl + K` | Palette de acciones |
| `Cmd/Ctrl + /` | Modal de atajos |
| `Cmd/Ctrl + S` | Guardar `.canvas` |
| `Cmd/Ctrl + Shift+O` | Abrir `.canvas` |

---

## 18. Bloqueo y visibilidad de nodos

### En el panel Capas
- **Ojo** (👁): clic para mostrar/ocultar un nodo (ocultos no se exportan ni se pueden seleccionar).
- **Candado** (🔒): clic para bloquear/desbloquear un nodo (bloqueados no se pueden mover ni redimensionar).
- Atajo: `Cmd/Ctrl + L` para bloquear/desbloquear el nodo seleccionado.

### Comportamiento
- Nodos **ocultos**: no se renderizan en el canvas ni se exportan.
- Nodos **bloqueados**: no responden a drag, resize, nudge, delete. Se pueden seleccionar para ver sus propiedades.

---

## 19. Persistencia y formato

### Formato `.canvas`
Un archivo `.canvas` es un **ZIP** que contiene:
- `project.json`: el IR completo (nodos, tokens, timelines, pantallas, conexiones, anotaciones).
- `assets/`: binarios (imágenes) por hash SHA-256 (deduplicación automática).
- `thumb.png`: miniatura del proyecto.
- `annotations.json`: anotaciones de review.

### Versionado
- El IR tiene un `version` (SemVer) y un sistema de migraciones puras.
- Al abrir un proyecto viejo, se migra automáticamente a la versión actual.

### Recuperación
- Si cierras el navegador abruptamente, el autosave (localStorage) recupera el último estado.
- En Tauri (escritorio), el guardado es atómico (`.tmp` + rename).

---

## 20. Formato de proyecto (IR)

El **Intermediate Representation** (IR) es la única fuente de verdad. Todo (canvas, exportadores, autosave, preview) lee y escribe este modelo.

### Estructura principal
```
CanvasDoc
├── version: string (SemVer)
├── tokens: { colors, radii, spacing, typography, shadows, easings }
├── library: { components, variants }
├── timelines: Timeline[] (keyframes con easing, loop)
├── assets: Asset[] (hash SHA-256)
├── screens: Node[] (pantallas adicionales del prototipo)
├── connections: PrototypeConnection[] (enlaces entre pantallas)
├── annotations: Annotation[] (pins de review)
├── themes: Theme[] (variantes de color)
├── root: Node (la pantalla principal / artboard)
└── ... (campos de fases futuras ya tipados)
```

### Nodo
```
Node
├── id: string
├── type: "frame" | "text" | "image" | "component" | "shape" | "vector"
├── name: string (visible en capas)
├── ref?: string (referencia a componente: "comp:libId")
├── text?: string (solo para type "text")
├── path?: string (SVG path para type "vector")
├── style: Style (posición, tamaño, colores, flexbox, etc.)
├── states?: Record<StateKey, { style, transition }>
├── animations?: Animation[]
├── constraints?: Constraints (responsive)
├── children: Node[]
├── hidden?: boolean
└── locked?: boolean
```

---

## 21. Starter kits

Los starter kits son **pantallas pre-diseñadas** que incluyen:
- **Menú de juego 1080p**: título, botones, fondo con gradiente — listo para animar.
- **HUD móvil**: barra de vida, botones de acción, minimapa.

Al abrir un starter, tienes una pantalla completa con nodos, colores y layout listos para personalizar.

---

## 22. Rendimiento

- **NodeView memoizado**: cada nodo solo se re-renderiza cuando cambian sus propiedades específicas (no toda la escena).
- **Sesiones de drag**: durante el arrastre NO se muta el documento — la UI muestra una vista previa en vivo y al soltar se hace **un solo commit** (una entrada de undo).
- **Selectores finos**: `useShallow` compara valores por contenido, no por referencia.

---

## 23. Solución de problemas

| Problema | Solución |
|---|---|
| El canvas está vacío | `Shift+1` para ajustar a pantalla |
| Un nodo no se puede mover | Está bloqueado (🔒) — `Cmd/Ctrl+L` para desbloquear |
| El undo no funciona | Verifica que `enablePatches()` esté habilitado (ya está por defecto) |
| El SVG no se importa | Verifica que sea válido SVG 1.1 (max 2 MB) |
| La animación no se ve | Activa el modo Preview (`▶`) y verifica que haya keyframes |
| El export no incluye estilos | Verifica que los tokens estén definidos en la pestaña Diseño |
