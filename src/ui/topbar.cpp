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
    layout->setContentsMargins(12, 0, 12, 0);
    layout->setSpacing(8);

    auto btnStyle = "QPushButton { background: #2a2d3e; color: #e6e6f0; border: none; "
                    "border-radius: 4px; padding: 6px 10px; font-size: 12px; } "
                    "QPushButton:hover { background: #3a3d4e; }";

    // Logo
    auto* logo = new QLabel("🎨 UI Forger");
    logo->setStyleSheet("color: #818cf8; font-size: 15px; font-weight: bold; padding-right: 12px;");
    layout->addWidget(logo);

    // File buttons
    auto* newBtn = new QPushButton("📄 New");
    newBtn->setStyleSheet(btnStyle);
    connect(newBtn, &QPushButton::clicked, this, &TopBar::newProject);
    layout->addWidget(newBtn);

    auto* openBtn = new QPushButton("📂 Open");
    openBtn->setStyleSheet(btnStyle);
    connect(openBtn, &QPushButton::clicked, this, &TopBar::openProject);
    layout->addWidget(openBtn);

    auto* saveBtn = new QPushButton("💾 Save");
    saveBtn->setStyleSheet(btnStyle);
    connect(saveBtn, &QPushButton::clicked, this, &TopBar::saveProject);
    layout->addWidget(saveBtn);

    // Separator
    auto* sep1 = new QLabel("|");
    sep1->setStyleSheet("color: #2a2d3e; padding: 0 4px;");
    layout->addWidget(sep1);

    // Undo/Redo
    auto* undoBtn = new QPushButton("↩");
    undoBtn->setStyleSheet(btnStyle);
    undoBtn->setToolTip("Undo (Ctrl+Z)");
    connect(undoBtn, &QPushButton::clicked, this, &TopBar::undo);
    layout->addWidget(undoBtn);

    auto* redoBtn = new QPushButton("↪");
    redoBtn->setStyleSheet(btnStyle);
    redoBtn->setToolTip("Redo (Ctrl+Y)");
    connect(redoBtn, &QPushButton::clicked, this, &TopBar::redo);
    layout->addWidget(redoBtn);

    // Separator
    auto* sep2 = new QLabel("|");
    sep2->setStyleSheet("color: #2a2d3e; padding: 0 4px;");
    layout->addWidget(sep2);

    // Export
    auto* exportBtn = new QPushButton("📤 Export ▾");
    exportBtn->setStyleSheet(btnStyle);
    auto* exportMenu = new QMenu(exportBtn);
    exportMenu->setStyleSheet("QMenu { background: #1a1d2e; color: #e6e6f0; border: 1px solid #2a2d3e; }"
                              "QMenu::item:selected { background: #3a3d4e; }");
    exportMenu->addAction("HTML", this, &TopBar::exportHTML);
    exportMenu->addAction("PNG", this, &TopBar::exportPNG);
    exportMenu->addAction("Unity", this, &TopBar::exportUnity);
    exportMenu->addAction("Unreal", this, &TopBar::exportUnreal);
    exportMenu->addAction("Godot", this, &TopBar::exportGodot);
    exportBtn->setMenu(exportMenu);
    layout->addWidget(exportBtn);

    // Grid & MiniMap toggles
    auto* gridBtn = new QPushButton("⊞ Grid");
    gridBtn->setStyleSheet(btnStyle);
    connect(gridBtn, &QPushButton::clicked, this, &TopBar::toggleGrid);
    layout->addWidget(gridBtn);

    auto* mapBtn = new QPushButton("🗺 MiniMap");
    mapBtn->setStyleSheet(btnStyle);
    connect(mapBtn, &QPushButton::clicked, this, &TopBar::toggleMiniMap);
    layout->addWidget(mapBtn);

    layout->addStretch();

    // Search
    m_searchBar = new QLineEdit;
    m_searchBar->setPlaceholderText("🔍 Search nodes...");
    m_searchBar->setFixedWidth(200);
    m_searchBar->setStyleSheet("QLineEdit { background: #14161f; color: #e6e6f0; border: 1px solid #2a2d3e; "
                               "border-radius: 4px; padding: 6px 10px; font-size: 12px; }");
    connect(m_searchBar, &QLineEdit::textChanged, this, &TopBar::searchNodes);
    layout->addWidget(m_searchBar);

    // Zoom controls
    auto* zoomOutBtn = new QPushButton("−");
    zoomOutBtn->setStyleSheet(btnStyle);
    zoomOutBtn->setFixedWidth(30);
    connect(zoomOutBtn, &QPushButton::clicked, this, &TopBar::zoomOut);
    layout->addWidget(zoomOutBtn);

    m_zoomLabel = new QLabel("100%");
    m_zoomLabel->setStyleSheet("color: #a0a0b8; font-size: 12px; min-width: 40px; text-align: center;");
    m_zoomLabel->setAlignment(Qt::AlignCenter);
    layout->addWidget(m_zoomLabel);

    auto* zoomInBtn = new QPushButton("+");
    zoomInBtn->setStyleSheet(btnStyle);
    zoomInBtn->setFixedWidth(30);
    connect(zoomInBtn, &QPushButton::clicked, this, &TopBar::zoomIn);
    layout->addWidget(zoomInBtn);

    // Project name
    m_projectLabel = new QLabel("Untitled");
    m_projectLabel->setStyleSheet("color: #888; font-size: 11px; padding-left: 8px;");
    layout->addWidget(m_projectLabel);

    // Help
    auto* helpBtn = new QPushButton("❓");
    helpBtn->setStyleSheet(btnStyle);
    helpBtn->setFixedWidth(30);
    connect(helpBtn, &QPushButton::clicked, this, &TopBar::helpClicked);
    layout->addWidget(helpBtn);
}

void TopBar::setProjectName(const QString& name) {
    m_projectLabel->setText(name);
}

void TopBar::setZoom(float z) {
    m_zoomLabel->setText(QString::number((int)(z * 100)) + "%");
}
