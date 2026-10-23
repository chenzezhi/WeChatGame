// 主界面按钮：布局与命中检测。

const canvasKit = require('../core/canvas.js');

const WIDTH_RATIO = 0.68;   // 按钮宽度占屏宽
const WIDTH_MAX = 420;
const HEIGHT_MIN = 52;
const HEIGHT_RATIO = 0.075; // 按钮高度占屏高
const GAP_RATIO = 0.42;     // 按钮间距 = 高度 × 该系数
const TOP_RATIO = 0.44;     // 第一个按钮的 y 位置

const DEFS = [
  { id: 'start', label: '开始游戏' },
  { id: 'load', label: '读取游戏' },
  { id: 'exit', label: '退出游戏' },
];

// 生成按钮矩形列表
function build() {
  const width = canvasKit.width;
  const height = canvasKit.height;

  const w = Math.min(width * WIDTH_RATIO, WIDTH_MAX);
  const h = Math.max(HEIGHT_MIN, height * HEIGHT_RATIO);
  const gap = h * GAP_RATIO;
  const x = (width - w) / 2;
  const y0 = height * TOP_RATIO;

  const out = [];
  for (let i = 0; i < DEFS.length; i++) {
    out.push({
      id: DEFS[i].id,
      label: DEFS[i].label,
      x: x,
      y: y0 + i * (h + gap),
      w: w,
      h: h,
    });
  }
  return out;
}

// 命中检测：返回被点到的按钮，没有则 null
function hit(items, x, y) {
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const b = items[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

module.exports = {
  build: build,
  hit: hit,
};
