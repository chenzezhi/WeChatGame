/**
 * 地板滑动（features/floor/scroll）
 *
 * 职责单一：把触摸手势翻译成「地板偏移量」写进状态，不做渲染。
 * 支持拖拽 + 松手惯性，边界自动钳制（不会拖出地板外面）。
 *
 * 所有可变量都在 state/modules/floor 里，本模块不私藏状态。
 */
'use strict';

var floorActions = require('../../../state/modules/floor/actions.js');
var floorSelectors = require('../../../state/modules/floor/selectors.js');

var MIN_VELOCITY = 6;      // 低于这个速度就停止惯性
var VELOCITY_SCALE = 0.85; // 手势速度 → 初始惯性速度

function createFloorScroll(ctx) {
  ctx = ctx || {};

  var store = ctx.store;
  var touch = ctx.touch || null;
  var config = ctx.config || {};

  var enabled = config.enabled !== false;
  var inertia = config.inertia !== false;
  var friction = config.friction > 0 && config.friction < 1 ? config.friction : 0.92;

  var dragging = false;
  var startX = 0;
  var startY = 0;
  var startOffsetX = 0;
  var startOffsetY = 0;
  var lastX = 0;
  var lastY = 0;
  var lastDeltaX = 0;
  var lastDeltaY = 0;
  var unsubs = [];

  function bounds() {
    return floorSelectors.getScrollBounds(store);
  }

  function clampOffset(x, y) {
    var b = bounds();
    if (x > 0) x = 0;
    if (y > 0) y = 0;
    if (x < -b.maxX) x = -b.maxX;
    if (y < -b.maxY) y = -b.maxY;
    return { x: x, y: y };
  }

  function applyPosition(x, y) {
    var p = clampOffset(x, y);
    floorActions.setOffset(store, p.x, p.y);
  }

  function stopInertia() {
    floorActions.setVelocity(store, 0, 0);
    lastDeltaX = 0;
    lastDeltaY = 0;
  }

  function onStart(point) {
    var floor = floorSelectors.getFloor(store);
    dragging = true;
    startX = point.x;
    startY = point.y;
    startOffsetX = floor.offsetX || 0;
    startOffsetY = floor.offsetY || 0;
    lastX = point.x;
    lastY = point.y;
    lastDeltaX = 0;
    lastDeltaY = 0;

    floorActions.setDragging(store, true);
    stopInertia();
  }

  function onMove(point) {
    if (!dragging) return;

    lastDeltaX = point.x - lastX;
    lastDeltaY = point.y - lastY;
    lastX = point.x;
    lastY = point.y;

    applyPosition(
      startOffsetX + (point.x - startX),
      startOffsetY + (point.y - startY)
    );
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    floorActions.setDragging(store, false);

    if (!inertia) {
      stopInertia();
      return;
    }

    floorActions.setVelocity(
      store,
      lastDeltaX * VELOCITY_SCALE,
      lastDeltaY * VELOCITY_SCALE
    );
  }

  function bindEvents() {
    if (!touch) return;
    unsubs.push(touch.on('start', function (point) { if (enabled) onStart(point); }));
    unsubs.push(touch.on('move', function (point) { if (enabled) onMove(point); }));
    unsubs.push(touch.on('end', function () { if (enabled) onEnd(); }));
  }

  /** 每帧调用：处理惯性衰减与边界钳制 */
  function update(dt) {
    if (!enabled || dragging) return;

    var floor = floorSelectors.getFloor(store);
    var vx = floor.velocityX || 0;
    var vy = floor.velocityY || 0;

    if (Math.abs(vx) < MIN_VELOCITY && Math.abs(vy) < MIN_VELOCITY) {
      if (vx !== 0 || vy !== 0) stopInertia();
      return;
    }

    // 每帧按 60fps 归一化衰减，保证不同帧率下手感一致
    var step = Math.max(1, Math.round(dt * 60));
    var decay = Math.pow(friction, step);

    vx *= decay;
    vy *= decay;

    var before = { x: floor.offsetX || 0, y: floor.offsetY || 0 };
    applyPosition(before.x + vx * step, before.y + vy * step);

    var after = floorSelectors.getFloor(store);

    // 撞到边界立刻停掉对应方向的速度，避免贴边抖动
    if (after.offsetX === before.x) vx = 0;
    if (after.offsetY === before.y) vy = 0;

    floorActions.setVelocity(store, vx, vy);
  }

  /** 重新布局后把偏移拉回合法范围 */
  function clampToBounds() {
    var floor = floorSelectors.getFloor(store);
    applyPosition(floor.offsetX || 0, floor.offsetY || 0);
  }

  bindEvents();

  return {
    update: update,
    clampToBounds: clampToBounds,
    isDragging: function () { return dragging; },
    destroy: function () {
      for (var i = 0; i < unsubs.length; i++) unsubs[i]();
      unsubs.length = 0;
    }
  };
}

module.exports = { create: createFloorScroll };
