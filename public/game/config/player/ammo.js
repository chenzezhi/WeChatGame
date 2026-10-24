// 弹夹与装填 / 弹药道具

// ---------------- 弹夹与装填 ----------------
// 每次开火（无论一次几发）消耗 1 发；弹夹空了打不出子弹
const PLAYER_AMMO_START = 15;   // 初始弹夹容量
const PLAYER_AMMO_MAX = 200;    // 弹夹容量上限
const SHOP_AMMO_GAIN = 2;       // 商店每级「弹夹容量」+2

// 装填只跟「前进距离」有关：走够多少米补 1 发（站着不动不回弹）
const RELOAD_M_START = 50;      // 初始每 50 米 +1 发
const RELOAD_M_MIN = 1;         // 满级每 1 米 +1 发（最快）
const RELOAD_SHOP_STEP_M = 1;   // 商店每级「装填速度」-1 米
const RELOAD_ITEM_RATIO = 0.80; // 「快速装填」道具：装填距离 ×0.8

// 「弹药」道具：立即补若干发（随距离变多）
const AMMO_ITEM_BASE = 10;         // 基础补 10 发
const AMMO_ITEM_STEP_M = 400;      // 每前进 400 米，补给量增加一次
const AMMO_ITEM_GAIN_PER_STEP = 1; // 每次增加 2 发
const AMMO_ITEM_MAX = 50;          // 单个弹药道具最多补 50 发

module.exports = {
  PLAYER_AMMO_START: PLAYER_AMMO_START,
  PLAYER_AMMO_MAX: PLAYER_AMMO_MAX,
  SHOP_AMMO_GAIN: SHOP_AMMO_GAIN,
  RELOAD_M_START: RELOAD_M_START,
  RELOAD_M_MIN: RELOAD_M_MIN,
  RELOAD_SHOP_STEP_M: RELOAD_SHOP_STEP_M,
  RELOAD_ITEM_RATIO: RELOAD_ITEM_RATIO,
  AMMO_ITEM_BASE: AMMO_ITEM_BASE,
  AMMO_ITEM_STEP_M: AMMO_ITEM_STEP_M,
  AMMO_ITEM_GAIN_PER_STEP: AMMO_ITEM_GAIN_PER_STEP,
  AMMO_ITEM_MAX: AMMO_ITEM_MAX,
};
