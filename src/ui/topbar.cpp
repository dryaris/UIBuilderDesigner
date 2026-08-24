#include "topbar.h"
#include <QStyle>
#include <QFile>
#include <QTextStream>

TopBar::TopBar(QWidget* parent)
    : QWidget(parent) {
    setFixedHeight(48);
    setStyleSheet("TopBar { background: #1a1d2e; border-bottom: 1px solid #2a2d3e; }");
    buildUI();
}

void TopBar::buildUI() {
    auto* layout = new QHBoxLayout(this);
    layout->setContentsMargins(10, 0, 10, 0);
    layout->setSpacing(4);

    auto btnStyle = "QPushButton { background: transparent; color: #9094a6; border: 1px solid transparent; "
                    "border-radius: 6px; padding: 5px 10px; font-size: 12px; } "
                    "QPushButton:hover { background: #252838; color: #d0d0e0; border-color: #2a2d3e; } "
                    "QPushButton:pressed { background: #1e2030; }";

    auto accentBtnStyle = "QPushButton { background: #4f46e5; color: white; border: none; "
                           "border-radius: 6px; padding: 5px 14px; font-size: 12px; font-weight: 600; } "
                           "QPushButton:hover { background: #5b54e8; } "
                           "QPushButton:pressed { background: #4338ca; }";

    // ── Logo ──
    auto* logo = new QLabel("🎨 UI Forger");
    logo->setStyleSheet("color: #818cf8; font-size: 15px; font-weight: bold; padding-right: 12px;");
    layout->addWidget(logo);

    // ── File buttons ──
    auto* newBtn = new QPushButton("📄 New");
    newBtn->setStyleSheet(btnStyle);
    newBtn->setToolTip("New Project (Ctrl+N)");
    connect(newBtn, &QPushButton::clicked, this, &TopBar::newProject);
    layout->addWidget(newBtn);

    auto* openBtn = new QPushButton("📂 Open");
    openBtn->setStyleSheet(btnStyle);
    openBtn->setToolTip("Open Project (Ctrl+O)");
    connect(openBtn, &QPushButton::clicked, this, &TopBar::openProject);
    layout->addWidget(openBtn);

    auto* saveBtn = new QPushButton("💾 Save");
    saveBtn->setStyleSheet(accentBtnStyle);
    saveBtn->setToolTip("Save Project (Ctrl+S)");
    connect(saveBtn, &QPushButton::clicked, this, &TopBar::saveProject);
    layout->addWidget(saveBtn);

    // ── Separator ──
    auto* sep1 = new QFrame;
    sep1->setFrameShape(QFrame::VLine);
    sep1->setStyleSheet("color: #1e2030;");
    sep1->setFixedHeight(20);
    layout->addWidget(sep1);

    // ── Undo/Redo ──
    auto* undoBtn = new QPushButton("↩ Undo");
    undoBtn->setStyleSheet(btnStyle);
    undoBtn->setToolTip("Undo (Ctrl+Z)");
    connect(undoBtn, &QPushButton::clicked, this, &TopBar::undo);
    layout->addWidget(undoBtn);

    auto* redoBtn = new QPushButton("↪ Redo");
    redoBtn->setStyleSheet(btnStyle);
    redoBtn->setToolTip("Redo (Ctrl+Shift+Z)");
    connect(redoBtn, &QPushButton::clicked, this, &TopBar::redo);
    layout->addWidget(redoBtn);

    // ── Separator ──
    auto* sep2 = new QFrame;
    sep2->setFrameShape(QFrame::VLine);
    sep2->setStyleSheet("color: #1e2030;");
    sep2->setFixedHeight(20);
    layout->addWidget(sep2);

    // ── Export ──
    auto* exportBtn = new QPushButton("📤 Export ▾");
    exportBtn->setStyleSheet(btnStyle);
    auto* exportMenu = new QMenu(exportBtn);
    exportMenu->setStyleSheet(
        "QMenu { background: #1a1d2e; color: #e6e6f0; border: 1px solid #2a2d3e; padding: 4px; }"
        "QMenu::item { padding: 6px 24px; }"
        "QMenu::item:selected { background: #2a3d5e; }"
        "QMenu::separator { height: 1px; background: #2a2d3e; margin: 4px 8px; }");
    exportMenu->addAction("🌐 HTML", this, &TopBar::exportHTML);
    exportMenu->addAction("🖼 PNG", this, &TopBar::exportPNG);
    exportMenu->addSeparator();
    exportMenu->addAction("🎮 Unity UXML", this, &TopBar::exportUnity);
    exportMenu->addAction("🎯 Unreal Header", this, &TopBar::exportUnreal);
    exportMenu->addAction("🤖 Godot Scene", this, &TopBar::exportGodot);
    exportBtn->setMenu(exportMenu);
    layout->addWidget(exportBtn);

    // ── Separator ──
    auto* sep3 = new QFrame;
    sep3->setFrameShape(QFrame::VLine);
    sep3->setStyleSheet("color: #1e2030;");
    sep3->setFixedHeight(20);
    layout->addWidget(sep3);

    // ── Grid & MiniMap toggles ──
    auto* gridBtn = new QPushButton("⊞ Grid");
    gridBtn->setStyleSheet(btnStyle);
    gridBtn->setToolTip("Toggle Grid Lines");
    connect(gridBtn, &QPushButton::clicked, this, &TopBar::toggleGrid);
    layout->addWidget(gridBtn);

    auto* mapBtn = new QPushButton("🗺 Map");
    mapBtn->setStyleSheet(btnStyle);
    mapBtn->setToolTip("Toggle Mini Map");
    connect(mapBtn, &QPushButton::clicked, this, &TopBar::toggleMiniMap);
    layout->addWidget(mapBtn);

    layout->addStretch();

    // ── Search ──
    m_searchBar = new QLineEdit;
    m_searchBar->setPlaceholderText("🔍 Search nodes...");
    m_searchBar->setFixedWidth(200);
    m_searchBar->setStyleSheet(
        "QLineEdit { background: #14161f; color: #e6e6f0; border: 1px solid #2a2d3e; "
        "border-radius: 4px; padding: 6px 10px; font-size: 12px; }"
        "QLineEdit:focus { border: 1px solid #6366f1; }");
    connect(m_searchBar, &QLineEdit::textChanged, this, &TopBar::searchNodes);
    layout->addWidget(m_searchBar);

    // ── Zoom controls (grouped) ──
    auto* zoomContainer = new QWidget;
    auto* zoomLayout = new QHBoxLayout(zoomContainer);
    zoomLayout->setContentsMargins(0, 0, 0, 0);
    zoomLayout->setSpacing(2);

    auto* zoomOutBtn = new QPushButton("−");
    zoomOutBtn->setStyleSheet(btnStyle);
    zoomOutBtn->setFixedSize(28, 28);
    zoomOutBtn->setToolTip("Zoom Out (Ctrl+-)");
    connect(zoomOutBtn, &QPushButton::clicked, this, &TopBar::zoomOut);
    zoomLayout->addWidget(zoomOutBtn);

    m_zoomLabel = new QLabel("100%");
    m_zoomLabel->setStyleSheet("color: #a0a0b8; font-size: 11px; min-width: 44px;");
    m_zoomLabel->setAlignment(Qt::AlignCenter);
    zoomLayout->addWidget(m_zoomLabel);

    auto* zoomInBtn = new QPushButton("+");
    zoomInBtn->setStyleSheet(btnStyle);
    zoomInBtn->setFixedSize(28, 28);
    zoomInBtn->setToolTip("Zoom In (Ctrl++)");
    connect(zoomInBtn, &QPushButton::clicked, this, &TopBar::zoomIn);
    zoomLayout->addWidget(zoomInBtn);

    layout->addWidget(zoomContainer);

    // ── Project name ──
    m_projectLabel = new QLabel("Untitled");
    m_projectLabel->setStyleSheet("color: #888; font-size: 11px; padding-left: 8px;");
    layout->addWidget(m_projectLabel);

    // ── Node count ──
    m_nodeCountLabel = new QLabel("0 nodes");
    m_nodeCountLabel->setStyleSheet("color: #555; font-size: 10px; padding-left: 4px;");
    layout->addWidget(m_nodeCountLabel);

    // ── Help ──
    auto* helpBtn = new QPushButton("❓");
    helpBtn->setStyleSheet(btnStyle);
    helpBtn->setFixedSize(28, 28);
    helpBtn->setToolTip("Help (F1)");
    connect(helpBtn, &QPushButton::clicked, this, &TopBar::helpClicked);
    layout->addWidget(helpBtn);
}

void TopBar::setProjectName(const QString& name) {
    m_projectLabel->setText(name);
}

void TopBar::setZoom(float z) {
    m_zoomLabel->setText(QString::number((int)(z * 100)) + "%");
}

void TopBar::setNodeCount(int count) {
    m_nodeCountLabel->setText(QString::number(count) + (count == 1 ? " node" : " nodes"));
}
