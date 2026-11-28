'use strict';

/* ==================== 功能 ====================
 * World —— 战斗画面的世界变换
 *
 * 一个共享的缩放状态：布阵时 1（原大小），战斗时缩小（看 battlefieldZoom）。
 * 所有画世界内容的地方（人物、怪物、子弹、武器、篝火）都套同一个变换，
 * 这样它们永远对得齐；HUD 和按钮不套，保持屏幕原尺寸。
 * ==============================================*/

/* ==================== 用法 ====================
 * const World = require('./world.js');
 *
 * World.set(0.62, cx, cy);          // 缩小到 62%，围绕 cx,cy
 * ctx.save();
 * World.apply(ctx);                 // 之后按世界坐标画
 * ...
 * ctx.restore();
 *
 * World.toWorld(x, y);              // 屏幕坐标 → 世界坐标（点击命中用）
 * ==============================================*/

/* ==================== 注意 ====================
 * 缩放围绕中心点做，所以棋盘、篝火、人物都朝中心收缩，不会偏心。
 * zoom 为 1 时 apply 不做任何事。
 * ==============================================*/

let zoom = 1;   // 缩放倍数，1 = 原大小
let cx = 0;     // 缩放中心 x，单位 px
let cy = 0;     // 缩放中心 y，单位 px

// 设置当前变换
// z - 缩放倍数
// centerX, centerY - 缩放中心，单位 px
function set(z, centerX, centerY) {
  zoom = z;
  cx = centerX;
  cy = centerY;
}

// 把变换应用到 ctx 上，调用前后要配对 save / restore
// ctx - Canvas 2D 上下文
function apply(ctx) {
  if (zoom === 1) return;
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);
}

// 屏幕坐标 → 世界坐标（点击命中判定用）
// x, y - 屏幕（画布物理像素）坐标
// 返回 { x, y }
function toWorld(x, y) {
  if (zoom === 1) return { x: x, y: y };
  return {
    x: cx + (x - cx) / zoom,
    y: cy + (y - cy) / zoom,
  };
}

// 当前缩放倍数
function getZoom() {
  return zoom;
}

module.exports = { set: set, apply: apply, toWorld: toWorld, getZoom: getZoom };
