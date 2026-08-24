#pragma once
#include <QWidget>
#include <QList>
#include <QRectF>

struct Node;

class MiniMap : public QWidget {
    Q_OBJECT
public:
    explicit MiniMap(QWidget* parent = nullptr);

    void setNodes(const QList<Node>& nodes);
    void setViewport(const QRectF& viewport, float zoom);
    void setSceneSize(const QSizeF& size);

protected:
    void paintEvent(QPaintEvent* event) override;

private:
    QList<Node> m_nodes;
    QRectF m_viewport;
    QSizeF m_sceneSize = QSizeF(1920, 1080);
};
