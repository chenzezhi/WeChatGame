// 小怪：开火 / 移动决策 / 追击概率

// ---------------- 开火 ----------------
const ENEMY_FIRE_MS = 1400;      // 初始开火间隔
const ENEMY_FIRE_DECAY = 1.8;    // 每深入 1 米，间隔缩短 1.8 毫秒
const ENEMY_FIRE_MS_MIN = 380;   // 开火间隔下限（最快）
const ENEMY_BULLET_SPEED = 0.60; // 敌人子弹速度
const ENEMY_DAMAGE = 1;          // 敌人子弹基础伤害

// ---------------- 随机行为 ----------------
const ENEMY_MOVE_MS_START = 2000; // 初始每 2 秒做一次行为决策（越大越迟钝）
const ENEMY_MOVE_DECAY = 0.45;    // 每深入 1 米，决策间隔缩短 0.45 毫秒
const ENEMY_MOVE_MS_MIN = 380;    // 决策间隔下限（最灵活）
const ENEMY_MOVE_SPEED = 0.22;    // 敌人走路基础速度
const ENEMY_JUMP_CHANCE = 0.42;   // 靠近玩家时，每次决策起跳的概率
const ENEMY_JUMP_V = -0.72;       // 敌人起跳初速度（负 = 向上）

// 追击概率：开局低，随距离提高
const ENEMY_CHASE_BASE = 0.35;    // 初始追人概率
const ENEMY_CHASE_GAIN = 0.08;    // 每过一段距离追人概率 +0.08
const ENEMY_CHASE_STEP_M = 400;   // 上面那段距离 = 400 米
const ENEMY_CHASE_MAX = 0.85;     // 追人概率上限
const ENEMY_IDLE_CHANCE = 0.30;   // 不追人时，原地发呆的概率

module.exports = {
  ENEMY_FIRE_MS: ENEMY_FIRE_MS,
  ENEMY_FIRE_DECAY: ENEMY_FIRE_DECAY,
  ENEMY_FIRE_MS_MIN: ENEMY_FIRE_MS_MIN,
  ENEMY_BULLET_SPEED: ENEMY_BULLET_SPEED,
  ENEMY_DAMAGE: ENEMY_DAMAGE,
  ENEMY_MOVE_MS_START: ENEMY_MOVE_MS_START,
  ENEMY_MOVE_DECAY: ENEMY_MOVE_DECAY,
  ENEMY_MOVE_MS_MIN: ENEMY_MOVE_MS_MIN,
  ENEMY_MOVE_SPEED: ENEMY_MOVE_SPEED,
  ENEMY_JUMP_CHANCE: ENEMY_JUMP_CHANCE,
  ENEMY_JUMP_V: ENEMY_JUMP_V,
  ENEMY_CHASE_BASE: ENEMY_CHASE_BASE,
  ENEMY_CHASE_GAIN: ENEMY_CHASE_GAIN,
  ENEMY_CHASE_STEP_M: ENEMY_CHASE_STEP_M,
  ENEMY_CHASE_MAX: ENEMY_CHASE_MAX,
  ENEMY_IDLE_CHANCE: ENEMY_IDLE_CHANCE,
};
