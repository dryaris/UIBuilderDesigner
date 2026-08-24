#include "scene_store.h"
#include <QUndoCommand>

SceneStore::SceneStore(QObject* parent)
    : QObject(parent) {}

Node* SceneStore::findNode(const QString& id) {
    for (auto& n : m_nodes)
        if (n.id == id.toStdString()) return &n;
    return nullptr;
}

void SceneStore::addNode(const Node& node) {
    m_nodes.append(node);
    emit nodesChanged();
}

void SceneStore::removeNode(const QString& id) {
    for (int i = 0; i < m_nodes.size(); ++i) {
        if (m_nodes[i].id == id.toStdString()) {
            m_nodes.removeAt(i);
            if (m_selectedNodeId == id) m_selectedNodeId.clear();
            emit nodesChanged();
            emit selectionChanged(m_selectedNodeId);
            return;
        }
    }
}

void SceneStore::updateNode(const QString& id, std::function<void(Node&)> fn) {
    if (Node* n = findNode(id)) {
        fn(*n);
        emit nodesChanged();
    }
}

void SceneStore::moveNode(const QString& id, float x, float y) {
    if (Node* n = findNode(id)) {
        n->x = x;
        n->y = y;
        emit nodesChanged();
    }
}

void SceneStore::duplicateNode(const QString& id) {
    if (Node* src = findNode(id)) {
        Node dup = *src;
        dup.id = id.toStdString() + "_dup_" + std::to_string(QTime::currentTime().msec());
        dup.x += 30;
        dup.y += 30;
        m_nodes.append(dup);
        emit nodesChanged();
    }
}

void SceneStore::selectNode(const QString& id) {
    if (m_selectedNodeId != id) {
        m_selectedNodeId = id;
        emit selectionChanged(id);
    }
}

void SceneStore::setProjectName(const QString& name) {
    m_projectName = name;
    emit projectNameChanged(name);
}

void SceneStore::setZoom(float z) {
    m_zoom = z;
    emit zoomChanged(z);
}

void SceneStore::toggleGrid() { m_showGrid = !m_showGrid; emit nodesChanged(); }
void SceneStore::toggleMiniMap() { m_showMiniMap = !m_showMiniMap; emit nodesChanged(); }

void SceneStore::setNodes(const QList<Node>& nodes) {
    m_nodes = nodes;
    emit nodesChanged();
}

void SceneStore::setConnections(const QList<Connection>& conns) {
    m_connections = conns;
    emit nodesChanged();
}

void SceneStore::clear() {
    m_nodes.clear();
    m_connections.clear();
    m_selectedNodeId.clear();
    m_undoStack.clear();
    emit nodesChanged();
    emit selectionChanged(QString());
}
