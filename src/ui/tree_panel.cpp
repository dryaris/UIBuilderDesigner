#include "tree_panel.h"
#include "../core/ir.h"
#include <QMenu>
#include <QAction>

TreePanel::TreePanel(QWidget* parent)
    : QWidget(parent) {
    setFixedWidth(220);
    buildUI();
}

void TreePanel::buildUI() {
    auto* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    // Header
    auto* header = new QWidget;
    header->setStyleSheet("background: #1a1d2e; border-bottom: 1px solid #2a2d3e;");
    auto* headerLayout = new QHBoxLayout(header);
    headerLayout->setContentsMargins(8, 6, 8, 6);

    auto* title = new QLabel("Layers");
    title->setStyleSheet("color: #e6e6f0; font-size: 12px; font-weight: bold;");
    headerLayout->addWidget(title);
    headerLayout->addStretch();

    auto btnStyle = "QPushButton { background: #3a3d4e; color: #e6e6f0; border: none; "
                     "border-radius: 4px; font-size: 14px; }"
                     "QPushButton:hover { background: #4a4d5e; }";

    auto* addBtn = new QPushButton("+");
    addBtn->setFixedSize(24, 24);
    addBtn->setStyleSheet(btnStyle);
    addBtn->setToolTip("Add Node (N)");
    connect(addBtn, &QPushButton::clicked, this, &TreePanel::addNodeRequested);
    headerLayout->addWidget(addBtn);

    auto* delBtn = new QPushButton("−");
    delBtn->setFixedSize(24, 24);
    delBtn->setStyleSheet(btnStyle);
    delBtn->setToolTip("Delete Node (Del)");
    connect(delBtn, &QPushButton::clicked, this, [this]() {
        if (auto* item = m_tree->currentItem()) {
            QString id = item->data(0, Qt::UserRole).toString();
            emit deleteNodeRequested(id);
        }
    });
    headerLayout->addWidget(delBtn);

    layout->addWidget(header);

    // Filter
    m_filterEdit = new QLineEdit;
    m_filterEdit->setPlaceholderText("🔍 Filter...");
    m_filterEdit->setStyleSheet(
        "QLineEdit { background: #14161f; color: #e6e6f0; border: none; "
        "border-bottom: 1px solid #2a2d3e; padding: 6px 8px; font-size: 11px; }");
    layout->addWidget(m_filterEdit);

    // Tree
    m_tree = new QTreeWidget;
    m_tree->setHeaderHidden(true);
    m_tree->setIndentation(16);
    m_tree->setStyleSheet(
        "QTreeWidget { background: #1a1d2e; color: #e6e6f0; border: none; font-size: 12px; }"
        "QTreeWidget::item { padding: 4px 8px; border-radius: 4px; margin: 1px 4px; }"
        "QTreeWidget::item:selected { background: #2a3d5e; }"
        "QTreeWidget::item:hover { background: #22253a; }"
    );
    m_tree->setContextMenuPolicy(Qt::CustomContextMenu);
    connect(m_tree, &QTreeWidget::itemClicked, this, &TreePanel::onItemClicked);
    connect(m_tree, &QTreeWidget::itemDoubleClicked, this, &TreePanel::onItemDoubleClicked);
    connect(m_tree, &QTreeWidget::customContextMenuRequested, this, [this](const QPoint& pos) {
        auto* item = m_tree->itemAt(pos);
        if (!item) return;

        QString id = item->data(0, Qt::UserRole).toString();
        QMenu menu(this);
        menu.setStyleSheet(
            "QMenu { background: #1a1d2e; color: #e6e6f0; border: 1px solid #2a2d3e; padding: 4px; }"
            "QMenu::item { padding: 6px 24px; }"
            "QMenu::item:selected { background: #2a3d5e; }"
        );
        menu.addAction("📋 Duplicate", this, [this, id]() { emit duplicateNodeRequested(id); });
        menu.addAction("🗑 Delete", this, [this, id]() { emit deleteNodeRequested(id); });
        menu.exec(m_tree->mapToGlobal(pos));
    });
    layout->addWidget(m_tree);
}

void TreePanel::setNodes(const QList<Node>& nodes, const QString& selectedId) {
    m_tree->clear();

    for (const auto& n : nodes) {
        auto* item = new QTreeWidgetItem(m_tree);
        QString label = QString::fromStdString(n.label);
        if (label.isEmpty()) label = QString::fromStdString(n.id);

        QString icon;
        if (n.type == "button") icon = "🔘";
        else if (n.type == "label") icon = "📝";
        else if (n.type == "title") icon = "🔤";
        else if (n.type == "image") icon = "🖼";
        else if (n.type == "container" || n.type == "panel") icon = "📦";
        else if (n.type == "slider") icon = "🎚";
        else if (n.type == "progressBar") icon = "📊";
        else if (n.type == "healthBar") icon = "❤️";
        else if (n.type == "staminaBar") icon = "💪";
        else if (n.type == "tooltip" || n.type == "toast") icon = "💬";
        else if (n.type == "miniMap") icon = "🗺";
        else if (n.type == "checkbox") icon = "☑";
        else if (n.type == "input" || n.type == "dropdown") icon = "📋";
        else if (n.type == "dialog") icon = "🪟";
        else if (n.type == "badge") icon = "🏷";
        else if (n.type == "divider") icon = "➖";
        else if (n.type == "spacer") icon = "⬜";
        else if (n.type == "icon") icon = "⭐";
        else if (n.type == "avatar") icon = "👤";
        else if (n.type == "inventory") icon = "🎒";
        else if (n.type == "tabBar") icon = "📑";
        else if (n.type == "scrollArea") icon = "📜";
        else if (n.type == "chatBox") icon = "💬";
        else if (n.type == "leaderboard") icon = "🏆";
        else if (n.type == "radarChart") icon = "📡";
        else if (n.type == "compass") icon = "🧭";
        else icon = "◻";

        QString displayText = icon + " " + label;
        if (n.locked) displayText += " 🔒";
        if (n.hidden) displayText += " 👁";

        item->setText(0, displayText);
        item->setData(0, Qt::UserRole, QString::fromStdString(n.id));

        if (n.hidden) {
            item->setForeground(0, QBrush(QColor(100, 100, 120)));
        }

        if (QString::fromStdString(n.id) == selectedId) {
            item->setSelected(true);
        }
    }
}

void TreePanel::filterNodes(const QString& query) {
    for (int i = 0; i < m_tree->topLevelItemCount(); ++i) {
        auto* item = m_tree->topLevelItem(i);
        if (query.isEmpty()) {
            item->setHidden(false);
        } else {
            bool match = item->text(0).contains(query, Qt::CaseInsensitive);
            item->setHidden(!match);
        }
    }
}

void TreePanel::clear() {
    m_tree->clear();
}

void TreePanel::onItemClicked(QTreeWidgetItem* item, int) {
    if (item) {
        QString id = item->data(0, Qt::UserRole).toString();
        emit nodeSelected(id);
    }
}

void TreePanel::onItemDoubleClicked(QTreeWidgetItem* item, int) {
    // Could trigger rename mode
}
