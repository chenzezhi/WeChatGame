'use strict';

/* ==================== 功能 ====================
 * Touch —— 触摸层
 *
 * 把微信的原始触摸事件整理成「按下即点击」，坐标统一换算成画布物理像素。
 * 调用方不用管 dpr，也不用管逻辑像素。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Touch = require('./touch.js');
 *
 * Touch.bind({
 *   stage: stage,                 // 用来算坐标比例
 *   tap: (x, y) => { ... },       // 画布物理像素坐标
 *   drag: (x, y) => { ... },      // 可选，按住移动时触发
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 比例用「画布宽 ÷ 窗口宽」现算，不假设等于 pixelRatio：
 * 不同机型、不同建 canvas 的方式，这两个数不一定一致，猜错就点不中。
 *
 * 按下就发 tap。等抬手的写法要判断移动距离和按住时长，多一个失败点，
 * MVP 阶段不需要——以后要做拖拽时，把 tap 换成 end 时触发即可。
 * ==============================================*/

// 划走多少逻辑像素就算拖动（现在只记录，不阻止 tap）
const TAP_MOVE_LIMIT = 12;

let bound = false;

// 算「逻辑像素 → 画布物理像素」的比例
// stage - cax Stage，要有 canvas
// 返回数字，取不到时按 pixelRatio，再取不到按 1
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
// handlers - { stage, tap(x, y), drag(x, y) }，tap / drag 都能不传
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

  // 把画布和窗口的真实尺寸打出来，坐标对不上时一眼看得出
  let winW = 0;
  try {
    winW = wx.getSystemInfoSync().windowWidth || 0;
  } catch (e) {
    winW = 0;
  }
  const cvsW = h.stage && h.stage.canvas ? h.stage.canvas.width : 0;
  console.log('[touch] 画布宽 ' + cvsW + '，窗口宽 ' + winW + '，比例 ' + k.toFixed(3));

  let startX = 0;
  let startY = 0;
  let moved = false;

  wx.onTouchStart(function (e) {
    const t = e.touches && e.touches[0];
    if (!t) return;

    startX = t.clientX * k;
    startY = t.clientY * k;
    moved = false;

    // 按下就算点击
    if (h.tap) h.tap(startX, startY);
  });

  if (wx.onTouchMove) {
    wx.onTouchMove(function (e) {
      const t = e.touches && e.touches[0];
      if (!t) return;

      const x = t.clientX * k;
      const y = t.clientY * k;

      if (Math.abs(x - startX) > TAP_MOVE_LIMIT * k || Math.abs(y - startY) > TAP_MOVE_LIMIT * k) {
        moved = true;
      }

      if (h.drag) h.drag(x, y);
    });
  }

  // 抬手只用来通知，不影响点击
  if (wx.onTouchEnd) {
    wx.onTouchEnd(function () {
      if (h.end) h.end(startX, startY, moved);
    });
  }

  bound = true;
  return true;
}

module.exports = { bind: bind };
