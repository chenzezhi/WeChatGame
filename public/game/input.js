// 操作层：双摇杆，多点触控。
//
//   左摇杆（左下）：左右推 = 移动；上推过阈值 = 跳跃。
//                   跳跃方向按角度分流：正上方 ±JOY_JUMP_STRAIGHT_DEG 内算竖直跳，
//                   再偏就变成左上 / 右上斜跳（方向取自触发那一刻）。
//   右摇杆（右下）：推动方向 = 子弹发射方向；推过死区即持续开火，回中停火。

const cfg = require('./config.js');

let seq = 0;

const state = {
  pointers: [],        // { id, x, y, role, order }
  joystickId: -1,
  joyDX: 0,
  joyDY: 0,
  joyJumpDone: false,
  jumpRequested: false,
  jumpDir: 0,          // -1 左上 / 0 竖直 / 1 右上

  aimId: -1,
  aimDX: 0,
  aimDY: 0,
};

function reset() {
  state.pointers.length = 0;
  state.joystickId = -1;
  state.joyDX = 0;
  state.joyDY = 0;
  state.joyJumpDone = false;
  state.jumpRequested = false;
  state.jumpDir = 0;
  state.aimId = -1;
  state.aimDX = 0;
  state.aimDY = 0;
}

function findPointer(id) {
  for (let i = 0; i < state.pointers.length; i++) {
    if (state.pointers[i].id === id) return state.pointers[i];
  }
  return null;
}

function distTo(x, y, cx, cy) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

// 由摇杆偏移判断跳跃方向：0 = 竖直，-1 = 左上，1 = 右上
function jumpDirFrom(dx, dy) {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (ady < 0.0001) return 0;

  const limit = ady * Math.tan((cfg.JOY_JUMP_STRAIGHT_DEG * Math.PI) / 180);
  if (adx <= limit) return 0;

  return dx > 0 ? 1 : -1;
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
      state.jumpDir = jumpDirFrom(dx, dy);
    }
  } else if (dy > -cfg.JOY_JUMP_Y * 0.5) {
    state.joyJumpDone = false; // 回中后重新上膛，允许连跳
  }
}

// 瞄准摇杆：方向就是子弹方向
function updateAim(p) {
  let dx = (p.x - cfg.AIM_CX) / cfg.AIM_RADIUS;
  let dy = (p.y - cfg.AIM_CY) / cfg.AIM_RADIUS;

  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }

  state.aimDX = dx;
  state.aimDY = dy;
}

function addPointer(t) {
  if (findPointer(t.id)) return;
  seq++;

  const p = {
    id: t.id,
    x: t.x,
    y: t.y,
    role: 'none',
    order: seq,
  };
  state.pointers.push(p);

  const dJoy = distTo(t.x, t.y, cfg.JOY_CX, cfg.JOY_CY);
  const dAim = distTo(t.x, t.y, cfg.AIM_CX, cfg.AIM_CY);

  const canJoy = state.joystickId < 0 && dJoy <= cfg.JOY_GRAB_R;
  const canAim = state.aimId < 0 && dAim <= cfg.AIM_GRAB_R;

  if (canJoy && canAim) {
    // 两个范围重叠时，取更近的那个
    if (dJoy <= dAim) {
      state.joystickId = t.id;
      p.role = 'joy';
      updateJoy(p);
    } else {
      state.aimId = t.id;
      p.role = 'aim';
      updateAim(p);
    }
    return;
  }

  if (canJoy) {
    state.joystickId = t.id;
    p.role = 'joy';
    updateJoy(p);
    return;
  }

  if (canAim) {
    state.aimId = t.id;
    p.role = 'aim';
    updateAim(p);
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

    if (state.aimId === id) {
      state.aimId = -1;
      state.aimDX = 0;
      state.aimDY = 0;
    }

    return;
  }
}

function touchStart(e) {
  const changed = e.changed || [];
  const all = e.touches || [];

  for (let i = 0; i < changed.length; i++) addPointer(changed[i]);

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

    if (p.role === 'joy') updateJoy(p);
    else if (p.role === 'aim') updateAim(p);
  }
}

function touchEnd(e) {
  const changed = e.changed || [];

  for (let i = 0; i < changed.length; i++) removePointer(changed[i].id);

  if (!(e.touches && e.touches.length) && !changed.length) reset();
}

// 移动方向：-1 左 / 0 不动 / 1 右
function getDir() {
  if (state.joystickId < 0) return 0;
  if (state.joyDX > cfg.JOY_DEAD) return 1;
  if (state.joyDX < -cfg.JOY_DEAD) return -1;
  return 0;
}

// 瞄准摇杆状态：held = 是否被按住；active = 推过死区（此时开火）
function getAimStick() {
  const len = Math.sqrt(state.aimDX * state.aimDX + state.aimDY * state.aimDY);
  const held = state.aimId >= 0;

  return {
    held: held,
    active: held && len >= cfg.AIM_DEAD,
    dx: held ? state.aimDX : 0,
    dy: held ? state.aimDY : 0,
    len: held ? len : 0,
  };
}

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

// 有跳跃请求就返回 { dir }（dir: -1 左上 / 0 竖直 / 1 右上），否则 null
function consumeJump() {
  if (!state.jumpRequested) return null;

  state.jumpRequested = false;

  const dir = state.jumpDir || 0;
  state.jumpDir = 0;

  return { dir: dir };
}

module.exports = {
  reset: reset,
  touchStart: touchStart,
  touchMove: touchMove,
  touchEnd: touchEnd,
  getDir: getDir,
  getAimStick: getAimStick,
  getJoystick: getJoystick,
  consumeJump: consumeJump,
};
