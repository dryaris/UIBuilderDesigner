#pragma once
#include <QGraphicsObject>
#include <QRectF>
#include <QPainter>
#include <QString>

struct Node;

class NodeItem : public QGraphicsObject {
    Q_OBJECT
public:
    explicit NodeItem(const Node& node, QGraphicsItem* parent = nullptr);

    QRectF boundingRect() const override;
    void paint(QPainter* painter, const QStyleOptionGraphicsItem* option, QWidget* widget) override;

    QString nodeId() const { return QString::fromStdString(m_node.id); }
    const Node& node() const { return m_node; }
    void setNode(const Node& n) { prepareGeometryChange(); m_node = n; update(); }

signals:
    void positionChanged(const QString& nodeId, const QPointF& newPos);

protected:
    QVariant itemChange(GraphicsItemChange change, const QVariant& value) override;
    void hoverEnterEvent(QGraphicsSceneHoverEvent* event) override;
    void hoverLeaveEvent(QGraphicsSceneHoverEvent* event) override;

private:
    Node m_node;
};
