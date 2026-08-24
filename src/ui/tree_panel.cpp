#include "tree_panel.h"
#include "../core/ir.h"

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
    header->setStyleSheet("background: #1a1d2e;");
    auto* headerLayout = new QHBoxLayout(header);
    headerLayout->setContentsMargins(8, 6, 8, 6);

    auto* title = new QLabel("Layers");
    title->setStyleSheet("color: #e6e6f0; font-size: 12px; font-weight: bold;");
    headerLayout->addWidget(title);
    headerLayout->addStretch();

    auto* addBtn = new QPushButton("+");
    addBtn->setFixedSize(24, 24);
    addBtn->setStyleSheet("QPushButton { background: #3a3d4e; color: #e6e6f0; border: none; border-radius: 4px; }"
                          "QPushButton:hover { background: #4a4d5e; }");
    connect(addBtn, &QPushButton::clicked, this, &TreePanel::addNodeRequested);
    headerLayout->addWidget(addBtn);

    layout->addWidget(header);

    // Filter
    m_filterEdit = new QLineEdit;
    m_filterEdit->setPlaceholderText("🔍 Filter...");
    m_filterEdit->setStyleSheet("QLineEdit { background: #14161f; color: #e6e6f0; border: none; border-bottom: 1px solid #2a2d3e; padding: 6px 8px; font-size: 11px; }");
    layout->addWidget(m_filterEdit);

    // Tree
    m_tree = new QTreeWidget;
    m_tree->setHeaderHidden(true);
    m_tree->setIndentation(16);
    m_tree->setStyleSheet(
        "QTreeWidget { background: #1a1d2e; color: #e6e6f0; border: none; font-size: 12px; }"
        "QTreeWidget::item { padding: 4px 8px; border-radius: 4px; }"
        "QTreeWidget::item:selected { background: #2a3d5e; }"
        "QTreeWidget::item:hover { background: #22253a; }"
    );
    connect(m_tree, &QTreeWidget::itemClicked, this, &TreePanel::onItemClicked);
    connect(m_tree, &QTreeWidget::itemDoubleClicked, this, &TreePanel::onItemDoubleClicked);
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
        else if (n.type == "label" || n.type == "title") icon = "📝";
        else if (n.type == "image") icon = "🖼";
        else if (n.type == "container" || n.type == "panel") icon = "📦";
        else if (n.type == "slider") icon = "🎚";
        else if (n.type == "progressBar" || n.type == "healthBar") icon = "📊";
        else icon = "◻";

        item->setText(0, icon + " " + label);
        item->setData(0, Qt::UserRole, QString::fromStdString(n.id));

        if (n.hidden) {
            item->setForeground(0, QBrush(QColor(100, 100, 120)));
            item->setText(0, "👁‍🗨 " + label);
        }
        if (n.locked) {
            item->setText(0, "🔒 " + label);
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
