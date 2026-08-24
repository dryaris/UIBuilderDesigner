#include "inspector.h"
#include "../core/ir.h"
#include <QFontComboBox>
#include <QSlider>
#include <QFrame>

Inspector::Inspector(QWidget* parent)
    : QWidget(parent) {
    setFixedWidth(280);
    buildUI();
}

static QString colorBtnStyle(const QColor& color) {
    return QString(
        "QPushButton { background: %1; color: white; border: 1px solid %2; "
        "border-radius: 4px; padding: 6px; text-align: left; font-size: 11px; }"
        "QPushButton:hover { border: 2px solid #6366f1; }"
    ).arg(color.name(), color.darker(130).name());
}

void Inspector::buildUI() {
    auto* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);

    m_scroll = new QScrollArea;
    m_scroll->setWidgetResizable(true);
    m_scroll->setStyleSheet("QScrollArea { border: none; background: #1a1d2e; }");
    m_scroll->setFrameShape(QFrame::NoFrame);

    m_content = new QWidget;
    m_layout = new QVBoxLayout(m_content);
    m_layout->setContentsMargins(12, 12, 12, 12);
    m_layout->setSpacing(6);

    auto inputStyle = "background: #14161f; color: #e6e6f0; border: 1px solid #2a2d3e; "
                       "border-radius: 4px; padding: 4px;";
    auto groupStyle = "QGroupBox { color: #a0a0b8; font-weight: bold; border-top: 1px solid #2a2d3e; "
                       "padding-top: 12px; margin-top: 8px; }";

    // ── Title ──
    m_titleLabel = new QLabel("Inspector");
    m_titleLabel->setStyleSheet("font-size: 14px; font-weight: bold; color: #e6e6f0; padding: 4px;");
    m_layout->addWidget(m_titleLabel);

    // ── Node Properties ──
    auto* nodeGroup = new QGroupBox("Node");
    nodeGroup->setStyleSheet(groupStyle);
    auto* nodeForm = new QFormLayout(nodeGroup);

    m_idEdit = new QLineEdit;
    m_idEdit->setReadOnly(true);
    m_idEdit->setStyleSheet(QString(inputStyle) + " color: #666;");
    nodeForm->addRow("ID:", m_idEdit);

    m_labelEdit = new QLineEdit;
    m_labelEdit->setStyleSheet(inputStyle);
    connect(m_labelEdit, &QLineEdit::editingFinished, this, [this]() {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "label", m_labelEdit->text());
    });
    nodeForm->addRow("Label:", m_labelEdit);

    m_typeCombo = new QComboBox;
    m_typeCombo->addItems({"container", "button", "label", "title", "image", "slider",
                           "progressBar", "healthBar", "miniMap", "tooltip", "panel",
                           "text", "icon", "checkbox", "input", "dropdown", "avatar",
                           "badge", "divider", "spacer", "scrollArea", "tabBar",
                           "dialog", "toast", "inventory", "statDisplay", "radarChart",
                           "damagePopup", "staminaBar", "abilitySlot", "cooldownIndicator",
                           "compass", "chatBox", "leaderboard", "radialMenu"});
    m_typeCombo->setStyleSheet(inputStyle);
    nodeForm->addRow("Type:", m_typeCombo);

    m_lockedCheck = new QCheckBox("🔒 Locked");
    m_lockedCheck->setStyleSheet("color: #e6e6f0;");
    nodeForm->addRow(m_lockedCheck);

    m_hiddenCheck = new QCheckBox("👁 Hidden");
    m_hiddenCheck->setStyleSheet("color: #e6e6f0;");
    nodeForm->addRow(m_hiddenCheck);

    m_layout->addWidget(nodeGroup);

    // ── Position & Size ──
    auto* posGroup = new QGroupBox("Transform");
    posGroup->setStyleSheet(groupStyle);
    auto* posForm = new QFormLayout(posGroup);

    auto spinStyle = inputStyle;
    m_xSpin = new QSpinBox; m_xSpin->setRange(-99999, 99999); m_xSpin->setStyleSheet(spinStyle);
    m_ySpin = new QSpinBox; m_ySpin->setRange(-99999, 99999); m_ySpin->setStyleSheet(spinStyle);
    m_widthSpin = new QSpinBox; m_widthSpin->setRange(10, 9999); m_widthSpin->setValue(200); m_widthSpin->setStyleSheet(spinStyle);
    m_heightSpin = new QSpinBox; m_heightSpin->setRange(10, 9999); m_heightSpin->setValue(60); m_heightSpin->setStyleSheet(spinStyle);

    posForm->addRow("X:", m_xSpin);
    posForm->addRow("Y:", m_ySpin);
    posForm->addRow("Width:", m_widthSpin);
    posForm->addRow("Height:", m_heightSpin);
    m_layout->addWidget(posGroup);

    // ── Style ──
    auto* styleGroup = new QGroupBox("Style");
    styleGroup->setStyleSheet(groupStyle);
    auto* styleForm = new QFormLayout(styleGroup);

    m_bgColorBtn = new QPushButton("  Background");
    m_bgColorBtn->setStyleSheet(colorBtnStyle(QColor("#1e2130")));
    m_bgColorBtn->setFixedHeight(30);
    styleForm->addRow("BG Color:", m_bgColorBtn);

    m_accentColorBtn = new QPushButton("  Accent");
    m_accentColorBtn->setStyleSheet(colorBtnStyle(QColor("#6366f1")));
    m_accentColorBtn->setFixedHeight(30);
    styleForm->addRow("Accent:", m_accentColorBtn);

    m_borderStyleCombo = new QComboBox;
    m_borderStyleCombo->addItems({"none", "solid", "dashed", "dotted"});
    m_borderStyleCombo->setStyleSheet(spinStyle);
    styleForm->addRow("Border:", m_borderStyleCombo);

    m_borderWidthSpin = new QSpinBox; m_borderWidthSpin->setRange(0, 20); m_borderWidthSpin->setStyleSheet(spinStyle);
    styleForm->addRow("Border W:", m_borderWidthSpin);

    m_borderRadiusSpin = new QSpinBox; m_borderRadiusSpin->setRange(0, 50); m_borderRadiusSpin->setValue(8); m_borderRadiusSpin->setStyleSheet(spinStyle);
    styleForm->addRow("Radius:", m_borderRadiusSpin);

    m_fillCombo = new QComboBox;
    m_fillCombo->addItems({"solid", "gradient", "image"});
    m_fillCombo->setStyleSheet(spinStyle);
    styleForm->addRow("Fill:", m_fillCombo);

    // Opacity as slider with percentage label
    auto* opacityWidget = new QWidget;
    auto* opacityLayout = new QHBoxLayout(opacityWidget);
    opacityLayout->setContentsMargins(0, 0, 0, 0);
    opacityLayout->setSpacing(6);
    m_opacitySpin = new QSpinBox;
    m_opacitySpin->setRange(0, 100);
    m_opacitySpin->setValue(100);
    m_opacitySpin->setSuffix("%");
    m_opacitySpin->setStyleSheet(spinStyle);
    m_opacitySpin->setFixedWidth(56);
    opacityLayout->addWidget(m_opacitySpin);
    styleForm->addRow("Opacity:", opacityWidget);

    m_shadowCombo = new QComboBox;
    m_shadowCombo->addItems({"none", "small", "medium", "large"});
    m_shadowCombo->setStyleSheet(spinStyle);
    styleForm->addRow("Shadow:", m_shadowCombo);

    m_layout->addWidget(styleGroup);

    // ── Text ──
    auto* textGroup = new QGroupBox("Typography");
    textGroup->setStyleSheet(groupStyle);
    auto* textForm = new QFormLayout(textGroup);

    m_fontCombo = new QFontComboBox;
    m_fontCombo->setStyleSheet(spinStyle);
    textForm->addRow("Font:", m_fontCombo);

    m_fontSizeSpin = new QSpinBox; m_fontSizeSpin->setRange(6, 120); m_fontSizeSpin->setValue(14); m_fontSizeSpin->setStyleSheet(spinStyle);
    textForm->addRow("Size:", m_fontSizeSpin);

    m_boldCheck = new QCheckBox("B Bold");
    m_boldCheck->setStyleSheet("color: #e6e6f0; font-weight: bold;");
    m_italicCheck = new QCheckBox("I Italic");
    m_italicCheck->setStyleSheet("color: #e6e6f0; font-style: italic;");
    textForm->addRow(m_boldCheck);
    textForm->addRow(m_italicCheck);

    m_textAlignCombo = new QComboBox;
    m_textAlignCombo->addItems({"left", "center", "right"});
    m_textAlignCombo->setStyleSheet(spinStyle);
    textForm->addRow("Align:", m_textAlignCombo);

    m_textColorBtn = new QPushButton("  Text Color");
    m_textColorBtn->setStyleSheet(colorBtnStyle(QColor("#e6e6f0")));
    m_textColorBtn->setFixedHeight(30);
    connect(m_textColorBtn, &QPushButton::clicked, this, [this]() {
        QColor color = QColorDialog::getColor(Qt::white, this, "Text Color");
        if (color.isValid() && m_currentNode) {
            m_textColorBtn->setStyleSheet(colorBtnStyle(color));
            m_textColorBtn->setText(QString("  %1").arg(color.name()));
            emit propertyChanged(QString::fromStdString(m_currentNode->id), "textColor", color.name());
        }
    });
    textForm->addRow("Color:", m_textColorBtn);

    m_layout->addWidget(textGroup);

    // ── Conditions ──
    auto* condGroup = new QGroupBox("Conditional Visibility");
    condGroup->setStyleSheet(groupStyle);
    auto* condLayout = new QVBoxLayout(condGroup);

    m_conditionsList = new QListWidget;
    m_conditionsList->setStyleSheet(
        "background: #14161f; color: #e6e6f0; border: 1px solid #2a2d3e; "
        "border-radius: 4px; padding: 4px;");
    m_conditionsList->setFixedHeight(80);
    condLayout->addWidget(m_conditionsList);

    m_layout->addWidget(condGroup);
    m_layout->addStretch();

    // ── Connect all controls to emit propertyChanged ──
    auto connectSpin = [this](QSpinBox* spin, const QString& prop) {
        connect(spin, &QSpinBox::valueChanged, this, [this, prop](int val) {
            if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), prop, val);
        });
    };
    connectSpin(m_xSpin, "x");
    connectSpin(m_ySpin, "y");
    connectSpin(m_widthSpin, "width");
    connectSpin(m_heightSpin, "height");
    connectSpin(m_borderWidthSpin, "borderWidth");
    connectSpin(m_borderRadiusSpin, "borderRadius");
    connectSpin(m_opacitySpin, "opacity");
    connectSpin(m_fontSizeSpin, "fontSize");

    connect(m_typeCombo, &QComboBox::currentTextChanged, this, [this](const QString& val) {
        if (m_currentNode && m_typeCombo->isEnabled())
            emit propertyChanged(QString::fromStdString(m_currentNode->id), "type", val);
    });
    connect(m_lockedCheck, &QCheckBox::toggled, this, [this](bool val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "locked", val);
    });
    connect(m_hiddenCheck, &QCheckBox::toggled, this, [this](bool val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "hidden", val);
    });
    connect(m_borderStyleCombo, &QComboBox::currentTextChanged, this, [this](const QString& val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "borderStyle", val);
    });
    connect(m_textAlignCombo, &QComboBox::currentTextChanged, this, [this](const QString& val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "textAlign", val);
    });
    connect(m_boldCheck, &QCheckBox::toggled, this, [this](bool val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "fontWeight", val ? "bold" : "normal");
    });
    connect(m_italicCheck, &QCheckBox::toggled, this, [this](bool val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "fontStyle", val ? "italic" : "normal");
    });
    connect(m_shadowCombo, &QComboBox::currentTextChanged, this, [this](const QString& val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "shadow", val);
    });
    connect(m_fillCombo, &QComboBox::currentTextChanged, this, [this](const QString& val) {
        if (m_currentNode) emit propertyChanged(QString::fromStdString(m_currentNode->id), "fill", val);
    });
    connect(m_bgColorBtn, &QPushButton::clicked, this, [this]() {
        QColor color = QColorDialog::getColor(Qt::white, this, "Background Color");
        if (color.isValid() && m_currentNode) {
            m_bgColorBtn->setStyleSheet(colorBtnStyle(color));
            m_bgColorBtn->setText(QString("  %1").arg(color.name()));
            emit propertyChanged(QString::fromStdString(m_currentNode->id), "backgroundColor", color.name());
        }
    });
    connect(m_accentColorBtn, &QPushButton::clicked, this, [this]() {
        QColor color = QColorDialog::getColor(Qt::white, this, "Accent Color");
        if (color.isValid() && m_currentNode) {
            m_accentColorBtn->setStyleSheet(colorBtnStyle(color));
            m_accentColorBtn->setText(QString("  %1").arg(color.name()));
            emit propertyChanged(QString::fromStdString(m_currentNode->id), "color", color.name());
        }
    });

    m_scroll->setWidget(m_content);
    mainLayout->addWidget(m_scroll);

    // Empty state
    clear();
}

void Inspector::setNode(const Node* node) {
    m_currentNode = node;
    if (!node) { clear(); return; }
    populateFromNode();
}

void Inspector::clear() {
    m_currentNode = nullptr;
    m_titleLabel->setText("No selection");
    m_idEdit->clear();
    m_labelEdit->clear();
    m_labelEdit->setEnabled(false);
    m_typeCombo->setEnabled(false);
    m_xSpin->setEnabled(false);
    m_ySpin->setEnabled(false);
    m_widthSpin->setEnabled(false);
    m_heightSpin->setEnabled(false);
}

void Inspector::populateFromNode() {
    if (!m_currentNode) return;
    const auto& n = *m_currentNode;

    // Block signals to prevent recursive updates during population
    const QSignalBlocker labelBlocker(m_labelEdit);
    const QSignalBlocker typeBlocker(m_typeCombo);
    const QSignalBlocker xBlocker(m_xSpin);
    const QSignalBlocker yBlocker(m_ySpin);
    const QSignalBlocker wBlocker(m_widthSpin);
    const QSignalBlocker hBlocker(m_heightSpin);
    const QSignalBlocker bwBlocker(m_borderWidthSpin);
    const QSignalBlocker brBlocker(m_borderRadiusSpin);
    const QSignalBlocker opBlocker(m_opacitySpin);
    const QSignalBlocker fsBlocker(m_fontSizeSpin);
    const QSignalBlocker lockedBlocker(m_lockedCheck);
    const QSignalBlocker hiddenBlocker(m_hiddenCheck);
    const QSignalBlocker boldBlocker(m_boldCheck);
    const QSignalBlocker italicBlocker(m_italicCheck);

    m_titleLabel->setText(QString("Inspector: %1").arg(QString::fromStdString(n.label)));
    m_idEdit->setText(QString::fromStdString(n.id));
    m_labelEdit->setEnabled(true);
    m_labelEdit->setText(QString::fromStdString(n.label));
    m_typeCombo->setEnabled(true);
    m_typeCombo->setCurrentText(QString::fromStdString(n.type));
    m_xSpin->setEnabled(true);
    m_xSpin->setValue((int)n.x);
    m_ySpin->setEnabled(true);
    m_ySpin->setValue((int)n.y);
    m_widthSpin->setEnabled(true);
    m_widthSpin->setValue((int)n.width);
    m_heightSpin->setEnabled(true);
    m_heightSpin->setValue((int)n.height);
    m_lockedCheck->setChecked(n.locked);
    m_hiddenCheck->setChecked(n.hidden);

    // Style
    m_borderWidthSpin->setValue(n.style.borderWidth);
    m_borderRadiusSpin->setValue(n.style.borderRadius);
    m_opacitySpin->setValue((int)(n.style.opacity * 100));
    m_borderStyleCombo->setCurrentText(QString::fromStdString(n.style.borderStyle.empty() ? "none" : n.style.borderStyle));
    m_fillCombo->setCurrentText(QString::fromStdString(n.style.fill.empty() ? "solid" : n.style.fill));
    m_shadowCombo->setCurrentText(QString::fromStdString(n.style.shadow.empty() ? "none" : n.style.shadow));

    // Color swatches
    QColor bg(n.style.backgroundColor.empty() ? "#1e2130" : QString::fromStdString(n.style.backgroundColor));
    m_bgColorBtn->setStyleSheet(colorBtnStyle(bg));
    m_bgColorBtn->setText(QString("  %1").arg(bg.name()));

    QColor accent(n.style.color.empty() ? "#6366f1" : QString::fromStdString(n.style.color));
    m_accentColorBtn->setStyleSheet(colorBtnStyle(accent));
    m_accentColorBtn->setText(QString("  %1").arg(accent.name()));

    // Typography
    m_fontCombo->setCurrentFont(QFont(QString::fromStdString(n.style.fontFamily)));
    m_fontSizeSpin->setValue(n.style.fontSize > 0 ? n.style.fontSize : 14);
    m_boldCheck->setChecked(n.style.fontWeight == "bold" || n.style.fontWeight == "700");
    m_italicCheck->setChecked(n.style.fontStyle == "italic");
    m_textAlignCombo->setCurrentText(QString::fromStdString(n.style.textAlign.empty() ? "left" : n.style.textAlign));

    QColor txtColor(n.style.textColor.empty() ? "#e6e6f0" : QString::fromStdString(n.style.textColor));
    m_textColorBtn->setStyleSheet(colorBtnStyle(txtColor));
    m_textColorBtn->setText(QString("  %1").arg(txtColor.name()));
}
