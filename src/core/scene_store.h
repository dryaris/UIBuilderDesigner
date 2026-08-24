#pragma once
#include "../core/ir.h"
#include <QObject>
#include <QList>
#include <QString>
#include <QUndoStack>
#include <functional>

class SceneStore : public QObject {
    Q_OBJECT
public:
    explicit SceneStore(QObject* parent = nullptr);

    // Getters
    const QList<Node>& nodes() const { return m_nodes; }
    const QList<Connection>& connections() const { return m_connections; }
    const QString& selectedNodeId() const { return m_selectedNodeId; }
    QString projectName() const { return m_projectName; }
    float zoom() const { return m_zoom; }
    bool showGrid() const { return m_showGrid; }
    bool showMiniMap() const { return m_showMiniMap; }

    // Mutations
    void addNode(const Node& node);
    void removeNode(const QString& id);
    void updateNode(const QString& id, std::function<void(Node&)> fn);
    void moveNode(const QString& id, float x, float y);
    void duplicateNode(const QString& id);
    void selectNode(const QString& id);
    void setProjectName(const QString& name);
    void setZoom(float z);
    void toggleGrid();
    void toggleMiniMap();

    // Bulk
    void setNodes(const QList<Node>& nodes);
    void setConnections(const QList<Connection>& conns);
    void clear();

    QUndoStack* undoStack() { return &m_undoStack; }

signals:
    void nodesChanged();
    void selectionChanged(const QString& nodeId);
    void projectNameChanged(const QString& name);
    void zoomChanged(float zoom);

private:
    QList<Node> m_nodes;
    QList<Connection> m_connections;
    QString m_selectedNodeId;
    QString m_projectName = "Untitled";
    float m_zoom = 1.0f;
    bool m_showGrid = true;
    bool m_showMiniMap = true;
    QUndoStack m_undoStack;

    Node* findNode(const QString& id);
};
