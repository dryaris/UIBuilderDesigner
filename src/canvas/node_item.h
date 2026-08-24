#pragma once
#include "core/ir.h"
#include <QGraphicsObject>
#include <QRectF>
#include <QPainter>
#include <QString>

class NodeItem : public QGraphicsObject {
    Q_OBJECT
public:
    explicit NodeItem(const Node& node, QGraphicsItem* parent = nullptr);

    QRectF boundingRect() const override;
    void paint(QPainter* painter, const QStyleOptionGraphicsItem* option, QWidget* widget) override;

    QString nodeId() const { return QString::fromStdString(m_node.id); }
    const Node& node() const { return m_node; }
    void setNode(const Node& n) { prepareGeometryChange(); m_node = n; update(); }

    void setSnapEnabled(bool enabled) { m_snapEnabled = enabled; }
    bool snapEnabled() const { return m_snapEnabled; }
    void setGridSize(int size) { m_gridSize = size; }

signals:
    void positionChanged(const QString& nodeId, const QPointF& newPos);

protected:
    QVariant itemChange(GraphicsItemChange change, const QVariant& value) override;
    void hoverEnterEvent(QGraphicsSceneHoverEvent* event) override;
    void hoverLeaveEvent(QGraphicsSceneHoverEvent* event) override;

private:
    QPointF snapToGrid(const QPointF& pos) const;

    Node m_node;
    bool m_snapEnabled = true;
    int m_gridSize = 10;
};
