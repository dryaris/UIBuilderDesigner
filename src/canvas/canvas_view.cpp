#include "canvas_view.h"
#include "node_item.h"
#include "../core/ir.h"
#include <QWheelEvent>
#include <QScrollBar>
#include <QTransform>
#include <QMouseEvent>
#include <QKeyEvent>
#include <QGraphicsSceneHoverEvent>
#include <QtMath>

CanvasView::CanvasView(QWidget* parent)
    : QGraphicsView(parent)
    , m_scene(new QGraphicsScene(this))
{
    setScene(m_scene);
    setRenderHint(QPainter::Antialiasing, true);
    setRenderHint(QPainter::SmoothPixmapTransform, true);
    setDragMode(QGraphicsView::NoDrag);
    setViewportUpdateMode(FullViewportUpdate);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setFocusPolicy(Qt::StrongFocus);
    setStyleSheet("QGraphicsView { background-color: #14161f; border: none; }");
    setTransformationAnchor(AnchorUnderMouse);
    setResizeAnchor(AnchorViewCenter);

    // Scene settings
    m_scene->setSceneRect(-50000, -50000, 100000, 100000);
    m_scene->setBackgroundBrush(QColor(20, 22, 31));
}

void CanvasView::setNodes(const QList<Node>& nodes) {
    m_nodes = nodes;
    rebuildScene();
}

void CanvasView::updateNodePosition(const QString& nodeId, const QPointF& pos) {
    if (auto* item = m_nodeItems.value(nodeId, nullptr)) {
        item->setPos(pos);
    }
}

void CanvasView::clearScene() {
    m_scene->clear();
    m_nodeItems.clear();
}

void CanvasView::rebuildScene() {
    // Clear old items
    for (auto* item : m_nodeItems) {
        m_scene->removeItem(item);
        delete item;
    }
    m_nodeItems.clear();

    // Create new items
    for (const auto& node : m_nodes) {
        auto* item = new NodeItem(node);
        m_scene->addItem(item);
        m_nodeItems[QString::fromStdString(node.id)] = item;

        connect(item, &NodeItem::positionChanged, this, &CanvasView::nodeMoved);
    }
}

void CanvasView::wheelEvent(QWheelEvent* event) {
    // Zoom with scroll wheel
    const double factor = 1.15;
    if (event->angleDelta().y() > 0) {
        setZoom(m_zoom * factor);
    } else {
        setZoom(m_zoom / factor);
    }
    event->accept();
}

void CanvasView::mousePressEvent(QMouseEvent* event) {
    if (event->button() == Qt::MiddleButton ||
        (event->button() == Qt::RightButton && !m_spaceHeld)) {
        // Middle-click or right-click to pan
        m_panning = true;
        m_panStart = event->pos();
        setCursor(Qt::ClosedHandCursor);
        event->accept();
        return;
    }

    if (event->button() == Qt::LeftButton && m_spaceHeld) {
        // Space + left-click to pan
        m_panning = true;
        m_panStart = event->pos();
        setCursor(Qt::ClosedHandCursor);
        event->accept();
        return;
    }

    if (event->button() == Qt::LeftButton) {
        QGraphicsItem* item = itemAt(event->pos());
        if (auto* nodeItem = qgraphicsitem_cast<NodeItem*>(item)) {
            emit nodeSelected(nodeItem->nodeId());
            setDragMode(QGraphicsView::NoDrag);
        } else {
            emit sceneClicked();
        }
    }

    QGraphicsView::mousePressEvent(event);
}

void CanvasView::mouseMoveEvent(QMouseEvent* event) {
    if (m_panning) {
        QPointF delta = event->pos() - m_panStart;
        m_panStart = event->pos();
        horizontalScrollBar()->setValue(horizontalScrollBar()->value() - (int)delta.x());
        verticalScrollBar()->setValue(verticalScrollBar()->value() - (int)delta.y());
        event->accept();
        return;
    }

    QGraphicsView::mouseMoveEvent(event);
}

void CanvasView::mouseReleaseEvent(QMouseEvent* event) {
    if (m_panning) {
        m_panning = false;
        setCursor(Qt::ArrowCursor);
        event->accept();
        return;
    }

    QGraphicsView::mouseReleaseEvent(event);
}

void CanvasView::keyPressEvent(QKeyEvent* event) {
    if (event->key() == Qt::Key_Space && !event->isAutoRepeat()) {
        m_spaceHeld = true;
        setCursor(Qt::OpenHandCursor);
        event->accept();
        return;
    }

    // Zoom shortcuts
    if (event->modifiers() & Qt::ControlModifier) {
        if (event->key() == Qt::Key_Plus || event->key() == Qt::Key_Equal) {
            setZoom(m_zoom * 1.2);
            event->accept();
            return;
        }
        if (event->key() == Qt::Key_Minus) {
            setZoom(m_zoom / 1.2);
            event->accept();
            return;
        }
        if (event->key() == Qt::Key_0) {
            setZoom(1.0);
            event->accept();
            return;
        }
    }

    QGraphicsView::keyPressEvent(event);
}

void CanvasView::keyReleaseEvent(QKeyEvent* event) {
    if (event->key() == Qt::Key_Space && !event->isAutoRepeat()) {
        m_spaceHeld = false;
        setCursor(Qt::ArrowCursor);
        event->accept();
        return;
    }
    QGraphicsView::keyReleaseEvent(event);
}

void CanvasView::resizeEvent(QResizeEvent* event) {
    QGraphicsView::resizeEvent(event);
}

void CanvasView::setZoom(float zoom) {
    m_zoom = qBound(0.05f, zoom, 10.0f);
    updateViewTransform();
}

void CanvasView::updateViewTransform() {
    QTransform t;
    t.scale(m_zoom, m_zoom);
    setTransform(t);
}
