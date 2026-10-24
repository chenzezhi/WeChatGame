// 升级（吃经验升级）成长 / 经验需求

// ---------------- 升级成长 ----------------
const LEVEL_HP_GAIN = 1;         // 每级最大生命 +1（升级瞬间回满）
const LEVEL_FIRE_RATIO = 0.985;  // 每级射击间隔 ×0.985（约快 1.5%）
const LEVEL_MULTI_EVERY = 3;     // 每 3 级子弹数量 +1
const LEVEL_HP_MAX = 60;         // 最大生命上限

// ---------------- 经验 ----------------
const XP_BASE = 10;   // 1 级升 2 级需要 10 点
const XP_STEP = 5;    // 之后每级需求 +5（10 / 15 / 20 …）

module.exports = {
  LEVEL_HP_GAIN: LEVEL_HP_GAIN,
  LEVEL_FIRE_RATIO: LEVEL_FIRE_RATIO,
  LEVEL_MULTI_EVERY: LEVEL_MULTI_EVERY,
  LEVEL_HP_MAX: LEVEL_HP_MAX,
  XP_BASE: XP_BASE,
  XP_STEP: XP_STEP,
};
