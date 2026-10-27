/**
 * 平台能力：触摸事件（原始事件，不做归一化）
 */
'use strict';

function bind(onName, offName, handler) {
  if (typeof wx[onName] !== 'function') return function () {};
  wx[onName](handler);
  return function () {
    if (typeof wx[offName] === 'function') wx[offName](handler);
  };
}

function onTouchStart(handler) { return bind('onTouchStart', 'offTouchStart', handler); }
function onTouchMove(handler) { return bind('onTouchMove', 'offTouchMove', handler); }
function onTouchEnd(handler) { return bind('onTouchEnd', 'offTouchEnd', handler); }
function onTouchCancel(handler) { return bind('onTouchCancel', 'offTouchCancel', handler); }

module.exports = {
  onTouchStart: onTouchStart,
  onTouchMove: onTouchMove,
  onTouchEnd: onTouchEnd,
  onTouchCancel: onTouchCancel
};
