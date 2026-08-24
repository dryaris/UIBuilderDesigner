#include "node_item.h"
#include "../core/ir.h"
#include <QPainter>
#include <QStyleOptionGraphicsItem>
#include <QFont>
#include <QPen>
#include <QBrush>
#include <QLinearGradient>
#include <QRadialGradient>
#include <QGraphicsDropShadowEffect>
#include <QCursor>
#include <QFontMetrics>
#include <QtMath>

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

    // Drop shadow — type-specific intensity
    auto* shadow = new QGraphicsDropShadowEffect();
    if (m_node.type == "tooltip" || m_node.type == "toast" || m_node.type == "dialog") {
        shadow->setBlurRadius(24);
        shadow->setColor(QColor(0, 0, 0, 120));
        shadow->setOffset(0, 4);
    } else if (m_node.style.shadow == "large") {
        shadow->setBlurRadius(20);
        shadow->setColor(QColor(0, 0, 0, 100));
        shadow->setOffset(0, 4);
    } else if (m_node.style.shadow == "medium") {
        shadow->setBlurRadius(14);
        shadow->setColor(QColor(0, 0, 0, 80));
        shadow->setOffset(0, 3);
    } else if (m_node.style.shadow == "small") {
        shadow->setBlurRadius(8);
        shadow->setColor(QColor(0, 0, 0, 60));
        shadow->setOffset(0, 2);
    } else {
        shadow->setBlurRadius(10);
        shadow->setColor(QColor(0, 0, 0, 60));
        shadow->setOffset(0, 2);
    }
    setGraphicsEffect(shadow);
}

QPointF NodeItem::snapToGrid(const QPointF& pos) const {
    if (!m_snapEnabled) return pos;
    float gx = m_gridSize;
    float gy = m_gridSize;
    return QPointF(
        qRound(pos.x() / gx) * gx,
        qRound(pos.y() / gy) * gy
    );
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
    float r = (float)m_node.style.borderRadius;

    // ── Opacity ──
    if (m_node.style.opacity < 1.0f) {
        painter->setOpacity(m_node.style.opacity);
    }

    // ── Selection highlight (outer glow) ──
    if (option->state & QStyle::State_Selected) {
        painter->setPen(QPen(QColor(99, 102, 241), 2.0, Qt::SolidLine));
        painter->setBrush(QColor(99, 102, 241, 15));
        painter->drawRoundedRect(QRectF(-3, -3, w + 6, h + 6), r + 3, r + 3);

        // Corner handles
        painter->setBrush(QColor(99, 102, 241));
        painter->setPen(Qt::NoPen);
        float hs = 5.0f;
        painter->drawRect(QRectF(-hs / 2, -hs / 2, hs, hs));
        painter->drawRect(QRectF(w - hs / 2, -hs / 2, hs, hs));
        painter->drawRect(QRectF(-hs / 2, h - hs / 2, hs, hs));
        painter->drawRect(QRectF(w - hs / 2, h - hs / 2, hs, hs));
    }

    // ── Background ──
    QColor bgColor = QColor(QString::fromStdString(m_node.style.backgroundColor.empty()
        ? "#1e2130" : m_node.style.backgroundColor));

    // Type-specific background rendering
    if (m_node.type == "healthBar" || m_node.type == "staminaBar" ||
        m_node.type == "progressBar") {
        // Dark trough
        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(20, 22, 31));
        painter->drawRoundedRect(0, 0, w, h, r, r);

        // Fill bar (parse label as "current / max" or use 70% default)
        float fillRatio = 0.7f;
        if (!m_node.label.empty()) {
            auto parts = QString::fromStdString(m_node.label).split("/");
            if (parts.size() == 2) {
                float cur = parts[0].trimmed().toFloat();
                float max = parts[1].trimmed().toFloat();
                if (max > 0) fillRatio = qBound(0.0f, cur / max, 1.0f);
            }
        }

        QColor fillColor = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#22c55e" : m_node.style.color));
        QLinearGradient barGrad(0, 0, w * fillRatio, 0);
        barGrad.setColorAt(0, fillColor.lighter(130));
        barGrad.setColorAt(0.5, fillColor);
        barGrad.setColorAt(1, fillColor.darker(110));
        painter->setBrush(barGrad);
        painter->drawRoundedRect(0, 0, w * fillRatio, h, r, r);

        // Subtle inner highlight
        painter->setPen(Qt::NoPen);
        QLinearGradient hlGrad(0, 0, 0, h);
        hlGrad.setColorAt(0, QColor(255, 255, 255, 40));
        hlGrad.setColorAt(0.5, QColor(255, 255, 255, 0));
        painter->setBrush(hlGrad);
        painter->drawRoundedRect(0, 0, w * fillRatio, h * 0.5f, r, r);

    } else if (m_node.type == "button") {
        // Button with gradient and pressed look
        QLinearGradient btnGrad(0, 0, 0, h);
        btnGrad.setColorAt(0, bgColor.lighter(120));
        btnGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(bgColor.lighter(140), 1));
        painter->setBrush(btnGrad);
        painter->drawRoundedRect(0, 0, w, h, r, r);

        // Bottom edge depth
        painter->setPen(Qt::NoPen);
        painter->setBrush(bgColor.darker(130));
        painter->drawRoundedRect(QRectF(0, h - 3, w, 3), 0, 0);

    } else if (m_node.type == "tooltip" || m_node.type == "toast") {
        // Floating card with tail
        QLinearGradient tipGrad(0, 0, 0, h);
        tipGrad.setColorAt(0, bgColor.lighter(115));
        tipGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(bgColor.lighter(150), 1));
        painter->setBrush(tipGrad);
        painter->drawRoundedRect(0, 0, w, h, r, r);

        // Small tail triangle at bottom-center
        float tailW = 10;
        QPainterPath tail;
        tail.moveTo(w / 2 - tailW, h);
        tail.lineTo(w / 2 + tailW, h);
        tail.lineTo(w / 2, h + 8);
        tail.closeSubpath();
        painter->setPen(Qt::NoPen);
        painter->setBrush(bgColor);
        painter->drawPath(tail);

    } else if (m_node.type == "slider") {
        // Track
        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(40, 43, 60));
        painter->drawRoundedRect(0, h / 2 - 3, w, 6, 3, 3);

        // Thumb
        float thumbX = w * 0.6f; // default 60%
        QColor accent = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#6366f1" : m_node.style.color));
        painter->setBrush(accent);
        painter->drawEllipse(QPointF(thumbX, h / 2), 8, 8);
        painter->setPen(QPen(QColor(255, 255, 255, 60), 1.5));
        painter->setBrush(Qt::NoBrush);
        painter->drawEllipse(QPointF(thumbX, h / 2), 8, 8);

    } else if (m_node.type == "divider") {
        // Simple horizontal line
        QColor accent = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#2a2d3e" : m_node.style.color));
        painter->setPen(QPen(accent, 1));
        painter->drawLine(0, h / 2, w, h / 2);

    } else if (m_node.type == "badge") {
        // Small pill badge
        QLinearGradient badgeGrad(0, 0, w, 0);
        QColor accent = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#6366f1" : m_node.style.color));
        badgeGrad.setColorAt(0, accent);
        badgeGrad.setColorAt(1, accent.lighter(120));
        painter->setPen(Qt::NoPen);
        painter->setBrush(badgeGrad);
        painter->drawRoundedRect(0, 0, w, h, h / 2, h / 2);

    } else if (m_node.type == "checkbox") {
        // Box + check area
        float boxSize = qMin(h - 8, 20.0f);
        float boxY = (h - boxSize) / 2;
        painter->setPen(QPen(QColor(100, 103, 140), 1.5));
        painter->setBrush(QColor(20, 22, 31));
        painter->drawRoundedRect(8, boxY, boxSize, boxSize, 4, 4);

    } else if (m_node.type == "dialog") {
        // Dialog: card with header bar
        QLinearGradient dlgGrad(0, 0, 0, h);
        dlgGrad.setColorAt(0, bgColor.lighter(115));
        dlgGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(bgColor.lighter(140), 1));
        painter->setBrush(dlgGrad);
        painter->drawRoundedRect(0, 0, w, h, r, r);
        // Header bar
        painter->setPen(Qt::NoPen);
        painter->setBrush(bgColor.lighter(130));
        painter->drawRoundedRect(QRectF(0, 0, w, 32), r, r);
        painter->setBrush(bgColor);
        painter->drawRect(QRectF(0, 16, w, 16));
        // Close button hint
        painter->setPen(QColor(255, 100, 100));
        painter->setBrush(Qt::NoBrush);
        painter->drawEllipse(QPointF(w - 16, 16), 5, 5);

    } else if (m_node.type == "avatar") {
        // Avatar: circular
        float size = qMin(w, h);
        float cx = (w - size) / 2;
        float cy = (h - size) / 2;
        QColor accent = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#6366f1" : m_node.style.color));
        QRadialGradient avatarGrad(cx + size / 2, cy + size / 2, size / 2);
        avatarGrad.setColorAt(0, bgColor.lighter(120));
        avatarGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(accent, 2));
        painter->setBrush(avatarGrad);
        painter->drawEllipse(QRectF(cx, cy, size, size));

    } else if (m_node.type == "statDisplay") {
        // Stat display: value big + label small
        QLinearGradient statGrad(0, 0, 0, h);
        statGrad.setColorAt(0, bgColor.lighter(110));
        statGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(bgColor.lighter(130), 1));
        painter->setBrush(statGrad);
        painter->drawRoundedRect(0, 0, w, h, r, r);

    } else if (m_node.type == "input") {
        // Input field: bottom border style
        QLinearGradient inputGrad(0, 0, 0, h);
        inputGrad.setColorAt(0, bgColor.lighter(105));
        inputGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(bgColor.lighter(120), 1));
        painter->setBrush(inputGrad);
        painter->drawRoundedRect(0, 0, w, h, r, r);
        // Bottom accent line
        QColor accent = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#6366f1" : m_node.style.color));
        painter->setPen(QPen(accent, 2));
        painter->drawLine(4, h - 2, w - 4, h - 2);

    } else if (m_node.type == "dropdown") {
        // Dropdown with arrow
        QLinearGradient ddGrad(0, 0, 0, h);
        ddGrad.setColorAt(0, bgColor.lighter(110));
        ddGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(bgColor.lighter(130), 1));
        painter->setBrush(ddGrad);
        painter->drawRoundedRect(0, 0, w, h, r, r);
        // Arrow
        painter->setPen(QColor(160, 163, 200));
        painter->drawLine(w - 20, h / 2 - 3, w - 14, h / 2 + 3);
        painter->drawLine(w - 14, h / 2 + 3, w - 8, h / 2 - 3);

    } else {
        // Default: solid background with gradient
        QLinearGradient bgGrad(0, 0, 0, h);
        bgGrad.setColorAt(0, bgColor.lighter(110));
        bgGrad.setColorAt(1, bgColor);
        painter->setPen(QPen(bgColor.lighter(130), 1));
        painter->setBrush(bgGrad);
        painter->drawRoundedRect(0, 0, w, h, r, r);
    }

    // ── Accent bar at top (not for bars/sliders/dividers/specialized) ──
    if (m_node.type != "healthBar" && m_node.type != "staminaBar" &&
        m_node.type != "progressBar" && m_node.type != "slider" &&
        m_node.type != "divider" && m_node.type != "dialog" &&
        m_node.type != "avatar" && m_node.type != "input" &&
        m_node.type != "dropdown") {
        QColor accent = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#6366f1" : m_node.style.color));
        painter->setPen(Qt::NoPen);
        painter->setBrush(accent);
        // Only draw top accent bar, clipped to radius
        QPainterPath clipPath;
        clipPath.addRoundedRect(QRectF(0, 0, w, h), r, r);
        painter->setClipPath(clipPath);
        painter->drawRoundedRect(QRectF(0, 0, w, 4), r, r);
        painter->setClipping(false);
    }

    // ── Border ──
    if (m_node.style.borderWidth > 0 && m_node.style.borderStyle != "none") {
        Qt::PenStyle penStyle = Qt::SolidLine;
        if (m_node.style.borderStyle == "dashed") penStyle = Qt::DashLine;
        else if (m_node.style.borderStyle == "dotted") penStyle = Qt::DotLine;

        QColor borderColor = QColor(QString::fromStdString(
            m_node.style.color.empty() ? "#3a3d4e" : m_node.style.color));
        painter->setPen(QPen(borderColor, m_node.style.borderWidth, penStyle));
        painter->setBrush(Qt::NoBrush);
        painter->drawRoundedRect(QRectF(0, 0, w, h), r, r);
    }

    // ── Text ──
    if (m_node.type != "divider" && m_node.type != "slider") {
        QFont font(QString::fromStdString(m_node.style.fontFamily), m_node.style.fontSize > 0 ? m_node.style.fontSize : 12);
        font.setBold(m_node.style.fontWeight == "bold" || m_node.style.fontWeight == "700");
        font.setItalic(m_node.style.fontStyle == "italic");
        painter->setFont(font);

        QColor textColor = QColor(QString::fromStdString(
            m_node.style.textColor.empty() ? "#e6e6f0" : m_node.style.textColor));
        painter->setPen(textColor);

        Qt::Alignment align = Qt::AlignVCenter;
        if (m_node.style.textAlign == "center") align |= Qt::AlignHCenter;
        else if (m_node.style.textAlign == "right") align |= Qt::AlignRight;
        else align |= Qt::AlignLeft;

        QRectF textRect(12, 6, w - 24, h - 12);
        painter->drawText(textRect, align, QString::fromStdString(m_node.label));
    }

    // ── Component badge ──
    if (!m_node.type.empty() && m_node.type != "divider") {
        QFont badgeFont(QString::fromStdString(m_node.style.fontFamily), 8);
        painter->setFont(badgeFont);
        QFontMetrics fm(badgeFont);
        QString badge = QString::fromStdString(m_node.type);
        int bw = fm.horizontalAdvance(badge) + 12;
        int bh = fm.height() + 6;
        QRectF badgeRect(w - bw - 8, h - bh - 6, bw, bh);

        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(255, 255, 255, 20));
        painter->drawRoundedRect(badgeRect, 4, 4);
        painter->setPen(QColor(160, 163, 200));
        painter->drawText(badgeRect, Qt::AlignCenter, badge);
    }

    // ── Conditional visibility indicator ──
    if (!m_node.conditionalVisibility.empty()) {
        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(251, 191, 36)); // amber
        painter->drawEllipse(QRectF(w - 16, 8, 8, 8));
    }

    // ── Hidden indicator ──
    if (m_node.hidden) {
        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(0, 0, 0, 100));
        painter->drawRoundedRect(0, 0, w, h, r, r);

        QFont eyeFont(QString::fromStdString(m_node.style.fontFamily), 16);
        painter->setFont(eyeFont);
        painter->setPen(QColor(255, 255, 255, 80));
        painter->drawText(QRectF(0, 0, w, h), Qt::AlignCenter, "👁");
    }

    // ── Locked indicator ──
    if (m_node.locked) {
        painter->setPen(Qt::NoPen);
        painter->setBrush(QColor(255, 255, 255, 8));
        painter->drawRoundedRect(0, 0, w, h, r, r);

        QFont lockFont(QString::fromStdString(m_node.style.fontFamily), 10);
        painter->setFont(lockFont);
        painter->setPen(QColor(255, 255, 255, 60));
        painter->drawText(QRectF(w - 20, 4, 16, 16), Qt::AlignCenter, "🔒");
    }
}

QVariant NodeItem::itemChange(GraphicsItemChange change, const QVariant& value) {
    if (change == ItemPositionHasChanged) {
        QPointF newPos = snapToGrid(pos());
        if (newPos != pos()) {
            setPos(newPos);
        }
        emit positionChanged(QString::fromStdString(m_node.id), newPos);
    }
    return QGraphicsObject::itemChange(change, value);
}

void NodeItem::hoverEnterEvent(QGraphicsSceneHoverEvent*) {
    setCursor(Qt::SizeAllCursor);
}

void NodeItem::hoverLeaveEvent(QGraphicsSceneHoverEvent*) {
    setCursor(Qt::ArrowCursor);
}
