#pragma once
#include <QWidget>
#include <QTreeWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLineEdit>
#include <QLabel>

struct Node;

class TreePanel : public QWidget {
    Q_OBJECT
public:
    explicit TreePanel(QWidget* parent = nullptr);

    void setNodes(const QList<Node>& nodes, const QString& selectedId);
    void clear();

signals:
    void nodeSelected(const QString& nodeId);
    void nodeRenamed(const QString& nodeId, const QString& newName);
    void nodeVisibilityToggled(const QString& nodeId, bool visible);
    void nodeLockedToggled(const QString& nodeId, bool locked);
    void deleteNodeRequested(const QString& nodeId);
    void addNodeRequested();

private slots:
    void onItemClicked(QTreeWidgetItem* item, int column);
    void onItemDoubleClicked(QTreeWidgetItem* item, int column);

private:
    void buildUI();

    QTreeWidget* m_tree;
    QLineEdit* m_filterEdit;
};
