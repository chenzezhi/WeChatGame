// 左摇杆（移动/跳跃） / 右摇杆（瞄准） / 游戏内菜单按钮

const screen = require('./screen.js');

const WIDTH = screen.WIDTH;
const HEIGHT = screen.HEIGHT;

// ---------------- 移动摇杆（左下角） ----------------
const JOY_RADIUS = Math.round(Math.min(WIDTH * 0.17, 78)); // 底盘半径
const JOY_MARGIN = Math.round(Math.min(WIDTH, HEIGHT) * 0.07); // 距屏幕边缘
const JOY_CX = JOY_MARGIN + JOY_RADIUS;         // 中心 x
const JOY_CY = HEIGHT - JOY_MARGIN - JOY_RADIUS; // 中心 y
const JOY_GRAB_R = Math.round(JOY_RADIUS * 1.5); // 手指多远能抓住摇杆
const JOY_KNOB_RATIO = 0.46;   // 摇杆头半径比例
const JOY_DEAD = 0.22;         // 水平死区：小于该比例不移动
const JOY_JUMP_Y = 0.62;       // 上推超过该比例触发跳跃
const JOY_JUMP_STRAIGHT_DEG = 30; // 正上方 ±30° 内算竖直跳，超出则斜跳

// ---------------- 瞄准摇杆（右下角，对称） ----------------
const AIM_RADIUS = Math.round(Math.min(WIDTH * 0.17, 78)); // 底盘半径
const AIM_CX = WIDTH - JOY_MARGIN - AIM_RADIUS;  // 中心 x
const AIM_CY = HEIGHT - JOY_MARGIN - AIM_RADIUS; // 中心 y
const AIM_GRAB_R = Math.round(AIM_RADIUS * 1.5); // 抓取范围
const AIM_KNOB_RATIO = 0.46;   // 摇杆头半径比例
const AIM_DEAD = 0.30;         // 死区：推过才开火，回中即停火

// ---------------- 游戏内「菜单」按钮（右上角） ----------------
const MENU_BTN_W = Math.round(Math.min(WIDTH * 0.22, 78)); // 按钮宽
const MENU_BTN_H = 34;                                     // 按钮高
const MENU_BTN_X = WIDTH - MENU_BTN_W - 12;                // 按钮 x（贴右边）
const MENU_BTN_Y = 66;                                     // 按钮 y（金币下方）

module.exports = {
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
};
