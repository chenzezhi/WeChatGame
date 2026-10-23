// 画布：创建唯一的上屏 canvas，并统一坐标系 / 触摸坐标换算。
// 注意：wx.createCanvas() 第一次调用创建的才是上屏画布，所以只在这里创建一次。

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

let sys = {};
try { sys = wx.getSystemInfoSync() || {}; } catch (e) { sys = {}; }

const width = canvas.width || sys.windowWidth || 375;
const height = canvas.height || sys.windowHeight || 667;

// 触摸事件给的是逻辑像素，canvas 可能是物理像素，需要换算
const scaleX = sys.windowWidth ? width / sys.windowWidth : 1;
const screenH = sys.screenHeight || sys.windowHeight;
const scaleY = screenH ? height / screenH : 1;

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
