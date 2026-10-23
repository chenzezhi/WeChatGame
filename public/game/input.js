// 操作层：支持多点触控。
//
// 规则：
//   移动：屏幕左下角的固定摇杆。按在摇杆范围内就「抓住」摇杆，左右推 = 左右移动。
//   跳跃：把摇杆向上推超过阈值触发一次跳跃（推回去再推可以再跳）。
//   射击：按在摇杆范围以外的任何地方，就是按住开火，子弹朝该触摸点飞。
//
// 所以可以：左手搓摇杆跑动，右手随便按哪都能打枪，互不干扰。

const cfg = require('./config.js');

let seq = 0;

const state = {
  pointers: [],        // { id, x, y, isJoy, order }
  joystickId: -1,      // 当前抓住摇杆的手指 id，-1 = 没有
  joyDX: 0,            // 摇杆水平偏移（-1 ~ 1）
  joyDY: 0,            // 摇杆垂直偏移（-1 ~ 1）
  joyJumpDone: false,  // 这次上推是否已经触发过跳跃
  jumpRequested: false,
};

function reset() {
  state.pointers.length = 0;
  state.joystickId = -1;
  state.joyDX = 0;
  state.joyDY = 0;
  state.joyJumpDone = false;
  state.jumpRequested = false;
}

function findPointer(id) {
  for (let i = 0; i < state.pointers.length; i++) {
    if (state.pointers[i].id === id) return state.pointers[i];
  }
  return null;
}

// 是否落在摇杆的可抓取范围里
function inJoyZone(x, y) {
  const dx = x - cfg.JOY_CX;
  const dy = y - cfg.JOY_CY;
  return dx * dx + dy * dy <= cfg.JOY_GRAB_R * cfg.JOY_GRAB_R;
}

// 根据摇杆手指位置更新偏移量与「上推跳跃」
function updateJoy(p) {
  let dx = (p.x - cfg.JOY_CX) / cfg.JOY_RADIUS;
  let dy = (p.y - cfg.JOY_CY) / cfg.JOY_RADIUS;

  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }

  state.joyDX = dx;
  state.joyDY = dy;

  if (dy <= -cfg.JOY_JUMP_Y) {
    if (!state.joyJumpDone) {
      state.joyJumpDone = true;
      state.jumpRequested = true;
    }
  } else if (dy > -cfg.JOY_JUMP_Y * 0.5) {
    state.joyJumpDone = false; // 回中后重新上膛，允许连跳
  }
}

function addPointer(t) {
  if (findPointer(t.id)) return;
  seq++;

  const p = {
    id: t.id,
    x: t.x,
    y: t.y,
    isJoy: false,
    order: seq,
  };
  state.pointers.push(p);

  // 第一个按在摇杆范围内的手指抓住摇杆，其余都算射击手指
  if (state.joystickId < 0 && inJoyZone(t.x, t.y)) {
    state.joystickId = t.id;
    p.isJoy = true;
    updateJoy(p);
  }
}

function removePointer(id) {
  for (let i = 0; i < state.pointers.length; i++) {
    if (state.pointers[i].id !== id) continue;

    state.pointers.splice(i, 1);

    if (state.joystickId === id) {
      state.joystickId = -1;
      state.joyDX = 0;
      state.joyDY = 0;
      state.joyJumpDone = false;
    }
    return;
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

    if (p.isJoy) updateJoy(p);
  }
}

function touchEnd(e) {
  const changed = e.changed || [];

  for (let i = 0; i < changed.length; i++) removePointer(changed[i].id);

  // 兜底：全部手指都离开
  if (!(e.touches && e.touches.length) && !changed.length) reset();
}

// 移动方向：-1 左 / 0 不动 / 1 右（由摇杆水平偏移决定）
function getDir() {
  if (state.joystickId < 0) return 0;
  if (state.joyDX > cfg.JOY_DEAD) return 1;
  if (state.joyDX < -cfg.JOY_DEAD) return -1;
  return 0;
}

// 射击目标：取「最近按下、且不是摇杆」的那根手指，没有则 null
function getFireTarget() {
  let best = null;

  for (let i = 0; i < state.pointers.length; i++) {
    const p = state.pointers[i];
    if (p.isJoy) continue;
    if (!best || p.order > best.order) best = p;
  }

  if (!best) return null;
  return { x: best.x, y: best.y };
}

// 供绘制层读取的摇杆状态
function getJoystick() {
  return {
    active: state.joystickId >= 0,
    cx: cfg.JOY_CX,
    cy: cfg.JOY_CY,
    r: cfg.JOY_RADIUS,
    dx: state.joyDX,
    dy: state.joyDY,
  };
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
  getFireTarget: getFireTarget,
  getJoystick: getJoystick,
  consumeJump: consumeJump,
};
