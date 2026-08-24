#pragma once
#include <QString>
#include <QList>
#include <QStringList>
#include <QUuid>
#include <QTime>
#include <string>
#include <vector>

// Simple inline UID generator
inline std::string uid() {
    return QUuid::createUuid().toString(QUuid::WithoutBraces).left(12).toStdString();
}

// ── Style ──

struct NodeStyle {
    std::string backgroundColor;
    std::string color;
    std::string borderStyle = "none";
    int borderWidth = 0;
    int borderRadius = 8;
    std::string fill = "solid";
    float opacity = 1.0f;
    std::string shadow = "none";

    // Typography
    std::string fontFamily = "Inter";
    int fontSize = 14;
    std::string fontWeight = "normal";
    std::string fontStyle = "normal";
    std::string textAlign = "left";
    std::string textColor;

    // Layout
    std::string flexDirection;
    std::string justifyContent;
    std::string alignItems;
    double gap = 0;
    double padTop = 0, padRight = 0, padBottom = 0, padLeft = 0;
};

// ── Conditional Visibility ──

struct ConditionalRule {
    std::string variable;
    std::string op;     // ==, !=, >, <, >=, <=
    std::string value;
};

// ── Node ──

struct Node {
    std::string id;
    std::string type = "container";  // container, button, label, title, image, slider, etc.
    std::string label;
    float x = 0, y = 0;
    float width = 200, height = 60;
    bool locked = false;
    bool hidden = false;

    NodeStyle style;
    std::vector<ConditionalRule> conditionalVisibility;
};

// ── Connection ──

struct Connection {
    std::string from;
    std::string to;
    std::string fromPort = "right";
    std::string toPort = "left";
};

// ── Game Variable ──

struct GameVariable {
    std::string name;
    std::string type = "string";  // string, number, boolean
    std::string defaultValue;
};
