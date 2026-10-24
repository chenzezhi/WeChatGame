// 主动道具（护盾 / 变大）：持续时间、成长、体积倍率、HUD 按钮布局。
// 价格在 config/shop/price.js，升级时长等级上限在 config/shop/limit.js。

const screen = require('./screen.js');

// ---------------- 护盾：免疫伤害 ----------------
const SHIELD_DURATION_MS = 5000;  // 初始持续 5 秒
const SHIELD_STEP_MS = 1000;      // 每级时长 +1 秒

// ---------------- 变大：属性翻倍 + 体积变大 ----------------
const GROW_DURATION_MS = 10000;   // 初始持续 10 秒
const GROW_STEP_MS = 2000;        // 每级时长 +2 秒
const GROW_SCALE = 1.5;           // 体积倍率（宽/高同时乘）

// ---------------- 通用 ----------------
const ACTIVE_DURATION_MAX_MS = 40000; // 时长上限 40 秒

// ---------------- HUD 按钮（右上角，菜单按钮下方） ----------------
const ACTIVE_BTN_SIZE = 46;
const ACTIVE_BTN_GAP = 8;
const ACTIVE_BTN_Y = 110;
const ACTIVE_BTN_X_RIGHT = screen.WIDTH - 12 - ACTIVE_BTN_SIZE;
const ACTIVE_BTN_X_LEFT = ACTIVE_BTN_X_RIGHT - ACTIVE_BTN_SIZE - ACTIVE_BTN_GAP;

module.exports = {
  SHIELD_DURATION_MS: SHIELD_DURATION_MS,
  SHIELD_STEP_MS: SHIELD_STEP_MS,
  GROW_DURATION_MS: GROW_DURATION_MS,
  GROW_STEP_MS: GROW_STEP_MS,
  GROW_SCALE: GROW_SCALE,
  ACTIVE_DURATION_MAX_MS: ACTIVE_DURATION_MAX_MS,
  ACTIVE_BTN_SIZE: ACTIVE_BTN_SIZE,
  ACTIVE_BTN_GAP: ACTIVE_BTN_GAP,
  ACTIVE_BTN_Y: ACTIVE_BTN_Y,
  ACTIVE_BTN_X_RIGHT: ACTIVE_BTN_X_RIGHT,
  ACTIVE_BTN_X_LEFT: ACTIVE_BTN_X_LEFT,
};
