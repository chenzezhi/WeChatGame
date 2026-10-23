// 游戏模块参数：尺寸 / 物理 / 手感 / 战斗 / 道具，全部集中在这里调。
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

// ---------------- 敌人：生成 ----------------
const ENEMY_GAP_START_M = 100;   // 初始每 100 米一波
const ENEMY_GAP_MIN_M = 40;      // 间隔下限
const ENEMY_GAP_DECAY = 0.02;    // 每深入 1 米，间隔缩短 0.02 米
const ENEMY_COUNT_STEP_M = 500;  // 每 500 米一波 +1 个
const ENEMY_MAX_COUNT = 4;       // 一波最多几个
const ENEMY_HP_STEP_M = 500;     // 每 500 米血量 +1

// ---------------- 敌人：开火 ----------------
const ENEMY_FIRE_MS = 1500;      // 初始开火间隔
const ENEMY_FIRE_DECAY = 1.6;    // 每深入 1 米，开火间隔缩短 1.6 毫秒
const ENEMY_FIRE_MS_MIN = 420;   // 开火间隔下限（最快）
const ENEMY_BULLET_SPEED = 0.55; // 敌人子弹速度
const ENEMY_DAMAGE = 1;          // 敌人初始伤害（子掸 / 碰撞共用基数）

// ---------------- 敌人：随机移动 ----------------
const ENEMY_MOVE_MS_START = 900; // 初始：多久换一次移动决策
const ENEMY_MOVE_DECAY = 0.12;   // 每深入 1 米，决策间隔缩短 0.12 毫秒
const ENEMY_MOVE_MS_MIN = 240;   // 决策间隔下限（动得最勤）
const ENEMY_MOVE_SPEED = 0.20;   // 敌人走路速度
const ENEMY_JUMP_CHANCE = 0.42;  // 每次决策时起跳的概率
const ENEMY_JUMP_V = -0.72;      // 敌人起跳初速度

// ---------------- 敌人：碰撞伤害 ----------------
const ENEMY_CONTACT_DMG_STEP_M = 400;   // 每 400 米碰撞伤害 +1
const ENEMY_CONTACT_DMG_MAX = 6;        // 碰撞伤害上限
const ENEMY_CONTACT_COOLDOWN_MS = 700;  // 同一个人的碰撞二次受伤冷却

// ---------------- 道具（分身补给） ----------------
const ITEM_FIRST_M = 120;               // 第 120 米左右开始出现
const ITEM_SIZE = Math.round(PLAYER_W * 0.78);
const ITEM_GAP_MIN_START_M = 110;       // 初始间隔范围（下限）
const ITEM_GAP_MAX_START_M = 240;       // 初始间隔范围（上限）
const ITEM_GAP_DECAY = 0.045;           // 每深入 1 米，间隔收窄 0.045 米
const ITEM_GAP_MIN_MIN_M = 60;          // 间隔下限（最勤）
const ITEM_GAP_MAX_MIN_M = 120;         // 间隔上限（最勤）

// ---------------- 分身（复制体） ----------------
const CLONE_MAX = 3;                    // 同时最多几个分身
const CLONE_FIRE_MS = 260;              // 分身开火间隔
const CLONE_JUMP_MIN_MS = 900;          // 随机跳跃间隔下限
const CLONE_JUMP_MAX_MS = 2600;         // 随机跳跃间隔上限
const CLONE_HP_BASE = 3;                // 分身基础血量（道具强度）
const CLONE_HP_STEP_M = 400;            // 每 400 米强度 +1 血
const CLONE_HP_MAX = 12;                // 分身血量上限

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

  ENEMY_CONTACT_DMG_STEP_M: ENEMY_CONTACT_DMG_STEP_M,
  ENEMY_CONTACT_DMG_MAX: ENEMY_CONTACT_DMG_MAX,
  ENEMY_CONTACT_COOLDOWN_MS: ENEMY_CONTACT_COOLDOWN_MS,

  ITEM_FIRST_M: ITEM_FIRST_M,
  ITEM_SIZE: ITEM_SIZE,
  ITEM_GAP_MIN_START_M: ITEM_GAP_MIN_START_M,
  ITEM_GAP_MAX_START_M: ITEM_GAP_MAX_START_M,
  ITEM_GAP_DECAY: ITEM_GAP_DECAY,
  ITEM_GAP_MIN_MIN_M: ITEM_GAP_MIN_MIN_M,
  ITEM_GAP_MAX_MIN_M: ITEM_GAP_MAX_MIN_M,

  CLONE_MAX: CLONE_MAX,
  CLONE_FIRE_MS: CLONE_FIRE_MS,
  CLONE_JUMP_MIN_MS: CLONE_JUMP_MIN_MS,
  CLONE_JUMP_MAX_MS: CLONE_JUMP_MAX_MS,
  CLONE_HP_BASE: CLONE_HP_BASE,
  CLONE_HP_STEP_M: CLONE_HP_STEP_M,
  CLONE_HP_MAX: CLONE_HP_MAX,

  CAMERA_ANCHOR: CAMERA_ANCHOR,
  DISTANCE_PER_UNIT: DISTANCE_PER_UNIT,
};
