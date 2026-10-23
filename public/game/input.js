// 操作层：支持多点触控。
//
// 规则：
//   方向：由「最近按下、且还没用来上滑跳跃」的那根手指决定（按住屏幕左/右半边）
//   跳跃：任意一根手指向上滑超过阈值都会触发一次跳跃
//
// 所以可以：一只手按住右侧一直跑，另一只手任意位置向上滑跳跃，互不干扰。
// 手指滑下去回到起始高度后，可以再次上滑连跳。

const cfg = require('./config.js');

let seq = 0;

const state = {
  pointers: [],          // { id, x, y, startY, swipeDone, order }
  jumpRequested: false,
};

function reset() {
  state.pointers.length = 0;
  state.jumpRequested = false;
}

function findPointer(id) {
  for (let i = 0; i < state.pointers.length; i++) {
    if (state.pointers[i].id === id) return state.pointers[i];
  }
  return null;
}

function addPointer(t) {
  if (findPointer(t.id)) return;
  seq++;
  state.pointers.push({
    id: t.id,
    x: t.x,
    y: t.y,
    startY: t.y,
    swipeDone: false,
    order: seq,
  });
}

function removePointer(id) {
  for (let i = 0; i < state.pointers.length; i++) {
    if (state.pointers[i].id === id) {
      state.pointers.splice(i, 1);
      return;
    }
  }
}

function touchStart(e) {
  const changed = e.changed || [];
  const all = e.touches || [];

  for (let i = 0; i < changed.length; i++) addPointer(changed[i]);

  // 兜底：某些机型 changed 可能为空
  if (!changed.length) {
    for (let i = 0; i < all.length; i++) addPointer(all[i]);
  }
}

function touchMove(e) {
  const list = e.touches || [];

  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    const p = findPointer(t.id);
    if (!p) continue;

    p.x = t.x;
    p.y = t.y;

    // 上滑到阈值 → 触发一次跳跃
    if (!p.swipeDone && (p.startY - t.y) >= cfg.SWIPE_UP_PX) {
      p.swipeDone = true;
      state.jumpRequested = true;
      continue;
    }

    // 回到（或低于）起始高度 → 重新上膛，允许再次上滑连跳
    if (p.swipeDone && t.y >= p.startY - 4) {
      p.swipeDone = false;
      p.startY = t.y;
    }
  }
}

function touchEnd(e) {
  const changed = e.changed || [];

  for (let i = 0; i < changed.length; i++) removePointer(changed[i].id);

  // 兜底：全部手指都离开
  if (!(e.touches && e.touches.length) && !changed.length) {
    reset();
  }
}

// 方向：优先「最近按下且没有用于跳跃」的手指，其次「最近按下的手指」
function getDir() {
  if (!state.pointers.length) return 0;

  let best = null;

  for (let i = 0; i < state.pointers.length; i++) {
    const p = state.pointers[i];
    if (p.swipeDone) continue;
    if (!best || p.order > best.order) best = p;
  }

  if (!best) {
    for (let i = 0; i < state.pointers.length; i++) {
      const p = state.pointers[i];
      if (!best || p.order > best.order) best = p;
    }
  }

  return best.x < cfg.WIDTH / 2 ? -1 : 1;
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
