'use strict';

/* ==================== 功能 ====================
 * Touch —— 触摸层
 *
 * 把微信的原始触摸事件整理成四个动作：
 *   tap  按下就发（点击）
 *   drag 按住移动时发（拖拽中）
 *   drop 抬手时发（拖拽落地）
 * 坐标统一换算成画布物理像素，调用方不用管 dpr。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Touch = require('./touch.js');
 *
 * Touch.bind({
 *   stage: stage,
 *   tap:  (x, y) => {},                       // 按下
 *   drag: (x, y) => {},                       // 移动中
 *   drop: (sx, sy, ex, ey, moved) => {},      // 抬手
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 比例用「画布宽 ÷ 窗口宽」现算，不假设等于 pixelRatio。
 * tap 在按下时就发，所以点击反应快；drop 用它收到的 moved 判断是点击还是拖拽。
 * ==============================================*/

// 移动超过多少逻辑像素就算拖拽，不算点击
const DRAG_LIMIT = 12;

let bound = false;

// 算「逻辑像素 → 画布物理像素」的比例
function scaleOf(stage) {
  let windowW = 0;
  try {
    windowW = wx.getSystemInfoSync().windowWidth || 0;
  } catch (e) {
    windowW = 0;
  }

  const canvasW = stage && stage.canvas ? stage.canvas.width : 0;
  if (canvasW && windowW) return canvasW / windowW;

  try {
    return wx.getSystemInfoSync().pixelRatio || 1;
  } catch (e) {
    return 1;
  }
}

// 绑定触摸事件
// handlers - { stage, tap, drag, drop }，都可以不传
// 返回是否绑定成功
function bind(handlers) {
  if (bound) {
    console.warn('[touch] 已经绑定过，忽略这次');
    return false;
  }
  if (typeof wx === 'undefined' || !wx.onTouchStart) {
    console.warn('[touch] 当前环境没有触摸事件');
    return false;
  }

  const h = handlers || {};
  const k = scaleOf(h.stage);

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let moved = false;

  wx.onTouchStart(function (e) {
    const t = e.touches && e.touches[0];
    if (!t) return;

    startX = lastX = t.clientX * k;
    startY = lastY = t.clientY * k;
    moved = false;

    if (h.tap) h.tap(startX, startY);
  });

  if (wx.onTouchMove) {
    wx.onTouchMove(function (e) {
      const t = e.touches && e.touches[0];
      if (!t) return;

      lastX = t.clientX * k;
      lastY = t.clientY * k;

      if (Math.abs(lastX - startX) > DRAG_LIMIT * k || Math.abs(lastY - startY) > DRAG_LIMIT * k) {
        moved = true;
      }

      if (h.drag) h.drag(lastX, lastY);
    });
  }

  if (wx.onTouchEnd) {
    wx.onTouchEnd(function () {
      if (h.drop) h.drop(startX, startY, lastX, lastY, moved);
    });
  }

  bound = true;
  return true;
}

module.exports = { bind: bind };
