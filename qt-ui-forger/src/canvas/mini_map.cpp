#include "mini_map.h"
#include "../core/ir.h"
#include <QPainter>
#include <QPainterPath>

MiniMap::MiniMap(QWidget* parent)
    : QWidget(parent) {
    setFixedSize(200, 120);
    setStyleSheet("background: #0d0f16; border: 1px solid #2a2d3e; border-radius: 6px;");
}

void MiniMap::setNodes(const QList<Node>& nodes) {
    m_nodes = nodes;
    update();
}

void MiniMap::setViewport(const QRectF& viewport, float zoom) {
    m_viewport = viewport;
    Q_UNUSED(zoom);
    update();
}

void MiniMap::setSceneSize(const QSizeF& size) {
    m_sceneSize = size;
    update();
}

void MiniMap::paintEvent(QPaintEvent*) {
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing, true);
    painter.fillRect(rect(), QColor(13, 15, 22));

    if (m_sceneSize.isEmpty()) return;

    float sx = width() / m_sceneSize.width();
    float sy = height() / m_sceneSize.height();
    float scale = qMin(sx, sy);

    for (const auto& n : m_nodes) {
        if (n.hidden) continue;

        QColor bg = QColor(QString::fromStdString(n.style.backgroundColor.empty() ? "#2a2d3e" : n.style.backgroundColor));
        QColor accent = QColor(QString::fromStdString(n.style.color.empty() ? "#6366f1" : n.style.color));

        QRectF r(n.x * scale, n.y * scale, qMax(n.width * scale, 3.0f), qMax(n.height * scale, 2.0f));
        painter.setPen(Qt::NoPen);
        painter.setBrush(bg.lighter(120));
        painter.drawRoundedRect(r, 1, 1);

        // Accent bar at top
        painter.setBrush(accent);
        painter.drawRoundedRect(QRectF(r.x(), r.y(), r.width(), 1.5), 1, 1);
    }

    // Viewport rectangle
    if (!m_viewport.isNull()) {
        QRectF vp(m_viewport.x() * scale, m_viewport.y() * scale,
                  m_viewport.width() * scale, m_viewport.height() * scale);
        painter.setPen(QPen(QColor(99, 102, 241, 180), 1.5));
        painter.setBrush(QColor(99, 102, 241, 20));
        painter.drawRect(vp);
    }
}
