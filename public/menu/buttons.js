// 主界面按钮：布局与命中检测。

const canvasKit = require('../core/canvas.js');

const WIDTH_RATIO = 0.68;
const WIDTH_MAX = 420;
const HEIGHT_MIN = 44;
const HEIGHT_RATIO = 0.062;
const GAP_RATIO = 0.34;
const TOP_RATIO = 0.40;

const DEFS = [
  { id: 'start', label: '开始游戏' },
  { id: 'load', label: '读取游戏' },
  { id: 'shop', label: '商店' },
  { id: 'settings', label: '游戏设置' },
  { id: 'exit', label: '退出游戏' },
];

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
