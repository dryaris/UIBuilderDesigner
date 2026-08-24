#pragma once
#include <QWidget>
#include <QPushButton>
#include <QLabel>
#include <QHBoxLayout>
#include <QLineEdit>
#include <QComboBox>
#include <QMenu>

class TopBar : public QWidget {
    Q_OBJECT
public:
    explicit TopBar(QWidget* parent = nullptr);

    void setProjectName(const QString& name);
    void setZoom(float z);
    void setNodeCount(int count);

signals:
    void newProject();
    void openProject();
    void saveProject();
    void exportHTML();
    void exportPNG();
    void exportUnity();
    void exportUnreal();
    void exportGodot();
    void undo();
    void redo();
    void zoomIn();
    void zoomOut();
    void zoomReset();
    void searchNodes(const QString& query);
    void helpClicked();
    void toggleGrid();
    void toggleMiniMap();

private:
    void buildUI();

    QLabel* m_projectLabel;
    QLabel* m_nodeCountLabel;
    QLineEdit* m_searchBar;
    QLabel* m_zoomLabel;
};
