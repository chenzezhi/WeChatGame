// 路上掉落的道具：吃下去各加多少 / 给多少
// （商店里花钱买的道具数值在 config/shop/upgrade.js，价格在 config/shop/price.js）

// ---------------- 攻速 ----------------
const SPEED_ITEM_RATIO = 0.80;  // 射击间隔 ×0.8（越小越快）

// ---------------- 伤害 ----------------
const DAMAGE_ITEM_GAIN = 0.1;   // 每个「伤害」道具 +0.1

// ---------------- 快速装填 ----------------
const RELOAD_ITEM_RATIO = 0.80; // 装填距离 ×0.8

// ---------------- 弹道夹角 ----------------
const SPREAD_ITEM_RATIO = 0.995; // 每个「夹角」道具 ×0.995（-0.5%）

// ---------------- 弹药 ----------------
const AMMO_ITEM_BASE = 10;         // 基础补 10 发
const AMMO_ITEM_STEP_M = 400;      // 每前进 400 米，补给量增加一次
const AMMO_ITEM_GAIN_PER_STEP = 2; // 每次增加 2 发
const AMMO_ITEM_MAX = 50;          // 单个弹药道具最多补 50 发

// ---------------- 血瓶 ----------------
const HEAL_BASE = 4;            // 基础回 4 点血
const HEAL_STEP_M = 350;        // 每 350 米提升一次
const HEAL_GAIN_PER_STEP = 1;   // 每次 +1 点
const HEAL_MAX = 20;            // 单个血瓶最多回 20 点

// ---------------- 金币 ----------------
// 里程奖励：每前进 N 米，固定奖励 1 枚金币（与路上的金币道具分开算）
const COIN_REWARD_M = 100;      // 每前进 100 米奖励 1 金币
const COIN_REWARD_AMOUNT = 1;   // 每次奖励几枚

// 金币道具价值：每击败 1 个 Boss，单个金币道具的价值 +1
const COIN_VALUE_BASE = 1;
const COIN_VALUE_GROWTH = 1;
const COIN_VALUE_MAX = 10;

module.exports = {
  SPEED_ITEM_RATIO: SPEED_ITEM_RATIO,
  DAMAGE_ITEM_GAIN: DAMAGE_ITEM_GAIN,
  RELOAD_ITEM_RATIO: RELOAD_ITEM_RATIO,
  SPREAD_ITEM_RATIO: SPREAD_ITEM_RATIO,
  AMMO_ITEM_BASE: AMMO_ITEM_BASE,
  AMMO_ITEM_STEP_M: AMMO_ITEM_STEP_M,
  AMMO_ITEM_GAIN_PER_STEP: AMMO_ITEM_GAIN_PER_STEP,
  AMMO_ITEM_MAX: AMMO_ITEM_MAX,
  HEAL_BASE: HEAL_BASE,
  HEAL_STEP_M: HEAL_STEP_M,
  HEAL_GAIN_PER_STEP: HEAL_GAIN_PER_STEP,
  HEAL_MAX: HEAL_MAX,
  COIN_REWARD_M: COIN_REWARD_M,
  COIN_REWARD_AMOUNT: COIN_REWARD_AMOUNT,
  COIN_VALUE_BASE: COIN_VALUE_BASE,
  COIN_VALUE_GROWTH: COIN_VALUE_GROWTH,
  COIN_VALUE_MAX: COIN_VALUE_MAX,
};
