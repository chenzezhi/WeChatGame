// 自动开火按钮：关闭时是瞄准摇杆右下角的小圆钮，开启时占据摇杆位置并放大。

const screen = require('./screen.js');
const controls = require('./controls.js');

// 关闭态：瞄准摇杆右下角的小按钮
const AUTO_BTN_SMALL = 34;
const AUTO_SMALL_CX = controls.AIM_CX + controls.AIM_RADIUS * 0.74;
const AUTO_SMALL_CY = controls.AIM_CY + controls.AIM_RADIUS * 0.74;

// 开启态：直接占据瞄准摇杆的位置，并放大
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
