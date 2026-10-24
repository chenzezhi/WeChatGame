// 玩家子弹：飞行 / 存活 / 体积 + 伤害（含道具与商店加成）

const screen = require('../screen.js');

// ---------------- 玩家子弹 ----------------
const BULLET_SPEED = 1.15;   // 子弹飞行速度
const BULLET_LIFE_MS = 1500; // 子弹最长存活时间（到点自动消失）
const BULLET_R = Math.max(3, Math.round(screen.PLAYER_W * 0.13)); // 子弹半径

// ---------------- 子弹伤害 ----------------
const PLAYER_DAMAGE_START = 1;  // 初始伤害
const PLAYER_DAMAGE_MAX = 20;   // 伤害上限
const DAMAGE_ITEM_GAIN = 0.1;   // 每个「伤害」道具 +0.1
const DAMAGE_SHOP_GAIN = 0.1;   // 商店每级「子弹伤害」+0.1

module.exports = {
  BULLET_SPEED: BULLET_SPEED,
  BULLET_LIFE_MS: BULLET_LIFE_MS,
  BULLET_R: BULLET_R,
  PLAYER_DAMAGE_START: PLAYER_DAMAGE_START,
  PLAYER_DAMAGE_MAX: PLAYER_DAMAGE_MAX,
  DAMAGE_ITEM_GAIN: DAMAGE_ITEM_GAIN,
  DAMAGE_SHOP_GAIN: DAMAGE_SHOP_GAIN,
};
