// 弹夹与装填的本体参数（初始值 / 下限）
// 「商店每级 / 道具各加多少」放在 config/shop/ 与 config/pickup/effect.js。

// 每次开火（无论一次几发）消耗 1 发；弹夹空了打不出子弹
const PLAYER_AMMO_START = 15;   // 初始弹夹容量
const PLAYER_AMMO_MAX = 200;    // 弹夹容量上限

// 装填只跟「前进距离」有关：走够多少米补 1 发（站着不动不回弹）
const RELOAD_M_START = 50;      // 初始每 50 米 +1 发
const RELOAD_M_MIN = 1;         // 满级每 1 米 +1 发（最快）

module.exports = {
  PLAYER_AMMO_START: PLAYER_AMMO_START,
  PLAYER_AMMO_MAX: PLAYER_AMMO_MAX,
  RELOAD_M_START: RELOAD_M_START,
  RELOAD_M_MIN: RELOAD_M_MIN,
};
