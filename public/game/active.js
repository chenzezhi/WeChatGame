// 主动道具（护盾 / 变大）：HUD 按钮布局 + 命中检测 + 名称表。
// 这里只放纯函数，运行时状态（数量 / 到期时间）放在 game/index.js。

const cfg = require('./config.js');

// 顺序决定按钮从左到右：护盾在左，变大在右
const ITEMS = ['shield', 'grow'];

const LABEL = { shield: '护盾', grow: '变大' };

function rectOf(id) {
  const size = cfg.ACTIVE_BTN_SIZE;
  const y = cfg.ACTIVE_BTN_Y;
  const x = (id === 'grow') ? cfg.ACTIVE_BTN_X_RIGHT : cfg.ACTIVE_BTN_X_LEFT;
  return { x: x, y: y, w: size, h: size };
}

// 返回被点到的道具 id，没点到返回 null
function hit(x, y) {
  for (let i = 0; i < ITEMS.length; i++) {
    const r = rectOf(ITEMS[i]);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return ITEMS[i];
  }

  return null;
}

module.exports = {
  ITEMS: ITEMS,
  LABEL: LABEL,
  rectOf: rectOf,
  hit: hit,
};
