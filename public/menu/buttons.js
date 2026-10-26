// 主界面按钮：布局与命中检测（带纵向滚动容器）。
//
// 横屏可视高度有限，按钮列表改成可滚动：
//   build(scroll) 返回屏幕坐标已减掉滚动的 items，
//   并附带 viewTop / viewH / contentH / scrollMax / scroll 供裁剪与画滚动条。

const canvasKit = require('../core/canvas.js');

const WIDTH_RATIO = 0.72;
const WIDTH_MAX = 420;

const ROW_MIN = 46;
const ROW_MAX = 58;
const ROW_RATIO = 0.115;   // 行高 = 屏高 × 该比例（再夹到 ROW_MIN ~ ROW_MAX）
const GAP_RATIO = 0.30;    // 行间距 = 行高 × 该比例

const TOP_RATIO = 0.34;    // 内容区顶部（避免压到标题）
const TOP_MIN = 96;
const BOTTOM_PAD = 34;     // 内容区距屏幕底部（给「最佳距离」留位置）

const DEFS = [
  { id: 'start', label: '开始游戏' },
  { id: 'load', label: '读取游戏' },
  { id: 'shop', label: '商店' },
  { id: 'settings', label: '游戏设置' },
  { id: 'exit', label: '退出游戏' },
];

function build(scroll) {
  const width = canvasKit.width;
  const height = canvasKit.height;

  const w = Math.min(width * WIDTH_RATIO, WIDTH_MAX);
  const x = (width - w) / 2;

  let h = height * ROW_RATIO;
  if (h < ROW_MIN) h = ROW_MIN;
  if (h > ROW_MAX) h = ROW_MAX;

  const gap = Math.max(10, h * GAP_RATIO);

  const viewTop = Math.max(height * TOP_RATIO, TOP_MIN);
  const viewH = Math.max(90, height - BOTTOM_PAD - viewTop);

  const count = DEFS.length;
  const contentH = count * h + (count - 1) * gap;
  const scrollMax = Math.max(0, contentH - viewH);

  let off = (typeof scroll === 'number' && isFinite(scroll)) ? scroll : 0;
  if (off < 0) off = 0;
  if (off > scrollMax) off = scrollMax;

  const items = [];

  for (let i = 0; i < count; i++) {
    items.push({
      id: DEFS[i].id,
      label: DEFS[i].label,
      x: x,
      y: viewTop - off + i * (h + gap),
      w: w,
      h: h,
    });
  }

  return {
    items: items,
    viewTop: viewTop,
    viewH: viewH,
    contentH: contentH,
    scrollMax: scrollMax,
    scroll: off,
  };
}

function inView(built, y, h) {
  if (!built) return true;
  const top = built.viewTop;
  const bottom = built.viewTop + built.viewH;
  if (y + h <= top) return false;
  if (y >= bottom) return false;
  return true;
}

function hit(built, x, y) {
  const items = (built && built.items) || [];

  for (let i = 0; i < items.length; i++) {
    const b = items[i];
    if (!inView(built, b.y, b.h)) continue;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }

  return null;
}

module.exports = {
  build: build,
  hit: hit,
};
