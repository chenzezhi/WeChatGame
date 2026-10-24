// ============================================================
// 游戏参数总配置（所有可调数值都在这里）
// ------------------------------------------------------------
// 单位约定：
//   距离 = 画布像素（展示用米数 = 像素 / DISTANCE_PER_UNIT）
//   时间 = 毫秒（ms），1000ms = 1 秒
//   速度 = 像素 / 毫秒
//   加速度 = 像素 / 毫秒²
// 注意：改数值不要改名，名字被其它文件引用。
// ============================================================

const canvasKit = require('../core/canvas.js');

// ---------------- 屏幕尺寸（只读） ----------------
const WIDTH = canvasKit.width;    // 画布宽（像素），来自 canvas.js
const HEIGHT = canvasKit.height;  // 画布高（像素）

// ---------------- 人物尺寸与站位 ----------------
const PLAYER_W = Math.max(26, Math.round(WIDTH * 0.078)); // 人物宽（像素），随屏宽自适应，最小 26
const PLAYER_H = Math.round(PLAYER_W * 1.5);               // 人物高 = 宽 × 1.5
const GROUND_Y = Math.round(HEIGHT * 0.76);                // 地面线在屏幕上的 y（越大地面越低）
const START_X = Math.round(WIDTH * 0.3);                   // 出生点 x（世界坐标），也是计分零点

// ---------------- 物理手感 ----------------
const GRAVITY = 0.0016;      // 重力加速度：越大下落越快
const MAX_FALL = 1.25;       // 最大下落速度：防止越掉越快
const JUMP_V = -0.80;        // 起跳初速度（负 = 向上）：绝对值越大跳越高
const JUMP_SIDE_V = 0.22;    // 斜跳时的水平初速度（左上 / 右上跳）
const RUN_ACCEL = 0.0032;    // 水平加速度：越大起步越快
const RUN_MAX = 0.34;        // 最大水平速度：越大跑得越快
const GROUND_FRICTION = 0.0028; // 地面摩擦：松开摇杆后减速快慢
const AIR_FRICTION = 0.0006;    // 空中摩擦：空中松手减速很慢
const COYOTE_MS = 90;        // 土狼时间：刚离开地面后多少毫秒内还能起跳
const JUMP_BUFFER_MS = 130;  // 跳跃缓冲：提前多少毫秒按跳，落地瞬间自动起跳

// ---------------- 人物初始血量 ----------------
const PLAYER_MAX_HP = 10;    // 初始最大生命（升级 / 商店可提升）

// ---------------- 眨眼动画 ----------------
const BLINK_MIN_MS = 2200;   // 两次眨眼的最短间隔
const BLINK_MAX_MS = 4200;   // 两次眨眼的最长间隔（中间随机）
const BLINK_DURATION_MS = 130; // 每次闭眼持续多久

// ---------------- 移动摇杆（左下角） ----------------
const JOY_RADIUS = Math.round(Math.min(WIDTH * 0.17, 78)); // 摇杆底盘半径
const JOY_MARGIN = Math.round(Math.min(WIDTH, HEIGHT) * 0.07); // 距屏幕边缘的距离
const JOY_CX = JOY_MARGIN + JOY_RADIUS;       // 摇杆中心 x
const JOY_CY = HEIGHT - JOY_MARGIN - JOY_RADIUS; // 摇杆中心 y
const JOY_GRAB_R = Math.round(JOY_RADIUS * 1.5); // 手指多远之内能抓住摇杆
const JOY_KNOB_RATIO = 0.46;  // 摇杆头半径 = 底盘半径 × 该比例
const JOY_DEAD = 0.22;        // 水平死区：推杆小于该比例不移动
const JOY_JUMP_Y = 0.62;      // 上推超过该比例触发跳跃（0~1）
const JOY_JUMP_STRAIGHT_DEG = 30; // 正上方 ±30° 内算竖直跳，超过则斜跳

// ---------------- 瞄准摇杆（右下角，与移动摇杆对称） ----------------
const AIM_RADIUS = Math.round(Math.min(WIDTH * 0.17, 78)); // 摇杆底盘半径
const AIM_CX = WIDTH - JOY_MARGIN - AIM_RADIUS;  // 中心 x
const AIM_CY = HEIGHT - JOY_MARGIN - AIM_RADIUS; // 中心 y
const AIM_GRAB_R = Math.round(AIM_RADIUS * 1.5); // 抓取范围
const AIM_KNOB_RATIO = 0.46;  // 摇杆头比例
const AIM_DEAD = 0.30;        // 死区：推过该比例才开火，回中即停火

// ---------------- 游戏内「菜单」按钮（右上角） ----------------
const MENU_BTN_W = Math.round(Math.min(WIDTH * 0.22, 78)); // 按钮宽
const MENU_BTN_H = 34;                                     // 按钮高
const MENU_BTN_X = WIDTH - MENU_BTN_W - 12;                // 按钮 x（贴右边）
const MENU_BTN_Y = 66;                                     // 按钮 y（金币下方）

// ---------------- 玩家子弹 ----------------
const BULLET_SPEED = 1.15;   // 子弹飞行速度
const BULLET_LIFE_MS = 1500; // 子弹最长存活时间（到点自动消失）
const BULLET_R = Math.max(3, Math.round(PLAYER_W * 0.13)); // 子弹半径

// ---------------- 射击间隔（射速） ----------------
const PLAYER_FIRE_MS_START = 1000; // 初始射击间隔：1000 = 每秒 1 发
const PLAYER_FIRE_MS_MIN = 90;     // 间隔下限：再快也不会低于这个值
const BULLET_FIRE_MS = PLAYER_FIRE_MS_START; // 兼容旧名，等同初始间隔
const SPEED_ITEM_RATIO = 0.80;     // 吃「攻速」道具：间隔 ×0.8（越小越快）

// ---------------- 一次打几发（散射） ----------------
const PLAYER_MULTI_START = 1;  // 初始一次 1 发
const PLAYER_MULTI_MAX = 10;   // 子弹数量上限
const MULTI_SPREAD_DEG = 8;    // 相邻两发之间的夹角（度），围绕枪口对称展开

// ---------------- 子弹伤害 ----------------
const PLAYER_DAMAGE_START = 1;  // 初始伤害
const PLAYER_DAMAGE_MAX = 20;   // 伤害上限
const DAMAGE_ITEM_GAIN = 0.1;   // 每个「伤害」道具 +0.1
const DAMAGE_SHOP_GAIN = 0.1;   // 商店每级「子弹伤害」+0.1

// ---------------- 弹夹与装填 ----------------
// 每次开火（无论一次几发）消耗 1 发；弹夹空了打不出子弹
const PLAYER_AMMO_START = 15;   // 初始弹夹容量
const PLAYER_AMMO_MAX = 200;    // 弹夹容量上限（需要升很多级才满）
const SHOP_AMMO_GAIN = 2;       // 商店每级「弹夹容量」+1

// 装填只跟「前进距离」有关：走够多少米补 1 发（站着不动不回弹）
const RELOAD_M_START = 50;      // 初始每 50 米 +1 发
const RELOAD_M_MIN = 1;         // 满级每 1 米 +1 发（最快）
const RELOAD_SHOP_STEP_M = 1;   // 商店每级「装填速度」-1 米（想早点满级就调大）
const RELOAD_ITEM_RATIO = 0.80; // 「快速装填」道具：装填距离 ×0.8

// 「弹药」道具：立即补若干发（随距离变多）
const AMMO_ITEM_BASE = 10;             // 基础补 10 发
const AMMO_ITEM_STEP_M = 400;          // 每前进 400 米，补给量增加一次
const AMMO_ITEM_GAIN_PER_STEP = 2;     // 每次增加 2 发
const AMMO_ITEM_MAX = 50;              // 单个弹药道具最多补 40 发

// ---------------- 升级（吃经验升级）成长 ----------------
const LEVEL_HP_GAIN = 1;         // 每级最大生命 +1（升级瞬间回满）
const LEVEL_FIRE_RATIO = 0.985;  // 每级射击间隔 ×0.985（约快 1.5%，越小越快）
const LEVEL_MULTI_EVERY = 3;     // 每 3 级子弹数量 +1
const LEVEL_HP_MAX = 60;         // 最大生命上限

// ---------------- 商店「主体」每级加成 ----------------
const SHOP_HP_GAIN = 4;         // 每级「生命上限」+2
const SHOP_FIRE_RATIO = 0.92;   // 每级「攻击速度」间隔 ×0.92（约快 8%）
const SHOP_MULTI_GAIN = 2;      // 每级「子弹数量」+1
const SHOP_DAMAGE_GAIN = 0.1;   // 每级「子弹伤害」+0.1

// ---------------- 商店价格规则 ----------------
const CLONE_COST_MULT = 2;      // 分身页所有升级价格 = 主体 × 2

// ---------------- 小怪：生成 ----------------
const ENEMY_GAP_START_M = 100;  // 初始每 100 米刷一波
const ENEMY_GAP_MIN_M = 40;     // 波间隔下限（越深入越密，最快 40 米一波）
const ENEMY_GAP_DECAY = 0.02;   // 每深入 1 米，间隔缩短 0.02 米
const ENEMY_COUNT_STEP_M = 400; // 每 400 米，一波敌人数量 +1
const ENEMY_MAX_COUNT = 5;      // 一波最多几个敌人
const ENEMY_HP_STEP_M = 400;    // 每 400 米，敌人血量 +1

// ---------------- 小怪：开火 ----------------
const ENEMY_FIRE_MS = 1400;     // 初始开火间隔
const ENEMY_FIRE_DECAY = 1.8;   // 每深入 1 米，间隔缩短 1.8 毫秒
const ENEMY_FIRE_MS_MIN = 380;  // 开火间隔下限（最快）
const ENEMY_BULLET_SPEED = 0.60; // 敌人子弹速度
const ENEMY_DAMAGE = 1;          // 敌人基础伤害（子弹固定 1，碰撞按下面成长）

// ---------------- 小怪：随机行为 ----------------
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

// ---------------- 小怪：碰撞伤害 ----------------
const ENEMY_CONTACT_DMG_STEP_M = 350; // 每 350 米，碰撞伤害 +1
const ENEMY_CONTACT_DMG_MAX = 10;      // 碰撞伤害上限
const ENEMY_CONTACT_COOLDOWN_MS = 2000; // 同一个人被撞后多少毫秒内不再掉血

// ---------------- Boss ----------------
const BOSS_EVERY_M = 1000;        // 每 1000 米出现一个 Boss
const BOSS_SCALE = 2.4;           // Boss 体形 = 小怪 × 2.4
const BOSS_HP_MULT_START = 10;    // 第 1 个 Boss 血量 = 当波小怪血量 × 10
const BOSS_HP_MULT_GROWTH = 0.45; // 每个 Boss 倍率再 +0.45（10 → 15 → 19 …）

// 开火倍率：数越大开火越快（1.0 = 与小怪同速，<1 = 比小怪慢）
const BOSS_FIRE_MULT_START = 0.9;    // 第 1 个 Boss：比小怪慢 10%
const BOSS_FIRE_MULT_GROWTH = 0.525; // 每个 Boss 再 +0.525
const BOSS_FIRE_MS_MIN = 130;        // Boss 开火间隔下限

const BOSS_BULLET_BASE = 2;      // 第 1 个 Boss 一次散射 2 发
const BOSS_BULLET_STEP = 3;      // 每个 Boss 再 +3 发
const BOSS_BULLET_MAX = 9;       // 散射发数上限
const BOSS_BULLET_SPREAD_DEG = 13; // 散射相邻夹角（度）

// Boss 召唤小怪（玩家走近才开始计时）
const BOSS_MINION_MIN_MS = 3200;  // 召唤间隔下限
const BOSS_MINION_MAX_MS = 7000;  // 召唤间隔上限
const BOSS_MINION_SHRINK_MS = 200; // 每个 Boss 让召唤间隔缩短 200 毫秒

// Boss 击杀掉落
const BOSS_DROP_BASE = 3;   // 第 1 个 Boss 掉 3 个道具
const BOSS_DROP_STEP = 2;   // 每个 Boss 再多掉 2 个
const BOSS_DROP_MAX = 14;   // 一次最多掉 14 个

// ---------------- 经验 ----------------
const XP_BASE = 10;   // 1 级升 2 级需要 10 点
const XP_STEP = 5;    // 之后每级需求 +5（10 / 15 / 20 …）

// ---------------- 道具：出现规律 ----------------
const ITEM_FIRST_M = 160;    // 第一个道具大约在第 160 米
const ITEM_SIZE = Math.round(PLAYER_W * 0.78); // 道具图标直径
const ITEM_GAP_MIN_START_M = 150; // 初始两个道具的间隔（下限）
const ITEM_GAP_MAX_START_M = 300; // 初始两个道具的间隔（上限），实际在上下限间随机
const ITEM_GAP_DECAY = 0.045;     // 每深入 1 米，间隔收窄 0.045 米（出现越来越勤）
const ITEM_GAP_MIN_MIN_M = 80;    // 间隔下限的下限（最勤时最短 80 米）
const ITEM_GAP_MAX_MIN_M = 160;   // 间隔上限的下限（最勤时最长 160 米）

// ---------------- 道具：出现权重（越大越常见） ----------------
const ITEM_WEIGHT_CLONE = 1.0;  // 分身（最稀有）
const ITEM_WEIGHT_SPEED = 3.0;  // 攻速
const ITEM_WEIGHT_MULTI = 2.6;  // 多发
const ITEM_WEIGHT_HEAL = 2.4;   // 血瓶
const ITEM_WEIGHT_COIN = 3.4;   // 金币
const ITEM_WEIGHT_DAMAGE = 2.4; // 伤害
const ITEM_WEIGHT_AMMO = 3.0;   // 弹药
const ITEM_WEIGHT_RELOAD = 2.2; // 快速装填
const ITEM_REPEAT_FACTOR = 0.35; // 连续出现同类时权重打折（避免重复）

// ---------------- 血瓶道具 ----------------
const HEAL_BASE = 4;            // 基础回 2 点血
const HEAL_STEP_M = 350;        // 每 350 米提升一次
const HEAL_GAIN_PER_STEP = 1;   // 每次 +1 点
const HEAL_MAX = 20;            // 单个血瓶最多回 12 点

// ---------------- 金币 ----------------
// 里程奖励：每前进 N 米，固定奖励 1 枚金币（与路上的金币道具分开算）
const COIN_REWARD_M = 100;      // 每前进 100 米奖励 1 金币
const COIN_REWARD_AMOUNT = 1;   // 每次奖励几枚

// 金币道具价值：每击败 1 个 Boss，单个金币道具的价值 +1
const COIN_VALUE_BASE = 1;
const COIN_VALUE_GROWTH = 1;
const COIN_VALUE_MAX = 10;

// ---------------- 分身 ----------------
const CLONE_MAX = 8;               // 同时最多存在 8 个分身

// 存活时间
const CLONE_LIFE_BASE_MS = 10000;  // 默认存活 10 秒
const CLONE_LIFE_STEP_MS = 2000;   // 商店每级「分身时长」+2 秒
const CLONE_LIFE_MAX_MS = 60000;   // 存活时间上限 60 秒

// 永久分身（每局开局自动生成，价格递增）
const PERM_CLONE_BASE_COST = 1000; // 第 1 个 1000 金币
const PERM_CLONE_COST_STEP = 1000; // 之后每个 +1000

const CLONE_FIRE_MS = 260;      // 分身开火间隔
const CLONE_JUMP_MIN_MS = 900;  // 分身随机跳跃的最小间隔
const CLONE_JUMP_MAX_MS = 2600; // 分身随机跳跃的最大间隔
const CLONE_HP_BASE = 3;        // 分身基础血量
const CLONE_HP_STEP_M = 400;    // 每 400 米，分身道具给的血量 +1
const CLONE_HP_MAX = 12;        // 分身道具给的血量上限

// ---------------- 相机与计分 ----------------
const CAMERA_ANCHOR = 0.34;      // 人物固定停在屏幕宽度的 34% 处
const DISTANCE_PER_UNIT = 10;    // 多少像素算 1 米

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
  JOY_RADIUS: JOY_RADIUS,
  JOY_MARGIN: JOY_MARGIN,
  JOY_CX: JOY_CX,
  JOY_CY: JOY_CY,
  JOY_GRAB_R: JOY_GRAB_R,
  JOY_KNOB_RATIO: JOY_KNOB_RATIO,
  JOY_DEAD: JOY_DEAD,
  JOY_JUMP_Y: JOY_JUMP_Y,
  JOY_JUMP_STRAIGHT_DEG: JOY_JUMP_STRAIGHT_DEG,
  AIM_RADIUS: AIM_RADIUS,
  AIM_CX: AIM_CX,
  AIM_CY: AIM_CY,
  AIM_GRAB_R: AIM_GRAB_R,
  AIM_KNOB_RATIO: AIM_KNOB_RATIO,
  AIM_DEAD: AIM_DEAD,
  MENU_BTN_W: MENU_BTN_W,
  MENU_BTN_H: MENU_BTN_H,
  MENU_BTN_X: MENU_BTN_X,
  MENU_BTN_Y: MENU_BTN_Y,
  BULLET_SPEED: BULLET_SPEED,
  BULLET_FIRE_MS: BULLET_FIRE_MS,
  BULLET_LIFE_MS: BULLET_LIFE_MS,
  BULLET_R: BULLET_R,
  PLAYER_FIRE_MS_START: PLAYER_FIRE_MS_START,
  PLAYER_FIRE_MS_MIN: PLAYER_FIRE_MS_MIN,
  SPEED_ITEM_RATIO: SPEED_ITEM_RATIO,
  PLAYER_MULTI_START: PLAYER_MULTI_START,
  PLAYER_MULTI_MAX: PLAYER_MULTI_MAX,
  MULTI_SPREAD_DEG: MULTI_SPREAD_DEG,
  PLAYER_DAMAGE_START: PLAYER_DAMAGE_START,
  PLAYER_DAMAGE_MAX: PLAYER_DAMAGE_MAX,
  DAMAGE_ITEM_GAIN: DAMAGE_ITEM_GAIN,
  DAMAGE_SHOP_GAIN: DAMAGE_SHOP_GAIN,
  PLAYER_AMMO_START: PLAYER_AMMO_START,
  PLAYER_AMMO_MAX: PLAYER_AMMO_MAX,
  SHOP_AMMO_GAIN: SHOP_AMMO_GAIN,
  RELOAD_M_START: RELOAD_M_START,
  RELOAD_M_MIN: RELOAD_M_MIN,
  RELOAD_SHOP_STEP_M: RELOAD_SHOP_STEP_M,
  RELOAD_ITEM_RATIO: RELOAD_ITEM_RATIO,
  AMMO_ITEM_BASE: AMMO_ITEM_BASE,
  AMMO_ITEM_STEP_M: AMMO_ITEM_STEP_M,
  AMMO_ITEM_GAIN_PER_STEP: AMMO_ITEM_GAIN_PER_STEP,
  AMMO_ITEM_MAX: AMMO_ITEM_MAX,
  LEVEL_HP_GAIN: LEVEL_HP_GAIN,
  LEVEL_FIRE_RATIO: LEVEL_FIRE_RATIO,
  LEVEL_MULTI_EVERY: LEVEL_MULTI_EVERY,
  LEVEL_HP_MAX: LEVEL_HP_MAX,
  SHOP_HP_GAIN: SHOP_HP_GAIN,
  SHOP_FIRE_RATIO: SHOP_FIRE_RATIO,
  SHOP_MULTI_GAIN: SHOP_MULTI_GAIN,
  SHOP_DAMAGE_GAIN: SHOP_DAMAGE_GAIN,
  CLONE_COST_MULT: CLONE_COST_MULT,
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
  ENEMY_CHASE_BASE: ENEMY_CHASE_BASE,
  ENEMY_CHASE_GAIN: ENEMY_CHASE_GAIN,
  ENEMY_CHASE_STEP_M: ENEMY_CHASE_STEP_M,
  ENEMY_CHASE_MAX: ENEMY_CHASE_MAX,
  ENEMY_IDLE_CHANCE: ENEMY_IDLE_CHANCE,
  ENEMY_CONTACT_DMG_STEP_M: ENEMY_CONTACT_DMG_STEP_M,
  ENEMY_CONTACT_DMG_MAX: ENEMY_CONTACT_DMG_MAX,
  ENEMY_CONTACT_COOLDOWN_MS: ENEMY_CONTACT_COOLDOWN_MS,
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
  XP_BASE: XP_BASE,
  XP_STEP: XP_STEP,
  ITEM_FIRST_M: ITEM_FIRST_M,
  ITEM_SIZE: ITEM_SIZE,
  ITEM_GAP_MIN_START_M: ITEM_GAP_MIN_START_M,
  ITEM_GAP_MAX_START_M: ITEM_GAP_MAX_START_M,
  ITEM_GAP_DECAY: ITEM_GAP_DECAY,
  ITEM_GAP_MIN_MIN_M: ITEM_GAP_MIN_MIN_M,
  ITEM_GAP_MAX_MIN_M: ITEM_GAP_MAX_MIN_M,
  ITEM_WEIGHT_CLONE: ITEM_WEIGHT_CLONE,
  ITEM_WEIGHT_SPEED: ITEM_WEIGHT_SPEED,
  ITEM_WEIGHT_MULTI: ITEM_WEIGHT_MULTI,
  ITEM_WEIGHT_HEAL: ITEM_WEIGHT_HEAL,
  ITEM_WEIGHT_COIN: ITEM_WEIGHT_COIN,
  ITEM_WEIGHT_DAMAGE: ITEM_WEIGHT_DAMAGE,
  ITEM_WEIGHT_AMMO: ITEM_WEIGHT_AMMO,
  ITEM_WEIGHT_RELOAD: ITEM_WEIGHT_RELOAD,
  ITEM_REPEAT_FACTOR: ITEM_REPEAT_FACTOR,
  HEAL_BASE: HEAL_BASE,
  HEAL_STEP_M: HEAL_STEP_M,
  HEAL_GAIN_PER_STEP: HEAL_GAIN_PER_STEP,
  HEAL_MAX: HEAL_MAX,
  COIN_REWARD_M: COIN_REWARD_M,
  COIN_REWARD_AMOUNT: COIN_REWARD_AMOUNT,
  COIN_VALUE_BASE: COIN_VALUE_BASE,
  COIN_VALUE_GROWTH: COIN_VALUE_GROWTH,
  COIN_VALUE_MAX: COIN_VALUE_MAX,
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
  CAMERA_ANCHOR: CAMERA_ANCHOR,
  DISTANCE_PER_UNIT: DISTANCE_PER_UNIT,
};
