// 分身：存在上限 / 存活时间 / 永久分身 / 开火与跳跃 / 血量

const CLONE_MAX = 8;               // 同时最多存在 8 个分身

// 存活时间
const CLONE_LIFE_BASE_MS = 10000;  // 默认存活 10 秒
const CLONE_LIFE_STEP_MS = 2000;   // 商店每级「分身时长」+2 秒
const CLONE_LIFE_MAX_MS = 60000;   // 存活时间上限 60 秒

// 永久分身（每局开局自动生成，价格递增）
const PERM_CLONE_BASE_COST = 1000; // 第 1 个 1000 金币
const PERM_CLONE_COST_STEP = 1000; // 之后每个 +1000

// 开火与跳跃
const CLONE_FIRE_MS = 260;      // 分身开火间隔
const CLONE_JUMP_MIN_MS = 900;  // 分身随机跳跃的最小间隔
const CLONE_JUMP_MAX_MS = 2600; // 分身随机跳跃的最大间隔

// 血量
const CLONE_HP_BASE = 3;        // 分身基础血量
const CLONE_HP_STEP_M = 400;    // 每 400 米，分身道具给的血量 +1
const CLONE_HP_MAX = 12;        // 分身道具给的血量上限

module.exports = {
  CLONE_MAX: CLONE_MAX,
  CLONE_LIFE_BASE_MS: CLONE_LIFE_BASE_MS,
  CLONE_LIFE_STEP_MS: CLONE_LIFE_STEP_MS,
  CLONE_LIFE_MAX_MS: CLONE_LIFE_MAX_MS,
  PERM_CLONE_BASE_COST: PERM_CLONE_BASE_COST,
  PERM_CLONE_COST_STEP: PERM_CLONE_COST_STEP,
  CLONE_FIRE_MS: CLONE_FIRE_MS,
  CLONE_JUMP_MIN_MS: CLONE_JUMP_MIN_MS,
  CLONE_JUMP_MAX_MS: CLONE_JUMP_MAX_MS,
  CLONE_HP_BASE: CLONE_HP_BASE,
  CLONE_HP_STEP_M: CLONE_HP_STEP_M,
  CLONE_HP_MAX: CLONE_HP_MAX,
};
