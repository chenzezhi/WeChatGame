// 操作层：触摸 → 意图（方向 / 跳跃）。
//
// 规则：
//   按住屏幕左半边 → 往左走；按住右半边 → 往右走（手指过中线会即时换向）
//   在一次按住中向上滑超过阈值 → 触发一次跳跃

const cfg = require('./config.js');

const state = {
  dir: 0,
  jumpRequested: false,
  activeId: null,
  startY: 0,
  swipeDone: false,
};

function reset() {
  state.dir = 0;
  state.jumpRequested = false;
  state.activeId = null;
  state.startY = 0;
  state.swipeDone = false;
}

function dirFromX(x) {
  return x < cfg.WIDTH / 2 ? -1 : 1;
}

function touchStart(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  state.activeId = t.id;
  state.startY = t.y;
  state.swipeDone = false;
  state.dir = dirFromX(t.x);
}

function touchMove(e) {
  const list = e.touches || [];
  let t = null;

  for (let i = 0; i < list.length; i++) {
    if (state.activeId === null || list[i].id === state.activeId) {
      t = list[i];
      break;
    }
  }
  if (!t) return;

  state.dir = dirFromX(t.x);

  if (!state.swipeDone && (state.startY - t.y) >= cfg.SWIPE_UP_PX) {
    state.jumpRequested = true;
    state.swipeDone = true;
  }
}

function touchEnd(e) {
  const list = e.changed || [];
  for (let i = 0; i < list.length; i++) {
    if (state.activeId === null || list[i].id === state.activeId) {
      state.activeId = null;
      state.dir = 0;
      return;
    }
  }
}

function getDir() {
  return state.dir;
}

function consumeJump() {
  if (!state.jumpRequested) return false;
  state.jumpRequested = false;
  return true;
}

module.exports = {
  reset: reset,
  touchStart: touchStart,
  touchMove: touchMove,
  touchEnd: touchEnd,
  getDir: getDir,
  consumeJump: consumeJump,
};
