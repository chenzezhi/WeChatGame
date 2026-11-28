'use strict';

/* ==================== 功能 ====================
 * Touch —— 触摸层
 *
 * 把微信的原始触摸事件整理成两个简单动作：点一下（tap）、拖（可选）。
 * 坐标已经换算成「画布物理像素」，调用方不用管 dpr。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Touch = require('./touch.js');
 *
 * Touch.bind({
 *   tap: (x, y) => { ... },
 *   drag: (x, y) => { ... },   // 可选，按住移动时触发
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 微信给的 clientX/clientY 是逻辑像素，画布是物理像素，所以这里统一乘以比例。
 * 手指移动超过 12px 或按住超过 400ms 就不算 tap，避免拖拽被误判成点击。
 * 同一个页面只绑定一次。
 * ==============================================*/

// 划走多远就不算点击，单位：逻辑像素
const TAP_MOVE_LIMIT = 12;

// 按住超过多久就不算点击，单位毫秒
const TAP_TIME_LIMIT = 400;

let bound = false;

// 取得「逻辑像素 → 物理像素」的比例
// 返回数字，取不到时按 1 算
function ratio() {
  try {
    const info = wx.getSystemInfoSync();
    return info.pixelRatio || 1;
  } catch (e) {
    return 1;
  }
}

// 绑定触摸事件
// handlers - { tap(x, y), drag(x, y) }，都能不传
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
  const k = ratio();

  let startX = 0;
  let startY = 0;
  let startAt = 0;
  let moved = false;

  wx.onTouchStart(function (e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    startX = t.clientX * k;
    startY = t.clientY * k;
    startAt = Date.now();
    moved = false;
  });

  if (wx.onTouchMove) {
    wx.onTouchMove(function (e) {
      const t = e.touches && e.touches[0];
      if (!t) return;

      const x = t.clientX * k;
      const y = t.clientY * k;

      // 移动超过阈值就不再算点击
      if (Math.abs(x - startX) > TAP_MOVE_LIMIT * k || Math.abs(y - startY) > TAP_MOVE_LIMIT * k) {
        moved = true;
      }

      if (h.drag) h.drag(x, y);
    });
  }

  if (wx.onTouchEnd) {
    wx.onTouchEnd(function () {
      const ok = !moved && Date.now() - startAt <= TAP_TIME_LIMIT;
      if (ok && h.tap) h.tap(startX, startY);
    });
  }

  bound = true;
  return true;
}

module.exports = { bind: bind };
