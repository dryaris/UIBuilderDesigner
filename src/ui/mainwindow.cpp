#include "mainwindow.h"
#include "topbar.h"
#include "inspector.h"
#include "tree_panel.h"
#include "../canvas/canvas_view.h"
#include "../canvas/mini_map.h"
#include "../core/scene_store.h"
#include "../core/persistence.h"
#include "../core/ir.h"
#include "../export/exporters.h"

#include <QApplication>
#include <QSplitter>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFileDialog>
#include <QMessageBox>
#include <QShortcut>
#include <QKeySequence>
#include <QStatusBar>
#include <QJsonDocument>

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
    , m_store(new SceneStore(this))
{
    setWindowTitle("UI Forger");
    resize(1400, 900);
    setMinimumSize(1000, 600);

    setupUI();
    setupMenus();
    setupShortcuts();
    loadDemoScene();

    // Autosave timer
    m_autosaveTimer = new QTimer(this);
    connect(m_autosaveTimer, &QTimer::timeout, this, [this]() {
        Persistence::saveToFile("autosave.canvas", m_store->nodes(),
                                m_store->connections(), m_store->projectName());
    });
    m_autosaveTimer->start(30000); // 30 seconds

    statusBar()->showMessage("Ready", 3000);
}

void MainWindow::setupUI() {
    auto* central = new QWidget;
    auto* mainLayout = new QVBoxLayout(central);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);

    // TopBar
    m_topBar = new TopBar;
    connect(m_topBar, &TopBar::newProject, this, &MainWindow::onNewProject);
    connect(m_topBar, &TopBar::openProject, this, &MainWindow::onOpenProject);
    connect(m_topBar, &TopBar::saveProject, this, &MainWindow::onSaveProject);
    connect(m_topBar, &TopBar::exportHTML, this, &MainWindow::onExportHTML);
    connect(m_topBar, &TopBar::exportPNG, this, &MainWindow::onExportPNG);
    connect(m_topBar, &TopBar::exportUnity, this, &MainWindow::onExportUnity);
    connect(m_topBar, &TopBar::exportUnreal, this, &MainWindow::onExportUnreal);
    connect(m_topBar, &TopBar::exportGodot, this, &MainWindow::onExportGodot);
    connect(m_topBar, &TopBar::zoomIn, this, [this]() { m_store->setZoom(m_store->zoom() * 1.2f); });
    connect(m_topBar, &TopBar::zoomOut, this, [this]() { m_store->setZoom(m_store->zoom() / 1.2f); });
    connect(m_topBar, &TopBar::zoomReset, this, [this]() { m_store->setZoom(1.0f); });
    connect(m_topBar, &TopBar::searchNodes, this, &MainWindow::onSearchNodes);
    connect(m_topBar, &TopBar::toggleGrid, this, &MainWindow::onToggleGrid);
    connect(m_topBar, &TopBar::toggleMiniMap, this, &MainWindow::onToggleMiniMap);
    connect(m_topBar, &TopBar::helpClicked, this, &MainWindow::onHelp);
    connect(m_topBar, &TopBar::undo, m_store->undoStack(), &QUndoStack::undo);
    connect(m_topBar, &TopBar::redo, m_store->undoStack(), &QUndoStack::redo);
    mainLayout->addWidget(m_topBar);

    // Content area
    auto* content = new QSplitter(Qt::Horizontal);

    // Left panel: Tree
    m_treePanel = new TreePanel;
    connect(m_treePanel, &TreePanel::nodeSelected, this, &MainWindow::onNodeSelected);
    connect(m_treePanel, &TreePanel::addNodeRequested, this, &MainWindow::onAddNode);
    connect(m_treePanel, &TreePanel::deleteNodeRequested, this, &MainWindow::onDeleteNode);
    connect(m_treePanel, &TreePanel::duplicateNodeRequested, this, &MainWindow::onDuplicateNodeById);
    content->addWidget(m_treePanel);

    // Center: Canvas + MiniMap
    auto* canvasArea = new QWidget;
    auto* canvasLayout = new QVBoxLayout(canvasArea);
    canvasLayout->setContentsMargins(0, 0, 0, 0);

    m_canvas = new CanvasView;
    connect(m_canvas, &CanvasView::nodeSelected, this, &MainWindow::onNodeSelected);
    connect(m_canvas, &CanvasView::selectionChanged, this, &MainWindow::onMultiSelectionChanged);
    connect(m_canvas, &CanvasView::nodeMoved, this, &MainWindow::onNodeMoved);
    connect(m_canvas, &CanvasView::duplicateRequested, this, &MainWindow::onDuplicateNodeById);
    connect(m_canvas, &CanvasView::deleteRequested, this, &MainWindow::onDeleteNodeById);
    connect(m_canvas, &CanvasView::copyStyleRequested, this, &MainWindow::onCopyStyle);
    connect(m_canvas, &CanvasView::pasteStyleRequested, this, &MainWindow::onPasteStyle);
    canvasLayout->addWidget(m_canvas);

    content->addWidget(canvasArea);

    // Right panel: Inspector
    m_inspector = new Inspector;
    content->addWidget(m_inspector);

    content->setStretchFactor(0, 0); // Tree: fixed
    content->setStretchFactor(1, 1); // Canvas: expand
    content->setStretchFactor(2, 0); // Inspector: fixed

    mainLayout->addWidget(content, 1);

    // MiniMap overlay
    m_miniMap = new MiniMap;
    m_miniMap->setParent(m_canvas);
    m_canvas->setMiniMap(m_miniMap);
    m_miniMap->move(m_canvas->width() - 212, 12);

    setCentralWidget(central);

    // Store signals
    connect(m_store, &SceneStore::nodesChanged, this, &MainWindow::updateUI);
    connect(m_store, &SceneStore::selectionChanged, this, [this](const QString& id) {
        const Node* node = nullptr;
        for (const auto& n : m_store->nodes()) {
            if (n.id == id.toStdString()) { node = &n; break; }
        }
        m_inspector->setNode(node);
    });
    connect(m_store, &SceneStore::projectNameChanged, this, [this](const QString& name) {
        m_topBar->setProjectName(name);
        setWindowTitle(name + " — UI Forger");
    });
    connect(m_store, &SceneStore::zoomChanged, this, [this](float z) {
        m_topBar->setZoom(z);
        statusBar()->showMessage(QString("Zoom: %1%").arg((int)(z * 100)), 2000);
    });

    // Inspector property changes -> update store
    connect(m_inspector, &Inspector::propertyChanged, this, [this](const QString& nodeId, const QString& prop, const QVariant& value) {
        m_store->updateNode(nodeId, [&](Node& n) {
            if (prop == "label") n.label = value.toString().toStdString();
            else if (prop == "type") n.type = value.toString().toStdString();
            else if (prop == "x") n.x = value.toFloat();
            else if (prop == "y") n.y = value.toFloat();
            else if (prop == "width") n.width = value.toFloat();
            else if (prop == "height") n.height = value.toFloat();
            else if (prop == "backgroundColor") n.style.backgroundColor = value.toString().toStdString();
            else if (prop == "color") n.style.color = value.toString().toStdString();
            else if (prop == "borderStyle") n.style.borderStyle = value.toString().toStdString();
            else if (prop == "borderWidth") n.style.borderWidth = value.toInt();
            else if (prop == "borderRadius") n.style.borderRadius = value.toInt();
            else if (prop == "opacity") n.style.opacity = value.toFloat() / 100.0f;
            else if (prop == "fontSize") n.style.fontSize = value.toInt();
            else if (prop == "fontWeight") n.style.fontWeight = value.toString().toStdString();
            else if (prop == "fontStyle") n.style.fontStyle = value.toString().toStdString();
            else if (prop == "textAlign") n.style.textAlign = value.toString().toStdString();
            else if (prop == "textColor") n.style.textColor = value.toString().toStdString();
            else if (prop == "fill") n.style.fill = value.toString().toStdString();
            else if (prop == "shadow") n.style.shadow = value.toString().toStdString();
            else if (prop == "locked") n.locked = value.toBool();
            else if (prop == "hidden") n.hidden = value.toBool();
        });
    });
}

void MainWindow::setupMenus() {
    auto* fileMenu = menuBar()->addMenu("&File");
    fileMenu->addAction("&New Project", this, &MainWindow::onNewProject, QKeySequence::New);
    fileMenu->addAction("&Open...", this, &MainWindow::onOpenProject, QKeySequence::Open);
    fileMenu->addAction("&Save", this, &MainWindow::onSaveProject, QKeySequence::Save);
    fileMenu->addSeparator();
    fileMenu->addAction("Export &HTML...", this, &MainWindow::onExportHTML);
    fileMenu->addAction("Export &PNG...", this, &MainWindow::onExportPNG);
    fileMenu->addSeparator();
    fileMenu->addAction("E&xit", this, &QMainWindow::close, QKeySequence::Quit);

    auto* editMenu = menuBar()->addMenu("&Edit");
    editMenu->addAction("&Undo", m_store->undoStack(), &QUndoStack::undo, QKeySequence::Undo);
    editMenu->addAction("&Redo", m_store->undoStack(), &QUndoStack::redo, QKeySequence::Redo);
    editMenu->addSeparator();
    editMenu->addAction("&Add Node", this, &MainWindow::onAddNode, QKeySequence("N"));
    editMenu->addAction("&Delete Node", this, &MainWindow::onDeleteNode, QKeySequence::Delete);
    editMenu->addAction("&Duplicate", this, &MainWindow::onDuplicateNode, QKeySequence("Ctrl+D"));

    auto* viewMenu = menuBar()->addMenu("&View");
    viewMenu->addAction("&Zoom In", this, [this]() { m_store->setZoom(m_store->zoom() * 1.2f); }, QKeySequence::ZoomIn);
    viewMenu->addAction("Zoom &Out", this, [this]() { m_store->setZoom(m_store->zoom() / 1.2f); }, QKeySequence::ZoomOut);
    viewMenu->addAction("&Reset Zoom", this, [this]() { m_store->setZoom(1.0f); }, QKeySequence("Ctrl+0"));
    viewMenu->addSeparator();
    auto* snapAction = viewMenu->addAction("Snap to &Grid", this, &MainWindow::onToggleSnap);
    snapAction->setCheckable(true);
    snapAction->setChecked(true);
    auto* gridAction = viewMenu->addAction("Show &Grid Lines", this, &MainWindow::onToggleGrid);
    gridAction->setCheckable(true);
    gridAction->setChecked(true);

    menuBar()->setStyleSheet("QMenuBar { background: #1a1d2e; color: #e6e6f0; border-bottom: 1px solid #2a2d3e; }"
                             "QMenuBar::item:selected { background: #2a2d3e; }"
                             "QMenu { background: #1a1d2e; color: #e6e6f0; border: 1px solid #2a2d3e; }"
                             "QMenu::item:selected { background: #2a3d5e; }");
}

void MainWindow::setupShortcuts() {
    // Space + drag to pan is handled by CanvasView
    // Additional shortcuts
    auto* helpShortcut = new QShortcut(QKeySequence("F1"), this);
    connect(helpShortcut, &QShortcut::activated, this, &MainWindow::onHelp);
}

void MainWindow::loadDemoScene() {
    QList<Node> demoNodes;

    Node panel;
    panel.id = "panel_main"; panel.type = "panel"; panel.label = "Main Panel";
    panel.x = 40; panel.y = 40; panel.width = 800; panel.height = 600;
    panel.style.backgroundColor = "#1e2130"; panel.style.borderRadius = 12;
    demoNodes.append(panel);

    Node title;
    title.id = "title_hp"; title.type = "title"; title.label = "Health";
    title.x = 80; title.y = 100; title.width = 160; title.height = 40;
    title.style.color = "#ef4444"; title.style.fontSize = 18; title.style.fontWeight = "bold";
    demoNodes.append(title);

    Node healthBar;
    healthBar.id = "bar_health"; healthBar.type = "healthBar"; healthBar.label = "100 / 100";
    healthBar.x = 80; healthBar.y = 150; healthBar.width = 400; healthBar.height = 24;
    healthBar.style.backgroundColor = "#1a1a2e"; healthBar.style.color = "#22c55e";
    healthBar.style.borderRadius = 12;
    demoNodes.append(healthBar);

    Node staminaBar;
    staminaBar.id = "bar_stamina"; staminaBar.type = "staminaBar"; staminaBar.label = "80 / 100";
    staminaBar.x = 80; staminaBar.y = 190; staminaBar.width = 300; staminaBar.height = 20;
    staminaBar.style.backgroundColor = "#1a1a2e"; staminaBar.style.color = "#3b82f6";
    staminaBar.style.borderRadius = 10;
    demoNodes.append(staminaBar);

    Node btnAttack;
    btnAttack.id = "btn_attack"; btnAttack.type = "button"; btnAttack.label = "Attack";
    btnAttack.x = 80; btnAttack.y = 280; btnAttack.width = 140; btnAttack.height = 50;
    btnAttack.style.backgroundColor = "#7f1d1d"; btnAttack.style.color = "#fca5a5";
    btnAttack.style.borderRadius = 8;
    demoNodes.append(btnAttack);

    Node btnDefend;
    btnDefend.id = "btn_defend"; btnDefend.type = "button"; btnDefend.label = "Defend";
    btnDefend.x = 240; btnDefend.y = 280; btnDefend.width = 140; btnDefend.height = 50;
    btnDefend.style.backgroundColor = "#1e3a5f"; btnDefend.style.color = "#93c5fd";
    btnDefend.style.borderRadius = 8;
    demoNodes.append(btnDefend);

    Node minimap;
    minimap.id = "minimap"; minimap.type = "miniMap"; minimap.label = "Mini Map";
    minimap.x = 580; minimap.y = 480; minimap.width = 220; minimap.height = 140;
    minimap.style.backgroundColor = "#0d0f16"; minimap.style.borderRadius = 8;
    minimap.style.borderStyle = "solid"; minimap.style.borderWidth = 1;
    demoNodes.append(minimap);

    Node labelFPS;
    labelFPS.id = "label_fps"; labelFPS.type = "label"; labelFPS.label = "FPS: 60";
    labelFPS.x = 80; labelFPS.y = 560; labelFPS.width = 100; labelFPS.height = 30;
    labelFPS.style.fontSize = 12; labelFPS.style.color = "#6b7280";
    demoNodes.append(labelFPS);

    Node tooltip;
    tooltip.id = "tooltip_gold"; tooltip.type = "tooltip"; tooltip.label = "+250 Gold";
    tooltip.x = 500; tooltip.y = 200; tooltip.width = 120; tooltip.height = 36;
    tooltip.style.backgroundColor = "#854d0e"; tooltip.style.color = "#fde68a";
    tooltip.style.borderRadius = 6; tooltip.style.opacity = 0.9f;
    demoNodes.append(tooltip);

    m_store->setNodes(demoNodes);
    m_store->setProjectName("RPG HUD Demo");
}

void MainWindow::updateUI() {
    m_treePanel->setNodes(m_store->nodes(), m_store->selectedNodeId());
    m_canvas->setNodes(m_store->nodes());
    m_miniMap->setNodes(m_store->nodes());
    m_topBar->setProjectName(m_store->projectName());
    m_topBar->setNodeCount(m_store->nodes().size());
}

void MainWindow::onNewProject() {
    if (QMessageBox::question(this, "New Project", "Discard current work?",
                              QMessageBox::Yes | QMessageBox::No) == QMessageBox::Yes) {
        m_store->clear();
        m_store->setProjectName("Untitled");
    }
}

void MainWindow::onOpenProject() {
    QString path = QFileDialog::getOpenFileName(this, "Open Canvas", "",
                                                "UI Forger Files (*.canvas);;All Files (*)");
    if (path.isEmpty()) return;

    QList<Node> nodes;
    QList<Connection> conns;
    QString name;
    if (Persistence::loadFromFile(path, nodes, conns, name)) {
        m_store->setNodes(nodes);
        m_store->setConnections(conns);
        m_store->setProjectName(name);
        statusBar()->showMessage("Opened: " + path, 3000);
    } else {
        QMessageBox::warning(this, "Error", "Failed to open file");
    }
}

void MainWindow::onSaveProject() {
    QString path = QFileDialog::getSaveFileName(this, "Save Canvas", "",
                                                "UI Forger Files (*.canvas);;All Files (*)");
    if (path.isEmpty()) return;
    if (!path.endsWith(".canvas")) path += ".canvas";

    if (Persistence::saveToFile(path, m_store->nodes(), m_store->connections(), m_store->projectName())) {
        statusBar()->showMessage("Saved: " + path, 3000);
    } else {
        QMessageBox::warning(this, "Error", "Failed to save file");
    }
}

void MainWindow::onExportHTML() {
    QString path = QFileDialog::getSaveFileName(this, "Export HTML", "",
                                                "HTML Files (*.html)");
    if (path.isEmpty()) return;

    QString html = Exporters::toHTML(m_store->nodes(), m_store->connections(), m_store->projectName());
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        file.write(html.toUtf8());
        file.close();
        statusBar()->showMessage("Exported HTML: " + path, 3000);
    }
}

void MainWindow::onExportPNG() {
    QString path = QFileDialog::getSaveFileName(this, "Export PNG", "",
                                                "PNG Files (*.png)");
    if (path.isEmpty()) return;

    if (Exporters::exportPNG(m_store->nodes(), path)) {
        statusBar()->showMessage("Exported PNG: " + path, 3000);
    }
}

void MainWindow::onExportUnity() {
    QString path = QFileDialog::getSaveFileName(this, "Export Unity UXML", "",
                                                "Unity Files (*.uxml)");
    if (path.isEmpty()) return;

    QString uxml = Exporters::toUnity(m_store->nodes(), m_store->projectName());
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        file.write(uxml.toUtf8());
        file.close();
        statusBar()->showMessage("Exported Unity: " + path, 3000);
    }
}

void MainWindow::onExportUnreal() {
    QString path = QFileDialog::getSaveFileName(this, "Export Unreal Header", "",
                                                "C++ Header (*.h)");
    if (path.isEmpty()) return;

    QString h = Exporters::toUnreal(m_store->nodes(), m_store->projectName());
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        file.write(h.toUtf8());
        file.close();
        statusBar()->showMessage("Exported Unreal: " + path, 3000);
    }
}

void MainWindow::onExportGodot() {
    QString path = QFileDialog::getSaveFileName(this, "Export Godot Scene", "",
                                                "Godot Scene (*.tscn)");
    if (path.isEmpty()) return;

    QString tscn = Exporters::toGodot(m_store->nodes(), m_store->projectName());
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        file.write(tscn.toUtf8());
        file.close();
        statusBar()->showMessage("Exported Godot: " + path, 3000);
    }
}

void MainWindow::onAddNode() {
    Node n;
    n.id = "node_" + std::to_string(QTime::currentTime().msec());
    n.type = "container";
    n.label = "New Node";
    n.x = 200; n.y = 200;
    n.width = 200; n.height = 60;
    n.style.backgroundColor = "#1e2130";
    n.style.color = "#6366f1";
    n.style.borderRadius = 8;
    m_store->addNode(n);
    m_store->selectNode(QString::fromStdString(n.id));
}

void MainWindow::onDeleteNode() {
    QString id = m_store->selectedNodeId();
    if (!id.isEmpty()) m_store->removeNode(id);
}

void MainWindow::onDuplicateNode() {
    QString id = m_store->selectedNodeId();
    if (!id.isEmpty()) m_store->duplicateNode(id);
}

void MainWindow::onDuplicateNodeById(const QString& nodeId) {
    m_store->duplicateNode(nodeId);
}

void MainWindow::onDeleteNodeById(const QString& nodeId) {
    m_store->removeNode(nodeId);
}

void MainWindow::onCopyStyle(const QString& nodeId) {
    for (const auto& n : m_store->nodes()) {
        if (n.id == nodeId.toStdString()) {
            m_copiedStyle = n;
            m_hasCopiedStyle = true;
            statusBar()->showMessage("Style copied", 2000);
            return;
        }
    }
}

void MainWindow::onPasteStyle(const QString& nodeId) {
    if (!m_hasCopiedStyle) return;
    m_store->updateNode(nodeId, [this](Node& n) {
        n.style = m_copiedStyle.style;
    });
    statusBar()->showMessage("Style pasted", 2000);
}

void MainWindow::onNodeSelected(const QString& nodeId) {
    m_store->selectNode(nodeId);
}

void MainWindow::onMultiSelectionChanged(const QSet<QString>& nodeIds) {
    m_multiSelectedIds = nodeIds;
    if (!nodeIds.isEmpty()) {
        m_store->selectNode(*nodeIds.constBegin());
    }
}

void MainWindow::onNodeMoved(const QString& nodeId, const QPointF& pos) {
    m_store->moveNode(nodeId, (float)pos.x(), (float)pos.y());
}

void MainWindow::onSearchNodes(const QString& query) {
    m_treePanel->filterNodes(query);
    statusBar()->showMessage(query.isEmpty() ? "Ready" : "Filter: " + query, 5000);
}

void MainWindow::onToggleGrid() {
    m_store->toggleGrid();
    statusBar()->showMessage(m_store->showGrid() ? "Grid ON" : "Grid OFF", 2000);
}

void MainWindow::onToggleSnap() {
    m_canvas->setSnapEnabled(!m_canvas->snapEnabled());
    statusBar()->showMessage(m_canvas->snapEnabled() ? "Snap ON" : "Snap OFF", 2000);
}

void MainWindow::onToggleMiniMap() {
    m_store->toggleMiniMap();
    m_miniMap->setVisible(m_store->showMiniMap());
}

void MainWindow::onHelp() {
    QMessageBox::about(this, "UI Forger Help",
        "<h2>UI Forger — Quick Help</h2>"
        "<table cellpadding='4'>"
        "<tr><td colspan='2'><b>Canvas Navigation</b></td></tr>"
        "<tr><td>Space + Drag</td><td>Pan canvas</td></tr>"
        "<tr><td>Right-click Drag</td><td>Pan canvas</td></tr>"
        "<tr><td>Middle-click Drag</td><td>Pan canvas</td></tr>"
        "<tr><td>Scroll Wheel</td><td>Zoom in/out</td></tr>"
        "<tr><td>Ctrl + +/−</td><td>Zoom in/out</td></tr>"
        "<tr><td>Ctrl + 0</td><td>Reset zoom to 100%</td></tr>"
        "<tr><td colspan='2'><br><b>Selection</b></td></tr>"
        "<tr><td>Click</td><td>Select node</td></tr>"
        "<tr><td>Ctrl + Click</td><td>Toggle multi-select</td></tr>"
        "<tr><td>Ctrl + Drag</td><td>Marquee select (rubber band)</td></tr>"
        "<tr><td>Click empty area</td><td>Deselect all</td></tr>"
        "<tr><td colspan='2'><br><b>Editing</b></td></tr>"
        "<tr><td>Arrow keys</td><td>Nudge selected 1px</td></tr>"
        "<tr><td>Shift + Arrows</td><td>Nudge selected 10px</td></tr>"
        "<tr><td>Ctrl + D</td><td>Duplicate selected</td></tr>"
        "<tr><td>Delete</td><td>Remove selected</td></tr>"
        "<tr><td>Right-click</td><td>Context menu (duplicate, delete, copy/paste style)</td></tr>"
        "<tr><td colspan='2'><br><b>File</b></td></tr>"
        "<tr><td>Ctrl + S</td><td>Save project</td></tr>"
        "<tr><td>Ctrl + O</td><td>Open project</td></tr>"
        "<tr><td>Ctrl + N</td><td>New project</td></tr>"
        "<tr><td>Ctrl + Z</td><td>Undo</td></tr>"
        "<tr><td>Ctrl + Shift + Z</td><td>Redo</td></tr>"
        "<tr><td>N</td><td>Add new node</td></tr>"
        "<tr><td colspan='2'><br><b>View</b></td></tr>"
        "<tr><td>Grid toggle</td><td>View → Show Grid Lines</td></tr>"
        "<tr><td>Snap toggle</td><td>View → Snap to Grid</td></tr>"
        "<tr><td>MiniMap toggle</td><td>TopBar 🗺 Map button</td></tr>"
        "</table>"
        "<p style='margin-top:12px; color:#888;'><i>UI Forger v" + QApplication::applicationVersion() + "</i></p>"
    );
}
