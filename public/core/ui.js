// UI 布局基准：固定设计分辨率 + 等比缩放 + 居中留边（letterbox）。
//
// 设计基准固定 960×540。所有界面先用「设计单位」写坐标，
// 绘制时统一 setTransform 到设计坐标系，因此任何分辨率下
// 按钮的宽高比都保持不变，不会被拉扁或拉长。
//
// 触摸事件拿到的 x / y 是画布坐标，用 point() 转成设计坐标后再做命中检测，
// 保证「看到的位置」和「点到的地方」永远一致。

const canvasKit = require('./canvas.js');

const DESIGN_W = 960;
const DESIGN_H = 540;

const width = canvasKit.width;
const height = canvasKit.height;

// 取较小比例 → 整个设计区域都能完整显示（不裁切），多余部分留边
let scale = Math.min(width / DESIGN_W, height / DESIGN_H);
if (!(scale > 0) || !isFinite(scale)) scale = 1;

const viewW = DESIGN_W * scale;
const viewH = DESIGN_H * scale;
const offsetX = (width - viewW) / 2;
const offsetY = (height - viewH) / 2;

// 画布坐标 → 设计坐标
function point(t) {
  t = t || {};
  return {
    id: t.id,
    x: ((t.x || 0) - offsetX) / scale,
    y: ((t.y || 0) - offsetY) / scale,
  };
}

// 设计坐标 → 屏幕坐标（个别地方需要在屏幕坐标系里画东西时用）
function toScreenX(x) { return offsetX + x * scale; }
function toScreenY(y) { return offsetY + y * scale; }
function toScreenLen(v) { return v * scale; }

// 进入设计坐标系：之后所有绘制都可以直接写设计单位。
// 超出设计区域的部分会被裁掉（等价于 letterbox 的内容区）。
function begin(ctx) {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.beginPath();
  ctx.rect(0, 0, DESIGN_W, DESIGN_H);
  ctx.clip();
}

function end(ctx) {
  ctx.restore();
}

module.exports = {
  DESIGN_W: DESIGN_W,
  DESIGN_H: DESIGN_H,
  width: width,
  height: height,
  scale: scale,
  offsetX: offsetX,
  offsetY: offsetY,
  viewW: viewW,
  viewH: viewH,
  point: point,
  toScreenX: toScreenX,
  toScreenY: toScreenY,
  toScreenLen: toScreenLen,
  begin: begin,
  end: end,
};
