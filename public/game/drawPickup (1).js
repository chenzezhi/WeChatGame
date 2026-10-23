// 道具绘制：发光的「分身」补给球（悬浮 + 呼吸光圈）。

const cfg = require('./config.js');
const util = require('./drawUtil.js');

const HALO = 'rgba(120,220,255,0.26)';
const CORE = 'rgba(232,250,255,0.95)';
const RING = '#59c8ff';
const ICON = '#2f8fd6';

function drawOne(ctx, it, cameraX, now) {
  const x = it.x - cameraX;

  if (x + it.w < -60 || x > cfg.WIDTH + 60) return;

  const bob = Math.sin(now / 360 + (it.bobPhase || 0) * 6.283) * 5;
  const cx = x + it.w / 2;
  const cy = it.y + it.h / 2 + bob;
  const r = it.w * 0.5;

  // 呼吸光圈
  const pulse = 1 + Math.sin(now / 300 + (it.bobPhase || 0) * 6.283) * 0.10;
  ctx.fillStyle = HALO;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // 球体
  ctx.fillStyle = CORE;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = RING;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  // 图标：一个主体 + 一个淡一点的分身
  ctx.save();
  ctx.fillStyle = ICON;

  ctx.beginPath();
  ctx.arc(cx - r * 0.24, cy - r * 0.22, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  util.roundRectPath(ctx, cx - r * 0.42, cy + r * 0.02, r * 0.36, r * 0.5, r * 0.16);
  ctx.fill();

  ctx.globalAlpha = 0.62;
  ctx.beginPath();
  ctx.arc(cx + r * 0.26, cy - r * 0.10, r * 0.21, 0, Math.PI * 2);
  ctx.fill();
  util.roundRectPath(ctx, cx + r * 0.10, cy + r * 0.12, r * 0.32, r * 0.44, r * 0.14);
  ctx.fill();

  ctx.restore();
}

function draw(ctx, level, cameraX, now) {
  const list = (level && level.list) || [];
  for (let i = 0; i < list.length; i++) drawOne(ctx, list[i], cameraX, now);
}

module.exports = { draw: draw };
