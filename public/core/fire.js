'use strict';

/* ==================== 功能 ====================
 * Fire —— 篝火精灵图绘制
 *
 * 一张图里包含：15 帧火焰（5 列 3 行）+ 石圈 + 柴火 + 光晕。
 * 按「石圈 → 柴火 → 光晕 → 火焰帧」的顺序叠出来，火焰逐帧循环。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Fire = require('./fire.js');
 * const FIRE = require('../config/fire.js');
 *
 * Fire.load(FIRE);                          // 启动时调一次（异步读图）
 * Fire.ready();                             // 图好了没有
 * Fire.draw(ctx, cx, cy, size, timeMs);     // 每帧画，返回是否画成功
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位 px；cx, cy 是篝火中心点，size 是整体高度。
 * 所有子图都保持原始宽高比，不会拉变形。
 * 图还没加载完时 draw 返回 false，调用方可以退回代码画的版本。
 * ==============================================*/

const texture = require('./texture.js');

// 加载状态
let img = null;
let imgW = 0;
let imgH = 0;
let conf = null;

// 加载精灵图
// cfg - public/config/fire.js
// onReady - 可选回调
function load(cfg, onReady) {
  conf = cfg;

  texture.load(
    cfg.file,
    function (t) {
      img = t.image;
      imgW = t.width;
      imgH = t.height;
      console.log('[fire] 精灵图 ' + imgW + 'x' + imgH);
      if (onReady) onReady();
    },
    function (err) {
      console.warn('[fire] 精灵图加载失败：' + err.message);
    }
  );
}

// 图是否就绪
function ready() {
  return !!(img && imgW && imgH);
}

// 取图片对象（调试预览用）
function image() {
  return img;
}

// 取图片原始尺寸（调试预览用）
function size() {
  return { w: imgW, h: imgH };
}

// 画一个「按比例定义的子图」，按目标高度等比缩放，居中对齐
// p - { x, y, w, h } 全是比例
// cx, cy - 目标中心
// targetH - 目标高度，单位 px
function drawPart(ctx, p, cx, cy, targetH) {
  const sx = p.x * imgW;
  const sy = p.y * imgH;
  const sw = p.w * imgW;
  const sh = p.h * imgH;
  if (sw <= 0 || sh <= 0) return;

  const dh = targetH;
  const dw = dh * (sw / sh);

  ctx.drawImage(img, sx, sy, sw, sh, cx - dw / 2, cy - dh / 2, dw, dh);
}

// 画整堆篝火
// ctx - Canvas 2D 上下文
// cx, cy - 篝火中心，单位 px
// size - 整体高度，单位 px
// timeMs - 累计毫秒，用来算火焰帧和光晕呼吸
// 返回 true 表示画出来了（图未就绪时返回 false）
function draw(ctx, cx, cy, size, timeMs) {
  if (!ready() || !conf) return false;

  const L = conf.layout;
  const t = timeMs || 0;

  // 1. 石圈（最底）
  drawPart(ctx, conf.parts.stone, cx, cy + size * L.stone.offsetY, size * L.stone.scale);

  // 2. 交叉柴火
  drawPart(ctx, conf.parts.log, cx, cy + size * L.log.offsetY, size * L.log.scale);

  // 3. 光晕：缓慢呼吸，让火看起来在跳动
  const pulseMs = L.glow.pulseMs || 520;
  const pulse = 1 + Math.sin((t / pulseMs) * Math.PI * 2) * (L.glow.pulse || 0);
  drawPart(ctx, conf.parts.glow, cx, cy + size * L.glow.offsetY, size * L.glow.scale * pulse);

  // 4. 火焰帧：按 frameMs 逐帧循环
  const g = conf.grid;
  const total = g.cols * g.rows;
  const idx = Math.floor(t / g.frameMs) % total;

  const col = idx % g.cols;
  const row = Math.floor(idx / g.cols);

  const frame = {
    x: g.x + col * g.cellW,
    y: g.y + row * g.cellH,
    w: g.cellW,
    h: g.cellH,
  };

  drawPart(ctx, frame, cx, cy + size * L.flame.offsetY, size * L.flame.scale);

  return true;
}

module.exports = { load: load, ready: ready, draw: draw, image: image, size: size };
