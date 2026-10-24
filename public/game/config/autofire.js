// 自动开火按钮：关闭时贴在右下角（避开瞄准摇杆），开启时占据摇杆位置并放大。

const screen = require('./screen.js');
const controls = require('./controls.js');

// ---------------- 关闭态：右下角的小圆钮 ----------------
const AUTO_BTN_SMALL = 34;
const AUTO_SMALL_GAP = 8;   // 与摇杆外圈之间留的空隙
const AUTO_SMALL_EDGE = 6;  // 至少离屏幕边缘多少

// 沿摇杆的对角线方向外推：摇杆半径 + 按钮半径 + 空隙
const DIAG = (controls.AIM_RADIUS + AUTO_BTN_SMALL / 2 + AUTO_SMALL_GAP) * 0.7071;

let smallCX = controls.AIM_CX + DIAG;
let smallCY = controls.AIM_CY + DIAG;

const maxCX = screen.WIDTH - AUTO_BTN_SMALL / 2 - AUTO_SMALL_EDGE;
const maxCY = screen.HEIGHT - AUTO_BTN_SMALL / 2 - AUTO_SMALL_EDGE;

if (smallCX > maxCX) smallCX = maxCX;
if (smallCY > maxCY) smallCY = maxCY;

const AUTO_SMALL_CX = Math.round(smallCX);
const AUTO_SMALL_CY = Math.round(smallCY);

// ---------------- 开启态：直接占据瞄准摇杆的位置，并放大 ----------------
const AUTO_BTN_BIG = 84;
const AUTO_BIG_CX = controls.AIM_CX;
const AUTO_BIG_CY = controls.AIM_CY;

module.exports = {
  AUTO_BTN_SMALL: AUTO_BTN_SMALL,
  AUTO_SMALL_CX: AUTO_SMALL_CX,
  AUTO_SMALL_CY: AUTO_SMALL_CY,
  AUTO_BTN_BIG: AUTO_BTN_BIG,
  AUTO_BIG_CX: AUTO_BIG_CX,
  AUTO_BIG_CY: AUTO_BIG_CY,
};
