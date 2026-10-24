// Boss 技能：蓄力冲刺
// 蓄力 → 冲刺（一定会冲过玩家）→ 冷却，之后每 BOSS_DASH_ROLL_MS 掷一次骰子。
// 伤害按「玩家最大生命 × 比例」计算，随关卡提升。

const BOSS_DASH_ROLL_MS = 3000;      // 每 3 秒掷一次骰子
const BOSS_DASH_CHANCE_BASE = 0.15;  // 第 1 个 Boss 的发动概率
const BOSS_DASH_CHANCE_STEP = 0.08;  // 每个 Boss 概率 +8%
const BOSS_DASH_CHANCE_MAX = 0.70;   // 概率上限 70%

const BOSS_DASH_WINDUP_MS = 900;     // 蓄力时间（屏幕上出现警告）
const BOSS_DASH_MS = 520;            // 冲刺持续时间
const BOSS_DASH_OVERSHOOT_W = 0.45;  // 至少冲过玩家多少「屏幕宽」（保证一定冲过去）

const BOSS_DASH_HP_RATIO_BASE = 0.10; // 冲刺伤害 = 玩家最大生命 × 10%
const BOSS_DASH_HP_RATIO_STEP = 0.02; // 每个 Boss +2%
const BOSS_DASH_HP_RATIO_MAX = 0.60;  // 上限 60%

module.exports = {
  BOSS_DASH_ROLL_MS: BOSS_DASH_ROLL_MS,
  BOSS_DASH_CHANCE_BASE: BOSS_DASH_CHANCE_BASE,
  BOSS_DASH_CHANCE_STEP: BOSS_DASH_CHANCE_STEP,
  BOSS_DASH_CHANCE_MAX: BOSS_DASH_CHANCE_MAX,
  BOSS_DASH_WINDUP_MS: BOSS_DASH_WINDUP_MS,
  BOSS_DASH_MS: BOSS_DASH_MS,
  BOSS_DASH_OVERSHOOT_W: BOSS_DASH_OVERSHOOT_W,
  BOSS_DASH_HP_RATIO_BASE: BOSS_DASH_HP_RATIO_BASE,
  BOSS_DASH_HP_RATIO_STEP: BOSS_DASH_HP_RATIO_STEP,
  BOSS_DASH_HP_RATIO_MAX: BOSS_DASH_HP_RATIO_MAX,
};
