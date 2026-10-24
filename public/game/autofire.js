// 自动开火按钮：位置计算 + 命中检测（纯函数，不改状态）。

const cfg = require('./config.js');

// on = 当前是否已开启自动开火
function rectOf(on) {
  if (on) {
    const s = cfg.AUTO_BTN_BIG;
    return {
      x: cfg.AUTO_BIG_CX - s / 2,
      y: cfg.AUTO_BIG_CY - s / 2,
      w: s,
      h: s,
    };
  }

  const s = cfg.AUTO_BTN_SMALL;
  return {
    x: cfg.AUTO_SMALL_CX - s / 2,
    y: cfg.AUTO_SMALL_CY - s / 2,
    w: s,
    h: s,
  };
}

// 命中判定：留一点外扩，方便手指按
function hit(x, y, on) {
  const r = rectOf(on);
  const pad = on ? 2 : 8;

  return x >= r.x - pad && x <= r.x + r.w + pad &&
         y >= r.y - pad && y <= r.y + r.h + pad;
}

module.exports = {
  rectOf: rectOf,
  hit: hit,
};
