#include "canvas_view.h"
#include "node_item.h"
#include "mini_map.h"
#include "../core/ir.h"
#include <QWheelEvent>
#include <QScrollBar>
#include <QTransform>
#include <QMouseEvent>
#include <QKeyEvent>
#include <QGraphicsSceneHoverEvent>
#include <QContextMenuEvent>
#include <QGraphicsRectItem>
#include <QtMath>
#include <QPen>
#include <QFont>

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
    m_selectedIds.clear();

    // Create new items
    for (const auto& node : m_nodes) {
        auto* item = new NodeItem(node);
        m_scene->addItem(item);
        m_nodeItems[QString::fromStdString(node.id)] = item;

        connect(item, &NodeItem::positionChanged, this, &CanvasView::nodeMoved);
    }
}

void CanvasView::setShowGrid(bool show) {
    m_showGrid = show;
    viewport()->update();
}

QPointF CanvasView::snapToGrid(const QPointF& pos) const {
    if (!m_snapEnabled) return pos;
    float gx = m_gridSize;
    float gy = m_gridSize;
    return QPointF(
        qRound(pos.x() / gx) * gx,
        qRound(pos.y() / gy) * gy
    );
}

// ── Grid drawing ──

void CanvasView::drawBackground(QPainter* painter, const QRectF& rect) {
    QGraphicsView::drawBackground(painter, rect);
    if (m_showGrid) {
        drawGrid(painter, rect);
    }
}

void CanvasView::drawGrid(QPainter* painter, const QRectF& rect) {
    // Minor grid lines (10px)
    QPen minorPen(QColor(40, 43, 60, 60), 0.5);
    painter->setPen(minorPen);

    int left = (int)qFloor(rect.left() / m_gridSize) * m_gridSize;
    int right = (int)qCeil(rect.right() / m_gridSize) * m_gridSize;
    int top = (int)qFloor(rect.top() / m_gridSize) * m_gridSize;
    int bottom = (int)qCeil(rect.bottom() / m_gridSize) * m_gridSize;

    for (int x = left; x <= right; x += m_gridSize) {
        // Major lines every 50px
        if (x % 50 == 0) {
            painter->setPen(QPen(QColor(55, 58, 80, 90), 1.0));
        } else {
            painter->setPen(minorPen);
        }
        painter->drawLine(x, top, x, bottom);
    }
    for (int y = top; y <= bottom; y += m_gridSize) {
        if (y % 50 == 0) {
            painter->setPen(QPen(QColor(55, 58, 80, 90), 1.0));
        } else {
            painter->setPen(minorPen);
        }
        painter->drawLine(left, y, right, y);
    }

    // Origin crosshair
    painter->setPen(QPen(QColor(99, 102, 241, 60), 1.5));
    painter->drawLine(0, top, 0, bottom);
    painter->drawLine(left, 0, right, 0);
}

// ── Zoom ──

void CanvasView::wheelEvent(QWheelEvent* event) {
    const double factor = 1.15;
    if (event->angleDelta().y() > 0) {
        setZoom(m_zoom * factor);
    } else {
        setZoom(m_zoom / factor);
    }
    event->accept();
}

void CanvasView::setZoom(float zoom) {
    m_zoom = qBound(0.05f, zoom, 10.0f);
    updateViewTransform();
    emit zoomChanged(m_zoom);
}

void CanvasView::updateViewTransform() {
    QTransform t;
    t.scale(m_zoom, m_zoom);
    setTransform(t);
}

// ── Mouse events ──

void CanvasView::mousePressEvent(QMouseEvent* event) {
    // Rubber band / marquee selection with Ctrl+Left
    if (event->button() == Qt::LeftButton && m_ctrlHeld) {
        m_rubberBandActive = true;
        m_rubberBandOrigin = mapToScene(event->pos());
        if (!m_rubberBand) {
            m_rubberBand = new QGraphicsRectItem;
            m_rubberBand->setPen(QPen(QColor(99, 102, 241, 120), 1.5, Qt::DashLine));
            m_rubberBand->setBrush(QColor(99, 102, 241, 25));
            m_rubberBand->setZValue(9999);
            m_scene->addItem(m_rubberBand);
        }
        m_rubberBand->setRect(QRectF(m_rubberBandOrigin, m_rubberBandOrigin));
        m_rubberBand->setVisible(true);
        event->accept();
        return;
    }

    // Panning: middle button, right button, or space+left
    if (event->button() == Qt::MiddleButton ||
        (event->button() == Qt::RightButton && !m_spaceHeld) ||
        (event->button() == Qt::LeftButton && m_spaceHeld)) {
        m_panning = true;
        m_panStart = event->pos();
        setCursor(Qt::ClosedHandCursor);
        event->accept();
        return;
    }

    if (event->button() == Qt::LeftButton) {
        QGraphicsItem* item = itemAt(event->pos());
        if (auto* nodeItem = qgraphicsitem_cast<NodeItem*>(item)) {
            QString id = nodeItem->nodeId();
            if (m_ctrlHeld) {
                // Toggle selection
                if (m_selectedIds.contains(id)) {
                    m_selectedIds.remove(id);
                    nodeItem->setSelected(false);
                } else {
                    m_selectedIds.insert(id);
                    nodeItem->setSelected(true);
                }
            } else {
                // Single selection
                if (!m_selectedIds.contains(id)) {
                    for (const auto& selId : m_selectedIds) {
                        if (auto* si = m_nodeItems.value(selId, nullptr))
                            si->setSelected(false);
                    }
                    m_selectedIds.clear();
                    m_selectedIds.insert(id);
                    nodeItem->setSelected(true);
                }
            }
            emit selectionChanged(m_selectedIds);
            emit nodeSelected(id);
        } else {
            // Click on empty area — deselect all
            if (!m_ctrlHeld) {
                for (const auto& selId : m_selectedIds) {
                    if (auto* si = m_nodeItems.value(selId, nullptr))
                        si->setSelected(false);
                }
                m_selectedIds.clear();
                emit selectionChanged(m_selectedIds);
            }
            emit sceneClicked();
        }
    }

    QGraphicsView::mousePressEvent(event);
}

void CanvasView::mouseMoveEvent(QMouseEvent* event) {
    if (m_rubberBandActive) {
        QPointF current = mapToScene(event->pos());
        QRectF rect = QRectF(m_rubberBandOrigin, current).normalized();
        if (m_rubberBand) m_rubberBand->setRect(rect);
        event->accept();
        return;
    }

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
    if (m_rubberBandActive) {
        m_rubberBandActive = false;
        if (m_rubberBand) {
            QRectF rect = m_rubberBand->rect();
            m_rubberBand->setVisible(false);
            selectNodesInRect(rect, m_ctrlHeld);
        }
        event->accept();
        return;
    }

    if (m_panning) {
        m_panning = false;
        setCursor(Qt::ArrowCursor);
        event->accept();
        return;
    }

    QGraphicsView::mouseReleaseEvent(event);
}

void CanvasView::selectNodesInRect(const QRectF& rect, bool toggle) {
    if (!toggle) {
        for (const auto& id : m_selectedIds) {
            if (auto* si = m_nodeItems.value(id, nullptr))
                si->setSelected(false);
        }
        m_selectedIds.clear();
    }

    for (auto it = m_nodeItems.constBegin(); it != m_nodeItems.constEnd(); ++it) {
        if (it.value()->boundingRect().translated(it.value()->pos()).intersects(rect)) {
            it.value()->setSelected(true);
            m_selectedIds.insert(it.key());
        }
    }

    emit selectionChanged(m_selectedIds);
    if (!m_selectedIds.isEmpty()) {
        emit nodeSelected(*m_selectedIds.constBegin());
    }
}

// ── Context menu ──

void CanvasView::contextMenuEvent(QContextMenuEvent* event) {
    QGraphicsItem* item = itemAt(event->pos());
    auto* nodeItem = qgraphicsitem_cast<NodeItem*>(item);

    QMenu menu(this);
    menu.setStyleSheet(
        "QMenu { background: #1a1d2e; color: #e6e6f0; border: 1px solid #2a2d3e; padding: 4px; }"
        "QMenu::item { padding: 6px 24px; }"
        "QMenu::item:selected { background: #2a3d5e; }"
        "QMenu::separator { height: 1px; background: #2a2d3e; margin: 4px 8px; }"
    );

    if (nodeItem) {
        QString id = nodeItem->nodeId();
        menu.addAction("📋 Duplicate", this, [this, id]() { emit duplicateRequested(id); });
        menu.addAction("🗑 Delete", this, [this, id]() { emit deleteRequested(id); });
        menu.addSeparator();
        menu.addAction("🎨 Copy Style", this, [this, id]() { emit copyStyleRequested(id); });
        menu.addAction("🖌 Paste Style", this, [this, id]() { emit pasteStyleRequested(id); });
        menu.addSeparator();
        menu.addAction("✅ Select All", this, [this]() {
            for (auto it = m_nodeItems.constBegin(); it != m_nodeItems.constEnd(); ++it) {
                it.value()->setSelected(true);
                m_selectedIds.insert(it.key());
            }
            emit selectionChanged(m_selectedIds);
        });
    } else {
        menu.addAction("✅ Select All", this, [this]() {
            for (auto it = m_nodeItems.constBegin(); it != m_nodeItems.constEnd(); ++it) {
                it.value()->setSelected(true);
                m_selectedIds.insert(it.key());
            }
            emit selectionChanged(m_selectedIds);
        });
        menu.addSeparator();
        menu.addAction("📋 Paste", this, [this]() {
            // TODO: clipboard paste
        });
    }

    menu.exec(event->globalPos());
}

// ── Keyboard ──

void CanvasView::keyPressEvent(QKeyEvent* event) {
    if (event->key() == Qt::Key_Space && !event->isAutoRepeat()) {
        m_spaceHeld = true;
        setCursor(Qt::OpenHandCursor);
        event->accept();
        return;
    }

    if (event->key() == Qt::Key_Control) {
        m_ctrlHeld = true;
    }

    // Arrow key nudge
    if (!m_selectedIds.isEmpty()) {
        int dx = 0, dy = 0;
        int step = (event->modifiers() & Qt::ShiftModifier) ? 10 : 1;
        switch (event->key()) {
            case Qt::Key_Left:  dx = -step; break;
            case Qt::Key_Right: dx = step;  break;
            case Qt::Key_Up:    dy = -step; break;
            case Qt::Key_Down:  dy = step;  break;
            default: break;
        }
        if (dx != 0 || dy != 0) {
            for (const auto& id : m_selectedIds) {
                if (auto* item = m_nodeItems.value(id, nullptr)) {
                    QPointF newPos = snapToGrid(item->pos() + QPointF(dx, dy));
                    item->setPos(newPos);
                    emit nodeMoved(id, newPos);
                }
            }
            event->accept();
            return;
        }
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
    if (event->key() == Qt::Key_Control) {
        m_ctrlHeld = false;
    }
    QGraphicsView::keyReleaseEvent(event);
}

void CanvasView::resizeEvent(QResizeEvent* event) {
    QGraphicsView::resizeEvent(event);
    // Keep MiniMap anchored to top-right of canvas
    if (m_miniMap) {
        int margin = 12;
        m_miniMap->move(width() - m_miniMap->width() - margin, margin);
    }
}
