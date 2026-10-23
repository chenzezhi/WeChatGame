// 屏幕尺寸 / 人物尺寸 / 相机
// 数值可以手改，但不要改名（其它文件会引用）。

const canvasKit = require('../../core/canvas.js');

// ---------------- 屏幕尺寸（只读） ----------------
const WIDTH = canvasKit.width;    // 画布宽（像素）
const HEIGHT = canvasKit.height;  // 画布高（像素）

// ---------------- 人物尺寸与站位 ----------------
const PLAYER_W = Math.max(26, Math.round(WIDTH * 0.078)); // 人物宽，随屏宽自适应，最小 26
const PLAYER_H = Math.round(PLAYER_W * 1.5);               // 人物高 = 宽 × 1.5
const GROUND_Y = Math.round(HEIGHT * 0.76);                // 地面线 y（越大地面越低）
const START_X = Math.round(WIDTH * 0.3);                   // 出生点 x，也是计分零点

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
  CAMERA_ANCHOR: CAMERA_ANCHOR,
  DISTANCE_PER_UNIT: DISTANCE_PER_UNIT,
};
