#pragma once
#include <QMainWindow>
#include <QMenuBar>
#include <QMenu>
#include <QSplitter>
#include <QUndoStack>
#include <QTimer>

class CanvasView;
class Inspector;
class TopBar;
class TreePanel;
class MiniMap;
class SceneStore;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget* parent = nullptr);

private slots:
    void onNewProject();
    void onOpenProject();
    void onSaveProject();
    void onExportHTML();
    void onExportPNG();
    void onExportUnity();
    void onExportUnreal();
    void onExportGodot();
    void onAddNode();
    void onDeleteNode();
    void onDuplicateNode();
    void onNodeSelected(const QString& nodeId);
    void onNodeMoved(const QString& nodeId, const QPointF& pos);
    void onSearchNodes(const QString& query);
    void onToggleGrid();
    void onToggleMiniMap();
    void onHelp();
    void updateUI();

private:
    void setupUI();
    void setupMenus();
    void setupShortcuts();
    void loadDemoScene();

    CanvasView* m_canvas;
    Inspector* m_inspector;
    TopBar* m_topBar;
    TreePanel* m_treePanel;
    MiniMap* m_miniMap;
    SceneStore* m_store;
    QTimer* m_autosaveTimer;
};
