#pragma once
#include "../core/ir.h"
#include <QList>
#include <QString>

namespace Exporters {

    QString toHTML(const QList<Node>& nodes, const QList<Connection>& connections,
                   const QString& projectName);

    QString toUnity(const QList<Node>& nodes, const QString& projectName);

    QString toUnreal(const QList<Node>& nodes, const QString& projectName);

    QString toGodot(const QList<Node>& nodes, const QString& projectName);

    // PNG export renders to QImage via QPainter
    bool exportPNG(const QList<Node>& nodes, const QString& path, int width = 1920, int height = 1080);

} // namespace Exporters
