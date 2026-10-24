// 道具：效果数值（血瓶 / 金币）

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
