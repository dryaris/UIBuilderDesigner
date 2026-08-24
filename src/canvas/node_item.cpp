#include "node_item.h"
#include "../core/ir.h"
#include <QPainter>
#include <QStyleOptionGraphicsItem>
#include <QFont>
#include <QPen>
#include <QBrush>
#include <QLinearGradient>
#include <QGraphicsDropShadowEffect>
#include <QCursor>
#include <QFontMetrics>

NodeItem::NodeItem(const Node& node, QGraphicsItem* parent)
    : QGraphicsObject(parent)
    , m_node(node)
{
    setFlag(ItemIsMovable, true);
    setFlag(ItemIsSelectable, true);
    setFlag(ItemSendsGeometryChanges, true);
    setPos(node.x, node.y);
    setAcceptHoverEvents(true);
    setCursor(Qt::ArrowCursor);

    // Drop shadow
    auto* shadow = new QGraphicsDropShadowEffect();
    shadow->setBlurRadius(12);
    shadow->setColor(QColor(0, 0, 0, 80));
    shadow->setOffset(0, 2);
    setGraphicsEffect(shadow);
}

QRectF NodeItem::boundingRect() const {
    float w = m_node.width > 0 ? m_node.width : 200;
    float h = m_node.height > 0 ? m_node.height : 60;
    return QRectF(-4, -4, w + 8, h + 8);
}

void NodeItem::paint(QPainter* painter, const QStyleOptionGraphicsItem* option, QWidget*) {
    painter->setRenderHint(QPainter::Antialiasing, true);
    painter->setRenderHint(QPainter::TextAntialiasing, true);

    float w = m_node.width > 0 ? m_node.width : 200;
    float h = m_node.height > 0 ? m_node.height : 60;
    float r = 8.0;

    // Selection highlight
    if (option->state & QStyle::State_Selected) {
        painter->setPen(QPen(QColor(99, 102, 241), 2, Qt::SolidLine));
        painter->setBrush(Qt::NoBrush);
        painter->drawRoundedRect(QRectF(-2, -2, w + 4, h + 4), r + 2, r + 2);
    }

    // Background
    QColor bgColor = QColor(QString::fromStdString(m_node.style.backgroundColor.empty()
        ? "#1e2130" : m_node.style.backgroundColor));
    QLinearGradient bgGrad(0, 0, 0, h);
    bgGrad.setColorAt(0, bgColor.lighter(110));
    bgGrad.setColorAt(1, bgColor);
    painter->setPen(QPen(bgColor.lighter(130), 1));
    painter->setBrush(bgGrad);
    painter->drawRoundedRect(0, 0, w, h, r, r);

    // Color accent bar at top
    QColor accent = QColor(QString::fromStdString(
        m_node.style.color.empty() ? "#6366f1" : m_node.style.color));
    painter->setPen(Qt::NoPen);
    painter->setBrush(accent);
    painter->drawRoundedRect(QRectF(0, 0, w, 4), r, r);

    // Text
    QFont font("Inter", 12);
    if (m_node.type == "label" || m_node.type == "title") {
        font.setPointSize(m_node.style.fontSize > 0 ? m_node.style.fontSize : 16);
        font.setBold(m_node.type == "title");
    }
    painter->setFont(font);
    painter->setPen(QColor(230, 230, 240));
    QRectF textRect(12, 12, w - 24, h - 16);
    painter->drawText(textRect, Qt::AlignLeft | Qt::AlignVCenter,
                      QString::fromStdString(m_node.label));

    // Component badge
    if (!m_node.type.empty()) {
        QFont badgeFont("Inter", 8);
        painter->setFont(badgeFont);
        QFontMetrics fm(badgeFont);
        QString badge = QString::fromStdString(m_node.type);
        int bw = fm.horizontalAdvance(badge) + 12;
        int bh = fm.height() + 6;
        QRectF badgeRect(w - bw - 8, h - bh - 6, bw, bh);

        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(255, 255, 255, 25));
        painter->drawRoundedRect(badgeRect, 4, 4);
        painter->setPen(QColor(180, 180, 200));
        painter->drawText(badgeRect, Qt::AlignCenter, badge);
    }

    // Conditional visibility indicator
    if (!m_node.conditionalVisibility.empty()) {
        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(251, 191, 36)); // amber
        painter->drawEllipse(QRectF(w - 16, 8, 8, 8));
    }
}

QVariant NodeItem::itemChange(GraphicsItemChange change, const QVariant& value) {
    if (change == ItemPositionHasChanged) {
        emit positionChanged(QString::fromStdString(m_node.id), pos());
    }
    return QGraphicsObject::itemChange(change, value);
}

void NodeItem::hoverEnterEvent(QGraphicsSceneHoverEvent*) {
    setCursor(Qt::SizeAllCursor);
}

void NodeItem::hoverLeaveEvent(QGraphicsSceneHoverEvent*) {
    setCursor(Qt::ArrowCursor);
}
