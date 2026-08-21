/**
 * Game Templates — Starter kits pre-diseñados para diferentes géneros de juego.
 * Cada template incluye pantallas listas para editar con la IR del proyecto.
 */
import type { CanvasDoc, Node } from "./ir";
import { frameNode, textNode, shapeNode } from "./defaults";

export interface GameTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  genre: string;
  screens: Array<{ name: string; width: number; height: number; nodes: Node[] }>;
}

function mkRect(x: number, y: number, w: number, h: number, color: string, name: string): Node {
  const n = shapeNode("rect", name, { x, y, width: w, height: h });
  n.style.backgroundColor = color;
  return n;
}

function mkLabel(x: number, y: number, text: string, fontSize = 24, color = "#ffffff"): Node {
  return textNode(text, { x, y, width: text.length * fontSize * 0.6, height: fontSize * 1.4 }, text, { fontSize, color, fontWeight: 600 });
}

function mkButton(x: number, y: number, w: number, h: number, label: string, bgColor = "#7C5CFF"): Node {
  const btn = frameNode("Button", { x, y, width: w, height: h });
  btn.style.backgroundColor = bgColor;
  btn.style.borderRadius = 8;
  btn.children = [mkLabel(w / 2 - label.length * 6, h / 2 - 12, label, 18, "#ffffff")];
  return btn;
}

export const GAME_TEMPLATES: GameTemplate[] = [
  {
    id: "rpg-inventory",
    name: "RPG Inventory",
    icon: "⚔️",
    description: "Inventario de RPG con slots de items, stats y equipamiento",
    genre: "RPG",
    screens: [
      {
        name: "Inventory Screen",
        width: 1920,
        height: 1080,
        nodes: [
          (() => {
            const bg = mkRect(0, 0, 1920, 1080, "#1a1520", "BG");
            const panel = frameNode("Inventory Panel", { x: 460, y: 140, width: 1000, height: 800 });
            panel.style.backgroundColor = "#252030";
            panel.style.borderRadius = 12;
            panel.style.stroke = { color: "#4a3f5c", width: 2 };
            panel.children = [
              mkLabel(30, 20, "INVENTORY", 32, "#c9a84c"),
              (() => {
                const grid = frameNode("Item Grid", { x: 30, y: 80, width: 560, height: 680 });
                grid.style.backgroundColor = "#1a1520";
                grid.style.borderRadius = 8;
                grid.children = Array.from({ length: 20 }, (_, i) => {
                  const col = i % 5;
                  const row = Math.floor(i / 5);
                  const slot = frameNode(`Slot ${i + 1}`, { x: 12 + col * 110, y: 12 + row * 134, width: 98, height: 122 });
                  slot.style.backgroundColor = "#302840";
                  slot.style.borderRadius = 6;
                  slot.style.stroke = { color: "#4a3f5c", width: 1 };
                  return slot;
                });
                return grid;
              })(),
              (() => {
                const stats = frameNode("Stats Panel", { x: 620, y: 80, width: 350, height: 300 });
                stats.style.backgroundColor = "#1a1520";
                stats.style.borderRadius = 8;
                stats.children = [
                  mkLabel(16, 16, "CHARACTER STATS", 16, "#8a7faa"),
                  mkLabel(16, 60, "HP: 245/300", 18, "#4ade80"),
                  mkLabel(16, 90, "MP: 120/150", 18, "#60a5fa"),
                  mkLabel(16, 120, "ATK: 45", 18, "#f87171"),
                  mkLabel(16, 150, "DEF: 32", 18, "#facc15"),
                  mkLabel(16, 180, "SPD: 28", 18, "#c084fc"),
                ];
                return stats;
              })(),
              mkButton(620, 700, 160, 48, "CLOSE", "#4a3f5c"),
            ];
            bg.children.push(panel);
            return bg;
          })(),
        ],
      },
    ],
  },
  {
    id: "fps-hud",
    name: "FPS HUD",
    icon: "🔫",
    description: "HUD de shooter con crosshair, health bar, ammo y minimapa",
    genre: "FPS",
    screens: [
      {
        name: "Battle HUD",
        width: 1920,
        height: 1080,
        nodes: [
          (() => {
            const bg = mkRect(0, 0, 1920, 1080, "#0a0a0a", "BG");
            // Crosshair
            const crosshair = frameNode("Crosshair", { x: 955, y: 535, width: 10, height: 10 });
            crosshair.style.borderRadius = 5;
            crosshair.style.backgroundColor = "#ffffff";
            crosshair.style.opacity = 0.8;
            bg.children.push(crosshair);
            // Health bar (bottom-left)
            const healthBg = mkRect(40, 980, 300, 24, "#333", "Health BG");
            healthBg.style.borderRadius = 4;
            const healthFill = mkRect(40, 980, 225, 24, "#4ade80", "Health Fill");
            healthFill.style.borderRadius = 4;
            bg.children.push(healthBg, healthFill, mkLabel(40, 950, "HP 75%", 14, "#4ade80"));
            // Ammo (bottom-right)
            bg.children.push(mkLabel(1780, 950, "30 / 120", 28, "#ffffff"));
            bg.children.push(mkLabel(1780, 985, "AMMO", 12, "#888"));
            // Minimap (top-right)
            const minimap = mkRect(1620, 40, 260, 260, "#1a2a1a", "Minimap");
            minimap.style.borderRadius = 8;
            minimap.style.stroke = { color: "#3a5a3a", width: 2 };
            bg.children.push(minimap);
            // Score
            bg.children.push(mkLabel(860, 40, "SCORE: 12,450", 20, "#facc15"));
            // Kill feed
            bg.children.push(mkLabel(40, 40, "Player1 eliminated Player3", 14, "#999"));
            bg.children.push(mkLabel(40, 65, "Player2 eliminated Player1", 14, "#999"));
            return bg;
          })(),
        ],
      },
    ],
  },
  {
    id: "racing-hud",
    name: "Racing HUD",
    icon: "🏎️",
    description: "HUD de carreras con speedometer, position, lap counter y minimapa",
    genre: "Racing",
    screens: [
      {
        name: "Race HUD",
        width: 1920,
        height: 1080,
        nodes: [
          (() => {
            const bg = mkRect(0, 0, 1920, 1080, "#0a0a12", "BG");
            // Speed (center-bottom)
            bg.children.push(mkLabel(880, 920, "186", 72, "#ffffff"));
            bg.children.push(mkLabel(980, 950, "KM/H", 18, "#888"));
            // Position (top-left)
            const posBg = mkRect(40, 40, 120, 60, "#7C5CFF", "Position");
            posBg.style.borderRadius = 8;
            bg.children.push(posBg, mkLabel(55, 48, "1ST", 28, "#ffffff"));
            // Lap (top-center)
            bg.children.push(mkLabel(880, 40, "LAP 2/5", 22, "#ffffff"));
            // Minimap (bottom-left)
            const minimap = mkRect(40, 700, 200, 200, "#151520", "Track Map");
            minimap.style.borderRadius = 8;
            minimap.style.stroke = { color: "#333", width: 2 };
            bg.children.push(minimap);
            // Timer (top-right)
            bg.children.push(mkLabel(1620, 40, "01:23.456", 20, "#facc15"));
            bg.children.push(mkLabel(1620, 70, "+0.321", 16, "#f87171"));
            return bg;
          })(),
        ],
      },
    ],
  },
  {
    id: "platformer-hud",
    name: "Platformer HUD",
    icon: "🍄",
    description: "HUD de platformer con lives, coins, score y power-ups",
    genre: "Platformer",
    screens: [
      {
        name: "Level HUD",
        width: 1920,
        height: 1080,
        nodes: [
          (() => {
            const bg = mkRect(0, 0, 1920, 1080, "#87CEEB", "Sky BG");
            // Lives (top-left)
            bg.children.push(mkLabel(40, 30, "❤️❤️❤️", 28, "#ffffff"));
            // Coins (top-center)
            const coinBg = mkRect(860, 20, 200, 40, "rgba(0,0,0,0.3)", "Coin BG");
            coinBg.style.borderRadius = 20;
            bg.children.push(coinBg, mkLabel(900, 26, "🪙 × 147", 20, "#facc15"));
            // Score (top-right)
            bg.children.push(mkLabel(1620, 30, "SCORE: 24,800", 20, "#ffffff"));
            // Power-up slots (bottom-center)
            for (let i = 0; i < 3; i++) {
              const slot = mkRect(870 + i * 60, 1000, 48, 48, "rgba(0,0,0,0.4)", `Power ${i + 1}`);
              slot.style.borderRadius = 8;
              slot.style.stroke = { color: "#ffffff44", width: 2 };
              bg.children.push(slot);
            }
            // Boss HP bar (top, hidden by default)
            const bossBar = frameNode("Boss HP", { x: 560, y: 80, width: 800, height: 16 });
            bossBar.style.backgroundColor = "#333";
            bossBar.style.borderRadius = 8;
            bossBar.hidden = true;
            bossBar.conditionalVisibility = [{ variable: "bossActive", operator: "truthy" }];
            const bossFill = mkRect(0, 0, 480, 16, "#f87171", "Boss HP Fill");
            bossFill.style.borderRadius = 8;
            bossBar.children = [bossFill];
            bg.children.push(bossBar, mkLabel(560, 62, "BOSS", 12, "#f87171"));
            return bg;
          })(),
        ],
      },
    ],
  },
  {
    id: "strategy-ui",
    name: "Strategy UI",
    icon: "🏰",
    description: "UI de estrategia con resource bar, minimapa, unit panel y build menu",
    genre: "Strategy",
    screens: [
      {
        name: "Game UI",
        width: 1920,
        height: 1080,
        nodes: [
          (() => {
            const bg = mkRect(0, 0, 1920, 1080, "#1a2a1a", "BG");
            // Resource bar (top)
            const resBar = mkRect(360, 0, 1200, 48, "rgba(0,0,0,0.7)", "Resource Bar");
            bg.children.push(resBar, mkLabel(400, 12, "🪵 1,240  ⛏️ 890  🍖 450  💰 2,100", 16, "#ffffff"));
            // Minimap (bottom-left)
            const minimap = mkRect(20, 620, 280, 440, "#0a1a0a", "Minimap");
            minimap.style.borderRadius = 4;
            minimap.style.stroke = { color: "#3a5a3a", width: 2 };
            bg.children.push(minimap);
            // Unit panel (bottom-center)
            const unitPanel = mkRect(320, 620, 600, 440, "rgba(0,0,0,0.7)", "Unit Panel");
            unitPanel.style.borderRadius = 4;
            unitPanel.style.stroke = { color: "#444", width: 1 };
            bg.children.push(unitPanel, mkLabel(340, 630, "SELECTED UNITS", 14, "#888"));
            // Build menu (bottom-right)
            const buildMenu = mkRect(940, 620, 960, 440, "rgba(0,0,0,0.7)", "Build Menu");
            buildMenu.style.borderRadius = 4;
            buildMenu.style.stroke = { color: "#444", width: 1 };
            bg.children.push(buildMenu, mkLabel(960, 630, "BUILD", 14, "#888"));
            // Build items
            for (let i = 0; i < 8; i++) {
              const col = i % 4;
              const row = Math.floor(i / 4);
              const item = mkRect(960 + col * 230, 670 + row * 200, 210, 180, "#252530", `Build ${i + 1}`);
              item.style.borderRadius = 6;
              item.style.stroke = { color: "#555", width: 1 };
              bg.children.push(item);
            }
            // Mini info (top-left)
            bg.children.push(mkLabel(20, 60, "TURN 14", 16, "#c9a84c"));
            bg.children.push(mkLabel(20, 90, "Population: 45/60", 14, "#888"));
            return bg;
          })(),
        ],
      },
    ],
  },
];

/**
 * Crea un CanvasDoc a partir de un template.
 */
export function templateToDoc(template: GameTemplate): CanvasDoc {
  const screens: Node[] = [];
  let root: Node | null = null;

  for (const screen of template.screens) {
    const screenNode = frameNode(screen.name, { x: 0, y: 0, width: screen.width, height: screen.height });
    screenNode.children = screen.nodes;
    if (!root) {
      root = screenNode;
    } else {
      screens.push(screenNode);
    }
  }

  return {
    version: "0.1.0",
    tokens: {
      colors: { primary: "#7C5CFF", secondary: "#c9a84c", danger: "#f87171", success: "#4ade80", warning: "#facc15" },
      radii: { sm: 4, md: 8, lg: 12 },
      spacing: { sm: 4, md: 8, lg: 16, xl: 24 },
      typography: {},
      shadows: {},
      easings: {},
    },
    library: { components: {}, variants: {} },
    timelines: [],
    assets: [],
    root: root ?? frameNode("Screen", { x: 0, y: 0, width: 1920, height: 1080 }),
    screens,
    connections: [],
    annotations: [],
    themes: [],
    gameVariables: [
      { name: "playerHP", type: "number", defaultValue: 75, currentValue: 75 },
      { name: "hasItem", type: "boolean", defaultValue: true, currentValue: true },
      { name: "bossActive", type: "boolean", defaultValue: false, currentValue: false },
    ],
  };
}
