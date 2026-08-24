#pragma once
#include <QGraphicsView>
#include <QGraphicsScene>
#include <QUndoStack>
#include <QPointF>
#include <QSet>
#include <QMenu>

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
    bool snapEnabled() const { return m_snapEnabled; }
    void setSnapEnabled(bool enabled) { m_snapEnabled = enabled; }

signals:
    void nodeMoved(const QString& nodeId, const QPointF& newPos);
    void nodeSelected(const QString& nodeId);
    void selectionChanged(const QSet<QString>& nodeIds);
    void sceneClicked();
    void duplicateRequested(const QString& nodeId);
    void deleteRequested(const QString& nodeId);
    void copyStyleRequested(const QString& nodeId);
    void pasteStyleRequested(const QString& nodeId);

protected:
    void wheelEvent(QWheelEvent* event) override;
    void mousePressEvent(QMouseEvent* event) override;
    void mouseMoveEvent(QMouseEvent* event) override;
    void mouseReleaseEvent(QMouseEvent* event) override;
    void keyPressEvent(QKeyEvent* event) override;
    void keyReleaseEvent(QKeyEvent* event) override;
    void resizeEvent(QResizeEvent* event) override;
    void contextMenuEvent(QContextMenuEvent* event) override;

private:
    void updateViewTransform();
    void setZoom(float zoom);
    QPointF snapToGrid(const QPointF& pos) const;
    void selectNodesInRect(const QRectF& rect, bool toggle = false);

    QGraphicsScene* m_scene;
    float m_zoom = 1.0f;
    bool m_panning = false;
    bool m_spaceHeld = false;
    bool m_rightDragPanning = false;
    bool m_snapEnabled = true;
    int m_gridSize = 10;
    QPointF m_panStart;
    QMap<QString, NodeItem*> m_nodeItems;
    QList<Node> m_nodes;

    // Multi-selection
    QSet<QString> m_selectedIds;
    bool m_ctrlHeld = false;
    bool m_rubberBandActive = false;
    QGraphicsRectItem* m_rubberBand = nullptr;
    QPointF m_rubberBandOrigin;
};
