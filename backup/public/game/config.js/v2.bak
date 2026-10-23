// 游戏模块参数：尺寸 / 物理 / 手感 / 战斗，全部集中在这里调。
//
// 单位约定：
//   距离 = 画布像素（展示用米数 = 像素 / DISTANCE_PER_UNIT）
//   时间 = 毫秒
//   速度 = 像素 / 毫秒
//   加速度 = 像素 / 毫秒²

const canvasKit = require('../core/canvas.js');

const WIDTH = canvasKit.width;
const HEIGHT = canvasKit.height;

// ---------------- 人物尺寸 ----------------
const PLAYER_W = Math.max(26, Math.round(WIDTH * 0.078));
const PLAYER_H = Math.round(PLAYER_W * 1.5);

// 地面在屏幕上的 y
const GROUND_Y = Math.round(HEIGHT * 0.76);

// 人物出生点（世界坐标）
const START_X = Math.round(WIDTH * 0.3);

// ---------------- 物理 ----------------
const GRAVITY = 0.0016;
const MAX_FALL = 1.25;
const JUMP_V = -0.80;
const RUN_ACCEL = 0.0032;
const RUN_MAX = 0.34;
const GROUND_FRICTION = 0.0028;
const AIR_FRICTION = 0.0006;
const COYOTE_MS = 90;
const JUMP_BUFFER_MS = 130;

// ---------------- 血量 ----------------
const PLAYER_MAX_HP = 10;

// ---------------- 眨眼 ----------------
const BLINK_MIN_MS = 2200;
const BLINK_MAX_MS = 4200;
const BLINK_DURATION_MS = 130;

// ---------------- 摇杆（左下角固定） ----------------
const JOY_RADIUS = Math.round(Math.min(WIDTH * 0.17, 78));
const JOY_MARGIN = Math.round(Math.min(WIDTH, HEIGHT) * 0.07);
const JOY_CX = JOY_MARGIN + JOY_RADIUS;
const JOY_CY = HEIGHT - JOY_MARGIN - JOY_RADIUS;
const JOY_GRAB_R = Math.round(JOY_RADIUS * 2);
const JOY_KNOB_RATIO = 0.46;
const JOY_DEAD = 0.22;
const JOY_JUMP_Y = 0.62;

// ---------------- 玩家子弹 ----------------
const BULLET_SPEED = 1.15;
const BULLET_FIRE_MS = 130;
const BULLET_LIFE_MS = 1500;
const BULLET_R = Math.max(3, Math.round(PLAYER_W * 0.13));

// ---------------- 敌人 ----------------
const ENEMY_GAP_START_M = 100;   // 初始每 100 米一波
const ENEMY_GAP_MIN_M = 40;      // 间隔下限
const ENEMY_GAP_DECAY = 0.02;    // 每深入 1 米，间隔缩短 0.02 米
const ENEMY_COUNT_STEP_M = 500;  // 每 500 米一波 +1 个
const ENEMY_MAX_COUNT = 4;       // 一波最多几个
const ENEMY_HP_STEP_M = 500;     // 每 500 米血量 +1
const ENEMY_FIRE_MS = 1500;      // 敌人开火间隔
const ENEMY_BULLET_SPEED = 0.55; // 敌人子弹速度
const ENEMY_DAMAGE = 1;          // 敌人子弹对玩家造成的伤害

// ---------------- 相机 / 计分 ----------------
const CAMERA_ANCHOR = 0.34;
const DISTANCE_PER_UNIT = 10;

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

  PLAYER_MAX_HP: PLAYER_MAX_HP,

  BLINK_MIN_MS: BLINK_MIN_MS,
  BLINK_MAX_MS: BLINK_MAX_MS,
  BLINK_DURATION_MS: BLINK_DURATION_MS,

  JOY_RADIUS: JOY_RADIUS,
  JOY_MARGIN: JOY_MARGIN,
  JOY_CX: JOY_CX,
  JOY_CY: JOY_CY,
  JOY_GRAB_R: JOY_GRAB_R,
  JOY_KNOB_RATIO: JOY_KNOB_RATIO,
  JOY_DEAD: JOY_DEAD,
  JOY_JUMP_Y: JOY_JUMP_Y,

  BULLET_SPEED: BULLET_SPEED,
  BULLET_FIRE_MS: BULLET_FIRE_MS,
  BULLET_LIFE_MS: BULLET_LIFE_MS,
  BULLET_R: BULLET_R,

  ENEMY_GAP_START_M: ENEMY_GAP_START_M,
  ENEMY_GAP_MIN_M: ENEMY_GAP_MIN_M,
  ENEMY_GAP_DECAY: ENEMY_GAP_DECAY,
  ENEMY_COUNT_STEP_M: ENEMY_COUNT_STEP_M,
  ENEMY_MAX_COUNT: ENEMY_MAX_COUNT,
  ENEMY_HP_STEP_M: ENEMY_HP_STEP_M,
  ENEMY_FIRE_MS: ENEMY_FIRE_MS,
  ENEMY_BULLET_SPEED: ENEMY_BULLET_SPEED,
  ENEMY_DAMAGE: ENEMY_DAMAGE,

  CAMERA_ANCHOR: CAMERA_ANCHOR,
  DISTANCE_PER_UNIT: DISTANCE_PER_UNIT,
};
