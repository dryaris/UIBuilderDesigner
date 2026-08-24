#include <QApplication>
#include "ui/mainwindow.h"
#include <QStyleFactory>
#include <QFont>

int main(int argc, char* argv[]) {
    QApplication app(argc, argv);

    // Dark theme base
    app.setStyle(QStyleFactory::create("Fusion"));

    QPalette darkPalette;
    darkPalette.setColor(QPalette::Window, QColor(26, 29, 46));
    darkPalette.setColor(QPalette::WindowText, QColor(230, 230, 240));
    darkPalette.setColor(QPalette::Base, QColor(20, 22, 31));
    darkPalette.setColor(QPalette::AlternateBase, QColor(26, 29, 46));
    darkPalette.setColor(QPalette::ToolTipBase, QColor(26, 29, 46));
    darkPalette.setColor(QPalette::ToolTipText, QColor(230, 230, 240));
    darkPalette.setColor(QPalette::Text, QColor(230, 230, 240));
    darkPalette.setColor(QPalette::Button, QColor(42, 45, 62));
    darkPalette.setColor(QPalette::ButtonText, QColor(230, 230, 240));
    darkPalette.setColor(QPalette::BrightText, QColor(255, 50, 50));
    darkPalette.setColor(QPalette::Link, QColor(99, 102, 241));
    darkPalette.setColor(QPalette::Highlight, QColor(99, 102, 241));
    darkPalette.setColor(QPalette::HighlightedText, QColor(255, 255, 255));
    darkPalette.setColor(QPalette::Disabled, QPalette::Text, QColor(100, 100, 120));
    darkPalette.setColor(QPalette::Disabled, QPalette::ButtonText, QColor(100, 100, 120));
    app.setPalette(darkPalette);

    // Default font
    QFont defaultFont("Inter", 10);
    defaultFont.setStyleStrategy(QFont::PreferAntialias);
    app.setFont(defaultFont);

    // App metadata
    app.setApplicationName("UI Forger");
    app.setApplicationVersion("1.1.0");
    app.setOrganizationName("UI Forger");

    MainWindow window;
    window.show();

    return app.exec();
}
