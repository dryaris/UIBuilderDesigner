#include "exporters.h"
#include <QPainter>
#include <QImage>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>

namespace Exporters {

QString toHTML(const QList<Node>& nodes, const QList<Connection>& connections, const QString& projectName) {
    QString html = QString(
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n"
        "<title>%1 — UI Forger Export</title>\n"
        "<style>\n"
        "  * { margin: 0; padding: 0; box-sizing: border-box; }\n"
        "  body { background: #14161f; font-family: Inter, sans-serif; overflow: auto; }\n"
        "  .canvas { position: relative; width: 1920px; height: 1080px; }\n"
        "  .node {\n"
        "    position: absolute; border-radius: 8px;\n"
        "    display: flex; align-items: center; justify-content: center;\n"
        "    font-size: 14px; color: #e6e6f0; overflow: hidden;\n"
        "  }\n"
        "  .node.hidden { display: none; }\n"
        "  .node .label { padding: 8px 12px; }\n"
        "  .accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 4px; border-radius: 8px 8px 0 0; }\n"
        "  .badge { position: absolute; bottom: 6px; right: 8px; font-size: 8px; "
        "color: #b4b4c8; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; }\n"
        "</style>\n</head>\n<body>\n<div class=\"canvas\">\n"
    ).arg(projectName);

    for (const auto& n : nodes) {
        if (n.hidden) continue;
        QString bg = QString::fromStdString(n.style.backgroundColor.empty() ? "#1e2130" : n.style.backgroundColor);
        QString accent = QString::fromStdString(n.style.color.empty() ? "#6366f1" : n.style.color);
        int fs = n.style.fontSize > 0 ? n.style.fontSize : 14;

        html += QString(
            "  <div class=\"node\" style=\""
            "left:%1px; top:%2px; width:%3px; height:%4px; "
            "background:%5; border-radius:%6px; border: %7px %8 %9; opacity:%10;"
            "\">\n"
            "    <div class=\"accent-bar\" style=\"background:%11;\"></div>\n"
            "    <span class=\"label\" style=\"font-size:%12px; font-weight:%13;\">%14</span>\n"
            "    <span class=\"badge\">%15</span>\n"
            "  </div>\n"
        ).arg((int)n.x).arg((int)n.y).arg((int)n.width).arg((int)n.height)
         .arg(bg).arg(n.style.borderRadius)
         .arg(n.style.borderWidth).arg(QString::fromStdString(n.style.borderStyle.empty() ? "none" : n.style.borderStyle))
         .arg(bg).arg(n.style.opacity)
         .arg(accent).arg(fs)
         .arg(QString::fromStdString(n.style.fontWeight.empty() ? "normal" : n.style.fontWeight))
         .arg(QString::fromStdString(n.label))
         .arg(QString::fromStdString(n.type));
    }

    html += "</div>\n</body>\n</html>";
    return html;
}

QString toUnity(const QList<Node>& nodes, const QString& projectName) {
    QString result;
    result += "// " + projectName + " — UI Forger → Unity UXML Export\n";
    result += "// Generate these UI elements as Unity UI Toolkit (UXML + USS)\n\n";
    result += "<ui:UXML xmlns:ui=\"UnityEngine.UIElements\" xmlns:uie=\"UnityEditor.UIElements\">\n";

    for (const auto& n : nodes) {
        if (n.hidden) continue;
        QString type = "ui:VisualElement";
        if (n.type == "button") type = "ui:Button";
        else if (n.type == "label" || n.type == "title") type = "ui:Label";
        else if (n.type == "slider") type = "ui:Slider";
        else if (n.type == "progressBar" || n.type == "healthBar" || n.type == "staminaBar") type = "ui:ProgressBar";

        result += QString("  <%1 name=\"%2\" text=\"%3\" style=\"left:%4px; top:%5px; width:%6px; height:%7px;\" />\n")
            .arg(type).arg(QString::fromStdString(n.id)).arg(QString::fromStdString(n.label))
            .arg((int)n.x).arg((int)n.y).arg((int)n.width).arg((int)n.height);
    }

    result += "</ui:UXML>\n";
    return result;
}

QString toUnreal(const QList<Node>& nodes, const QString& projectName) {
    QString result;
    QString safeName = projectName;
    safeName.replace(" ", "");
    result += "// " + projectName + " — UI Forger → Unreal UMG Widget Blueprint\n";
    result += "// Copy these into your UMG Widget Blueprint\n\n";

    result += "#pragma once\n#include \"CoreMinimal.h\"\n#include \"Blueprint/UserWidget.h\"\n";
    result += "#include \"" + safeName + "Widget.generated.h\"\n\n";

    result += "UCLASS()\n";
    result += "class U" + safeName + "Widget : public UUserWidget\n{\n    GENERATED_BODY()\n\nprotected:\n";

    for (const auto& n : nodes) {
        if (n.hidden) continue;
        QString wType = "UTextBlock";
        if (n.type == "button") wType = "UButton";
        else if (n.type == "image") wType = "UImage";
        else if (n.type == "slider") wType = "USlider";

        result += QString("    UPROPERTY(meta = (BindWidget))\n    %1* %2;\n\n")
            .arg(wType).arg(QString::fromStdString(n.id).replace("-", "_"));
    }

    result += "};\n";
    return result;
}

QString toGodot(const QList<Node>& nodes, const QString& projectName) {
    QString result;
    result += "; " + projectName + " — UI Forger → Godot Scene Export\n";
    result += "; Paste as Godot Scene (.tscn)\n\n";
    result += "[gd_scene load_steps=1 format=3]\n\n";

    int idx = 1;
    for (const auto& n : nodes) {
        if (n.hidden) continue;
        QString gdType = "Control";
        if (n.type == "button") gdType = "Button";
        else if (n.type == "label" || n.type == "title") gdType = "Label";
        else if (n.type == "slider") gdType = "HSlider";
        else if (n.type == "progressBar" || n.type == "healthBar") gdType = "ProgressBar";

        result += QString("[node name=\"%1\" type=\"%2\" parent=\".\"]\n")
            .arg(QString::fromStdString(n.label)).arg(gdType);
        result += QString("layout_mode = 0\nanchor_right = 0.0\nanchor_bottom = 0.0\n");
        result += QString("offset_left = %1\noffset_top = %2\n").arg((int)n.x).arg((int)n.y);
        result += QString("offset_right = %1\noffset_bottom = %2\n").arg((int)(n.x + n.width)).arg((int)(n.y + n.height));

        if (n.type == "label" || n.type == "title") {
            result += QString("text = \"%1\"\n").arg(QString::fromStdString(n.label));
        }

        result += "\n";
        idx++;
    }

    return result;
}

bool exportPNG(const QList<Node>& nodes, const QString& path, int width, int height) {
    QImage image(width, height, QImage::Format_ARGB32);
    image.fill(QColor(20, 22, 31));

    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing, true);

    for (const auto& n : nodes) {
        if (n.hidden) continue;

        QColor bg = QColor(QString::fromStdString(n.style.backgroundColor.empty() ? "#1e2130" : n.style.backgroundColor));
        QColor accent = QColor(QString::fromStdString(n.style.color.empty() ? "#6366f1" : n.style.color));

        // Background
        painter.setPen(QPen(bg.lighter(130), 1));
        painter.setBrush(bg);
        painter.drawRoundedRect((int)n.x, (int)n.y, (int)n.width, (int)n.height, n.style.borderRadius, n.style.borderRadius);

        // Accent bar
        painter.setPen(Qt::NoPen);
        painter.setBrush(accent);
        painter.drawRoundedRect(QRectF(n.x, n.y, n.width, 4), n.style.borderRadius, n.style.borderRadius);

        // Text
        QFont font("Inter", n.style.fontSize > 0 ? n.style.fontSize : 14);
        font.setBold(n.style.fontWeight == "bold");
        painter.setFont(font);
        painter.setPen(QColor(230, 230, 240));
        painter.drawText(QRectF(n.x + 12, n.y + 12, n.width - 24, n.height - 16),
                         Qt::AlignLeft | Qt::AlignVCenter,
                         QString::fromStdString(n.label));
    }

    painter.end();
    return image.save(path, "PNG");
}

} // namespace Exporters
