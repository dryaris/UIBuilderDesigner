#include "persistence.h"
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QDir>

namespace Persistence {

QJsonObject nodeToJson(const Node& n) {
    QJsonObject o;
    o["id"] = QString::fromStdString(n.id);
    o["type"] = QString::fromStdString(n.type);
    o["label"] = QString::fromStdString(n.label);
    o["x"] = (double)n.x;
    o["y"] = (double)n.y;
    o["width"] = (double)n.width;
    o["height"] = (double)n.height;
    o["locked"] = n.locked;
    o["hidden"] = n.hidden;

    QJsonObject style;
    style["backgroundColor"] = QString::fromStdString(n.style.backgroundColor);
    style["color"] = QString::fromStdString(n.style.color);
    style["borderStyle"] = QString::fromStdString(n.style.borderStyle);
    style["borderWidth"] = n.style.borderWidth;
    style["borderRadius"] = n.style.borderRadius;
    style["fill"] = QString::fromStdString(n.style.fill);
    style["opacity"] = (double)n.style.opacity;
    style["shadow"] = QString::fromStdString(n.style.shadow);
    style["fontFamily"] = QString::fromStdString(n.style.fontFamily);
    style["fontSize"] = n.style.fontSize;
    style["fontWeight"] = QString::fromStdString(n.style.fontWeight);
    style["fontStyle"] = QString::fromStdString(n.style.fontStyle);
    style["textAlign"] = QString::fromStdString(n.style.textAlign);
    style["textColor"] = QString::fromStdString(n.style.textColor);
    o["style"] = style;

    if (!n.conditionalVisibility.empty()) {
        QJsonArray conditions;
        for (const auto& c : n.conditionalVisibility) {
            QJsonObject cond;
            cond["variable"] = QString::fromStdString(c.variable);
            cond["operator"] = QString::fromStdString(c.op);
            cond["value"] = QString::fromStdString(c.value);
            conditions.append(cond);
        }
        o["conditionalVisibility"] = conditions;
    }

    return o;
}

Node nodeFromJson(const QJsonObject& o) {
    Node n;
    n.id = o["id"].toString().toStdString();
    n.type = o["type"].toString().toStdString();
    n.label = o["label"].toString().toStdString();
    n.x = (float)o["x"].toDouble();
    n.y = (float)o["y"].toDouble();
    n.width = (float)o["width"].toDouble();
    n.height = (float)o["height"].toDouble();
    n.locked = o["locked"].toBool();
    n.hidden = o["hidden"].toBool();

    QJsonObject style = o["style"].toObject();
    n.style.backgroundColor = style["backgroundColor"].toString().toStdString();
    n.style.color = style["color"].toString().toStdString();
    n.style.borderStyle = style["borderStyle"].toString().toStdString();
    n.style.borderWidth = style["borderWidth"].toInt();
    n.style.borderRadius = style["borderRadius"].toInt();
    n.style.fill = style["fill"].toString().toStdString();
    n.style.opacity = (float)style["opacity"].toDouble(1.0);
    n.style.shadow = style["shadow"].toString().toStdString();
    n.style.fontFamily = style["fontFamily"].toString().toStdString();
    n.style.fontSize = style["fontSize"].toInt();
    n.style.fontWeight = style["fontWeight"].toString().toStdString();
    n.style.fontStyle = style["fontStyle"].toString().toStdString();
    n.style.textAlign = style["textAlign"].toString().toStdString();
    n.style.textColor = style["textColor"].toString().toStdString();

    QJsonArray conditions = o["conditionalVisibility"].toArray();
    for (const auto& c : conditions) {
        QJsonObject co = c.toObject();
        n.conditionalVisibility.push_back({
            co["variable"].toString().toStdString(),
            co["operator"].toString().toStdString(),
            co["value"].toString().toStdString()
        });
    }

    return n;
}

QString serialize(const QList<Node>& nodes, const QList<Connection>& connections, const QString& projectName) {
    QJsonObject root;
    root["version"] = 1;
    root["projectName"] = projectName;

    QJsonArray nodesArr;
    for (const auto& n : nodes) nodesArr.append(nodeToJson(n));
    root["nodes"] = nodesArr;

    QJsonArray connsArr;
    for (const auto& c : connections) {
        QJsonObject co;
        co["from"] = QString::fromStdString(c.from);
        co["to"] = QString::fromStdString(c.to);
        co["fromPort"] = QString::fromStdString(c.fromPort);
        co["toPort"] = QString::fromStdString(c.toPort);
        connsArr.append(co);
    }
    root["connections"] = connsArr;

    return QJsonDocument(root).toJson(QJsonDocument::Compact);
}

bool deserialize(const QString& json, QList<Node>& nodes, QList<Connection>& connections, QString& projectName) {
    QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8());
    if (doc.isNull()) return false;

    QJsonObject root = doc.object();
    projectName = root["projectName"].toString("Untitled");

    nodes.clear();
    QJsonArray nodesArr = root["nodes"].toArray();
    for (const auto& v : nodesArr) nodes.append(nodeFromJson(v.toObject()));

    connections.clear();
    QJsonArray connsArr = root["connections"].toArray();
    for (const auto& v : connsArr) {
        QJsonObject co = v.toObject();
        connections.push_back({
            co["from"].toString().toStdString(),
            co["to"].toString().toStdString(),
            co["fromPort"].toString().toStdString(),
            co["toPort"].toString().toStdString()
        });
    }

    return true;
}

bool saveToFile(const QString& path, const QList<Node>& nodes, const QList<Connection>& connections, const QString& projectName) {
    QFile file(path);
    if (!file.open(QIODevice::WriteOnly)) return false;
    file.write(serialize(nodes, connections, projectName).toUtf8());
    file.close();
    return true;
}

bool loadFromFile(const QString& path, QList<Node>& nodes, QList<Connection>& connections, QString& projectName) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly)) return false;
    QString json = QString::fromUtf8(file.readAll());
    file.close();
    return deserialize(json, nodes, connections, projectName);
}

} // namespace Persistence
