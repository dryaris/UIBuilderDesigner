#pragma once
#include <QGraphicsView>
#include <QGraphicsScene>
#include <QUndoStack>
#include <QPointF>
#include <QSet>

class NodeItem;
struct Node;

class CanvasView : public QGraphicsView {
    Q_OBJECT
public:
    explicit CanvasView(QWidget* parent = nullptr);

    void setNodes(const QList<Node>& nodes);
    void updateNodePosition(const QString& nodeId, const QPointF& pos);
    void clearScene();
    void rebuildScene();

    QGraphicsScene* scene() const { return m_scene; }
    float zoom() const { return m_zoom; }

signals:
    void nodeMoved(const QString& nodeId, const QPointF& newPos);
    void nodeSelected(const QString& nodeId);
    void sceneClicked();

protected:
    void wheelEvent(QWheelEvent* event) override;
    void mousePressEvent(QMouseEvent* event) override;
    void mouseMoveEvent(QMouseEvent* event) override;
    void mouseReleaseEvent(QMouseEvent* event) override;
    void resizeEvent(QResizeEvent* event) override;

private:
    void updateViewTransform();
    void setZoom(float zoom);

    QGraphicsScene* m_scene;
    float m_zoom = 1.0f;
    bool m_panning = false;
    bool m_spaceHeld = false;
    bool m_rightDragPanning = false;
    QPointF m_panStart;
    QMap<QString, NodeItem*> m_nodeItems;
    QList<Node> m_nodes;
};
