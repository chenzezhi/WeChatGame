// Boss：出场 / 血量 / 开火 / 散射 / 召唤 / 掉落

const BOSS_EVERY_M = 1000;        // 每 1000 米出现一个 Boss
const BOSS_SCALE = 2.4;           // Boss 体形 = 小怪 × 2.4
const BOSS_HP_MULT_START = 10;    // 第 1 个 Boss 血量 = 当波小怪血量 × 10
const BOSS_HP_MULT_GROWTH = 0.45; // 每个 Boss 倍率再 +0.45（10 → 15 → 19 …）

// 开火倍率：数越大开火越快（1.0 = 与小怪同速，<1 = 比小怪慢）
const BOSS_FIRE_MULT_START = 0.9;    // 第 1 个 Boss：比小怪慢 10%
const BOSS_FIRE_MULT_GROWTH = 0.525; // 每个 Boss 再 +0.525
const BOSS_FIRE_MS_MIN = 130;        // Boss 开火间隔下限

const BOSS_BULLET_BASE = 2;        // 第 1 个 Boss 一次散射 2 发
const BOSS_BULLET_STEP = 3;        // 每个 Boss 再 +3 发
const BOSS_BULLET_MAX = 9;         // 散射发数上限
const BOSS_BULLET_SPREAD_DEG = 13; // 散射相邻夹角（度）

// 召唤小怪（玩家走近才开始计时）
const BOSS_MINION_MIN_MS = 3200;  // 召唤间隔下限
const BOSS_MINION_MAX_MS = 7000;  // 召唤间隔上限
const BOSS_MINION_SHRINK_MS = 200; // 每个 Boss 让召唤间隔缩短 200 毫秒

// 击杀掉落
const BOSS_DROP_BASE = 3;   // 第 1 个 Boss 掉 3 个道具
const BOSS_DROP_STEP = 2;   // 每个 Boss 再多掉 2 个
const BOSS_DROP_MAX = 14;   // 一次最多掉 14 个

module.exports = {
  BOSS_EVERY_M: BOSS_EVERY_M,
  BOSS_SCALE: BOSS_SCALE,
  BOSS_HP_MULT_START: BOSS_HP_MULT_START,
  BOSS_HP_MULT_GROWTH: BOSS_HP_MULT_GROWTH,
  BOSS_FIRE_MULT_START: BOSS_FIRE_MULT_START,
  BOSS_FIRE_MULT_GROWTH: BOSS_FIRE_MULT_GROWTH,
  BOSS_FIRE_MS_MIN: BOSS_FIRE_MS_MIN,
  BOSS_BULLET_BASE: BOSS_BULLET_BASE,
  BOSS_BULLET_STEP: BOSS_BULLET_STEP,
  BOSS_BULLET_MAX: BOSS_BULLET_MAX,
  BOSS_BULLET_SPREAD_DEG: BOSS_BULLET_SPREAD_DEG,
  BOSS_MINION_MIN_MS: BOSS_MINION_MIN_MS,
  BOSS_MINION_MAX_MS: BOSS_MINION_MAX_MS,
  BOSS_MINION_SHRINK_MS: BOSS_MINION_SHRINK_MS,
  BOSS_DROP_BASE: BOSS_DROP_BASE,
  BOSS_DROP_STEP: BOSS_DROP_STEP,
  BOSS_DROP_MAX: BOSS_DROP_MAX,
};
