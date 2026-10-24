// 物理手感 / 跳跃 / 初始血量 / 眨眼
// 单位：速度 = 像素/毫秒，加速度 = 像素/毫秒²，时间 = 毫秒

// ---------------- 物理手感 ----------------
const GRAVITY = 0.0016;      // 重力：越大下落越快
const MAX_FALL = 1.25;       // 最大下落速度：防止越掉越快
const JUMP_V = -0.80;        // 起跳初速度（负 = 向上）：绝对值越大跳越高
const JUMP_SIDE_V = 0.22;    // 斜跳时的水平初速度（左上 / 右上跳）
const RUN_ACCEL = 0.0032;    // 水平加速度：越大起步越快
const RUN_MAX = 0.34;        // 最大水平速度：越大跑得越快
const GROUND_FRICTION = 0.0028; // 地面摩擦：松手后减速快慢
const AIR_FRICTION = 0.0006;    // 空中摩擦：空中松手减速很慢
const COYOTE_MS = 90;        // 土狼时间：刚离地多少毫秒内还能起跳
const JUMP_BUFFER_MS = 130;  // 跳跃缓冲：提前多少毫秒按跳，落地自动起跳

// ---------------- 初始血量 ----------------
const PLAYER_MAX_HP = 20;    // 初始最大生命（升级 / 商店可提升）

// ---------------- 眨眼动画 ----------------
const BLINK_MIN_MS = 2200;     // 两次眨眼最短间隔
const BLINK_MAX_MS = 4200;     // 两次眨眼最长间隔（中间随机）
const BLINK_DURATION_MS = 130; // 每次闭眼持续多久

module.exports = {
  GRAVITY: GRAVITY,
  MAX_FALL: MAX_FALL,
  JUMP_V: JUMP_V,
  JUMP_SIDE_V: JUMP_SIDE_V,
  RUN_ACCEL: RUN_ACCEL,
  RUN_MAX: RUN_MAX,
  GROUND_FRICTION: GROUND_FRICTION,
  AIR_FRICTION: AIR_FRICTION,
  COYOTE_MS: COYOTE_MS,
  JUMP_BUFFER_MS: JUMP_BUFFER_MS,
  PLAYER_MAX_HP: PLAYER_MAX_HP,
  BLINK_MIN_MS: BLINK_MIN_MS,
  BLINK_MAX_MS: BLINK_MAX_MS,
  BLINK_DURATION_MS: BLINK_DURATION_MS,
};
