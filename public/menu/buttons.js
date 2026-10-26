// 主界面按钮：布局与命中检测。
//
// 坐标系 = 设计单位（960×540），由 core/ui.js 统一等比缩放到屏幕。
// 按钮尺寸 / 间距在设计单位里是常量，所以任何分辨率下宽高比都完全一致。

const ui = require('../core/ui.js');

const BTN_W = 360;
const BTN_H = 56;
const BTN_GAP = 16;
const BTN_TOP = 152;

const DEFS = [
  { id: 'start', label: '开始游戏' },
  { id: 'load', label: '读取游戏' },
  { id: 'shop', label: '商店' },
  { id: 'settings', label: '游戏设置' },
  { id: 'exit', label: '退出游戏' },
];

// 返回设计坐标下的按钮矩形数组
function build() {
  const x = (ui.DESIGN_W - BTN_W) / 2;
  const out = [];

  for (let i = 0; i < DEFS.length; i++) {
    out.push({
      id: DEFS[i].id,
      label: DEFS[i].label,
      x: x,
      y: BTN_TOP + i * (BTN_H + BTN_GAP),
      w: BTN_W,
      h: BTN_H,
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
  BTN_W: BTN_W,
  BTN_H: BTN_H,
};
