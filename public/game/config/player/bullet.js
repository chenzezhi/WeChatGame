// 玩家子弹本体：飞行速度 / 存活时间 / 半径 + 伤害初始值与上限
// 注意：吃道具 / 商店加点「增加多少」不在这里，见 config/shop/。

const screen = require('../screen.js');

const BULLET_SPEED = 1.15;   // 子弹飞行速度
const BULLET_LIFE_MS = 1500; // 子弹最长存活时间（到点自动消失）
const BULLET_R = Math.max(3, Math.round(screen.PLAYER_W * 0.13)); // 子弹半径

const PLAYER_DAMAGE_START = 1;  // 初始伤害
const PLAYER_DAMAGE_MAX = 20;   // 伤害上限

module.exports = {
  BULLET_SPEED: BULLET_SPEED,
  BULLET_LIFE_MS: BULLET_LIFE_MS,
  BULLET_R: BULLET_R,
  PLAYER_DAMAGE_START: PLAYER_DAMAGE_START,
  PLAYER_DAMAGE_MAX: PLAYER_DAMAGE_MAX,
};
