// 画布：创建唯一的上屏 canvas，并统一坐标系 / 触摸坐标换算。
// 注意：wx.createCanvas() 第一次调用创建的才是上屏画布，所以只在这里创建一次。
//
// 本项目是横屏（game.json: deviceOrientation = landscape）：
//   - canvas 宽 > 高
//   - 触摸事件给的是逻辑像素，横屏下 windowWidth / windowHeight 已是旋转后的
//     逻辑尺寸，必须按这两个值换算，否则按钮会点偏。

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

let sys = {};
try { sys = wx.getSystemInfoSync() || {}; } catch (e) { sys = {}; }

const width = canvas.width || sys.windowWidth || 667;
const height = canvas.height || sys.windowHeight || 375;

// 逻辑尺寸：优先 windowWidth / windowHeight（横屏旋转后的值）
const logicW = sys.windowWidth || width;
const logicH = sys.windowHeight || sys.screenHeight || height;

const scaleX = logicW ? width / logicW : 1;
const scaleY = logicH ? height / logicH : 1;

function toCanvasX(clientX) {
  return clientX * scaleX;
}

function toCanvasY(clientY) {
  return clientY * scaleY;
}

// 把一个 wx 触摸点转成画布坐标
function point(t) {
  t = t || {};
  return { x: toCanvasX(t.clientX || 0), y: toCanvasY(t.clientY || 0) };
}

module.exports = {
  canvas: canvas,
  ctx: ctx,
  width: width,
  height: height,
  sys: sys,
  toCanvasX: toCanvasX,
  toCanvasY: toCanvasY,
  point: point,
};
