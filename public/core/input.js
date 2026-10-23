// 输入：把 wx 的触摸事件归一化（统一成画布坐标 + 手指 id），再分发给订阅者。

const canvasKit = require('./canvas.js');

const listeners = {
  start: [],
  move: [],
  end: [],
};

function normalizeList(list) {
  const out = [];
  if (!list) return out;
  for (let i = 0; i < list.length; i++) {
    const t = list[i] || {};
    const p = canvasKit.point(t);
    out.push({
      x: p.x,
      y: p.y,
      id: typeof t.identifier === 'number' ? t.identifier : 0,
    });
  }
  return out;
}

function wrap(e) {
  e = e || {};
  return {
    touches: normalizeList(e.touches),
    changed: normalizeList(e.changedTouches),
  };
}

function emit(type, event) {
  const list = listeners[type];
  for (let i = 0; i < list.length; i++) {
    try {
      list[i](event);
    } catch (err) {
      // 单个订阅者异常不影响其他订阅者与主循环
      try { console.error('[input] ' + type + ' handler error: ' + err); } catch (e2) {}
    }
  }
}

function on(type, fn) {
  if (!listeners[type] || typeof fn !== 'function') return;
  listeners[type].push(fn);
}

wx.onTouchStart(function (e) { emit('start', wrap(e)); });
wx.onTouchMove(function (e) { emit('move', wrap(e)); });

if (typeof wx.onTouchEnd === 'function') {
  wx.onTouchEnd(function (e) { emit('end', wrap(e)); });
}
if (typeof wx.onTouchCancel === 'function') {
  wx.onTouchCancel(function (e) { emit('end', wrap(e)); });
}

module.exports = { on: on };
