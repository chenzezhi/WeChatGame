/**
 * 输入管理（core/input）
 * 把 wx 的原始触摸事件归一化成 { x, y }，业务层只关心点击坐标。
 */
'use strict';

var input = require('../../platform/wx/input.js');

function normalize(res) {
  var t = res && ((res.touches && res.touches[0]) || (res.changedTouches && res.changedTouches[0]));
  if (!t) return null;
  return { x: t.clientX, y: t.clientY };
}

function createTouchManager() {
  var listeners = { start: [], move: [], end: [] };
  var offs = [];

  function emit(type, res) {
    var point = normalize(res);
    if (!point) return;
    var list = listeners[type];
    for (var i = 0; i < list.length; i++) {
      try { list[i](point, res); } catch (e) { console.error('[input] 回调异常：' + e.message); }
    }
  }

  offs.push(input.onTouchStart(function (res) { emit('start', res); }));
  offs.push(input.onTouchMove(function (res) { emit('move', res); }));
  offs.push(input.onTouchEnd(function (res) { emit('end', res); }));

  return {
    on: function (type, handler) {
      if (!listeners[type]) return function () {};
      listeners[type].push(handler);
      return function () {
        var list = listeners[type];
        var i = list.indexOf(handler);
        if (i >= 0) list.splice(i, 1);
      };
    },
    destroy: function () {
      for (var i = 0; i < offs.length; i++) offs[i]();
      offs.length = 0;
      listeners = { start: [], move: [], end: [] };
    }
  };
}

module.exports = createTouchManager;
