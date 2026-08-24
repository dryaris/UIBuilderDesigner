#pragma once
#include <QWidget>
#include <QVBoxLayout>
#include <QFormLayout>
#include <QLineEdit>
#include <QSpinBox>
#include <QDoubleSpinBox>
#include <QComboBox>
#include <QFontComboBox>
#include <QCheckBox>
#include <QColorDialog>
#include <QPushButton>
#include <QLabel>
#include <QGroupBox>
#include <QScrollArea>
#include <QListWidget>

struct Node;

class Inspector : public QWidget {
    Q_OBJECT
public:
    explicit Inspector(QWidget* parent = nullptr);

    void setNode(const Node* node);
    void clear();

signals:
    void propertyChanged(const QString& nodeId, const QString& prop, const QVariant& value);

private:
    void buildUI();
    void populateFromNode();

    QScrollArea* m_scroll;
    QWidget* m_content;
    QVBoxLayout* m_layout;

    // Labels
    QLabel* m_titleLabel;

    // Basic properties
    QLineEdit* m_idEdit;
    QLineEdit* m_labelEdit;
    QComboBox* m_typeCombo;
    QSpinBox* m_xSpin;
    QSpinBox* m_ySpin;
    QSpinBox* m_widthSpin;
    QSpinBox* m_heightSpin;
    QCheckBox* m_lockedCheck;
    QCheckBox* m_hiddenCheck;

    // Style
    QPushButton* m_bgColorBtn;
    QPushButton* m_accentColorBtn;
    QComboBox* m_borderStyleCombo;
    QSpinBox* m_borderWidthSpin;
    QSpinBox* m_borderRadiusSpin;
    QComboBox* m_fillCombo;
    QSpinBox* m_opacitySpin;
    QComboBox* m_shadowCombo;

    // Text
    QFontComboBox* m_fontCombo;
    QSpinBox* m_fontSizeSpin;
    QCheckBox* m_boldCheck;
    QCheckBox* m_italicCheck;
    QComboBox* m_textAlignCombo;
    QPushButton* m_textColorBtn;

    // Conditional
    QListWidget* m_conditionsList;

    const Node* m_currentNode = nullptr;
};
