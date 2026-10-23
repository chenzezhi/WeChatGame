// 游戏模块参数：尺寸 / 物理 / 手感 / 颜色，全部集中在这里调。
//
// 单位约定：
//   距离 = 画布像素
//   时间 = 毫秒（dt 由主循环传入）
//   速度 = 像素 / 毫秒
//   加速度 = 像素 / 毫秒²

const canvasKit = require('../core/canvas.js');

const WIDTH = canvasKit.width;
const HEIGHT = canvasKit.height;

// ---------------- 人物尺寸 ----------------
const PLAYER_W = Math.max(26, Math.round(WIDTH * 0.078));
const PLAYER_H = Math.round(PLAYER_W * 1.5);

// 地面在屏幕上的 y（相机只做横向滚动，纵向固定）
const GROUND_Y = Math.round(HEIGHT * 0.76);

// 人物出生点（世界坐标）
const START_X = Math.round(WIDTH * 0.3);

// ---------------- 物理 ----------------
const GRAVITY = 0.0016;        // 重力加速度
const MAX_FALL = 1.25;         // 最大下落速度
const JUMP_V = -0.80;          // 起跳速度（负 = 向上）
const RUN_ACCEL = 0.0032;      // 水平加速度
const RUN_MAX = 0.34;          // 最大水平速度
const GROUND_FRICTION = 0.0028;// 地面摩擦（松手减速）
const AIR_FRICTION = 0.0006;   // 空中阻力
const COYOTE_MS = 90;          // 离地后还能跳的宽限时间
const JUMP_BUFFER_MS = 130;    // 落地前提前按跳的缓冲时间

// ---------------- 操作 ----------------
const SWIPE_UP_PX = 36;        // 向上滑多少像素算一次跳跃

// ---------------- 障碍（石头） ----------------
const ROCK_MIN_GAP = 260;      // 石头之间的最小间距
const ROCK_MAX_GAP = 470;      // 石头之间的最大间距
const ROCK_W_RATIO = 1.25;     // 石头宽度 = 人物宽 × 该系数
const ROCK_H_RATIO = 0.95;     // 石头高度基准
const ROCK_SPAWN_AHEAD = 1.9;  // 提前生成多远（屏宽的倍数）

// ---------------- 相机 / 计分 ----------------
const CAMERA_ANCHOR = 0.34;    // 人物停在屏幕横向 34% 处
const DISTANCE_PER_UNIT = 10;  // 每 10 像素算 1 米

module.exports = {
  WIDTH: WIDTH,
  HEIGHT: HEIGHT,

  PLAYER_W: PLAYER_W,
  PLAYER_H: PLAYER_H,
  GROUND_Y: GROUND_Y,
  START_X: START_X,

  GRAVITY: GRAVITY,
  MAX_FALL: MAX_FALL,
  JUMP_V: JUMP_V,
  RUN_ACCEL: RUN_ACCEL,
  RUN_MAX: RUN_MAX,
  GROUND_FRICTION: GROUND_FRICTION,
  AIR_FRICTION: AIR_FRICTION,
  COYOTE_MS: COYOTE_MS,
  JUMP_BUFFER_MS: JUMP_BUFFER_MS,

  SWIPE_UP_PX: SWIPE_UP_PX,

  ROCK_MIN_GAP: ROCK_MIN_GAP,
  ROCK_MAX_GAP: ROCK_MAX_GAP,
  ROCK_W_RATIO: ROCK_W_RATIO,
  ROCK_H_RATIO: ROCK_H_RATIO,
  ROCK_SPAWN_AHEAD: ROCK_SPAWN_AHEAD,

  CAMERA_ANCHOR: CAMERA_ANCHOR,
  DISTANCE_PER_UNIT: DISTANCE_PER_UNIT,
};
