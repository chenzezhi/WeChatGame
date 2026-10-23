// 场景管理：注册 / 切换 / 分发事件。
//
// 场景是一个对象，下面这些方法都是可选的：
//   enter(payload)        进入时调用
//   exit()                离开时调用
//   update(dt, now)       每帧逻辑
//   render(ctx, now)      每帧绘制
//   touchStart(e) / touchMove(e) / touchEnd(e)
//
// 事件对象统一为：{ touches: [{x, y, id}], changed: [{x, y, id}] }

const scenes = {};
let current = null;
let currentName = '';

function register(name, scene) {
  if (!name || !scene) return null;
  scenes[name] = scene;
  return scene;
}

function has(name) {
  return !!scenes[name];
}

function switchTo(name, payload) {
  const next = scenes[name];
  if (!next) return false;

  if (current && current !== next && typeof current.exit === 'function') {
    try { current.exit(); } catch (e) { /* 忽略 */ }
  }

  current = next;
  currentName = name;

  if (typeof next.enter === 'function') {
    try { next.enter(payload || {}); } catch (e) { /* 忽略 */ }
  }

  return true;
}

function name() {
  return currentName;
}

function update(dt, now) {
  if (current && typeof current.update === 'function') current.update(dt, now);
}

function render(ctx, now) {
  if (current && typeof current.render === 'function') current.render(ctx, now);
}

function touchStart(e) {
  if (current && typeof current.touchStart === 'function') current.touchStart(e);
}

function touchMove(e) {
  if (current && typeof current.touchMove === 'function') current.touchMove(e);
}

function touchEnd(e) {
  if (current && typeof current.touchEnd === 'function') current.touchEnd(e);
}

module.exports = {
  register: register,
  has: has,
  switchTo: switchTo,
  name: name,
  update: update,
  render: render,
  touchStart: touchStart,
  touchMove: touchMove,
  touchEnd: touchEnd,
};
