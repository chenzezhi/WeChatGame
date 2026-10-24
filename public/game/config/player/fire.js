// 射击本体参数：射速 / 一次几发 / 弹道夹角的基础值与下限
// 「每级加多少」放在 config/shop/upgrade.js。

// ---------------- 射击间隔（射速） ----------------
const PLAYER_FIRE_MS_START = 1000; // 初始射击间隔：1000 = 每秒 1 发
const PLAYER_FIRE_MS_MIN = 90;     // 间隔下限：再快也不会低于这个值
const BULLET_FIRE_MS = PLAYER_FIRE_MS_START; // 兼容旧名

// ---------------- 一次打几发（散射） ----------------
const PLAYER_MULTI_START = 1;  // 初始一次 1 发
const PLAYER_MULTI_MAX = 10;   // 子弹数量上限

// ---------------- 弹道夹角（相邻两发的度数） ----------------
// 定义：n 发子弹时，相邻两发相差 MULTI_SPREAD_DEG 度，围绕瞄准方向对称展开。
//       总张角 = (发数 - 1) × 夹角。
//       例：夹角 15°、5 发 → 最外两发相差 60°。
// 每级减多少度见 config/shop/upgrade.js（SPREAD_SHOP_STEP_DEG / SHOP_ITEM_SPREAD_STEP_DEG）。
const MULTI_SPREAD_DEG = 8; // 初始相邻夹角（度）
const SPREAD_MIN_DEG = 0;   // 夹角下限：0 = 允许完全重合（所有子弹打成一条线）

module.exports = {
  PLAYER_FIRE_MS_START: PLAYER_FIRE_MS_START,
  PLAYER_FIRE_MS_MIN: PLAYER_FIRE_MS_MIN,
  BULLET_FIRE_MS: BULLET_FIRE_MS,
  PLAYER_MULTI_START: PLAYER_MULTI_START,
  PLAYER_MULTI_MAX: PLAYER_MULTI_MAX,
  MULTI_SPREAD_DEG: MULTI_SPREAD_DEG,
  SPREAD_MIN_DEG: SPREAD_MIN_DEG,
};
