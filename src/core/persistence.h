#pragma once
#include "../core/ir.h"
#include <QString>
#include <QList>

namespace Persistence {

    // Save the current scene to a .canvas JSON file
    bool saveToFile(const QString& path, const QList<Node>& nodes,
                    const QList<Connection>& connections,
                    const QString& projectName);

    // Load scene from a .canvas JSON file
    bool loadFromFile(const QString& path, QList<Node>& nodes,
                      QList<Connection>& connections,
                      QString& projectName);

    // Serialize to JSON string (for autosave / clipboard)
    QString serialize(const QList<Node>& nodes,
                      const QList<Connection>& connections,
                      const QString& projectName);

    // Deserialize from JSON string
    bool deserialize(const QString& json, QList<Node>& nodes,
                     QList<Connection>& connections,
                     QString& projectName);

} // namespace Persistence
