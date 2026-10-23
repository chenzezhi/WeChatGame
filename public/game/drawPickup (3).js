// 道具绘制：按类型区分颜色与图标。

const cfg = require('./config.js');
const util = require('./drawUtil.js');

const STYLE = {
  clone: { halo: 'rgba(120,220,255,0.26)', core: 'rgba(232,250,255,0.95)', ring: '#59c8ff', icon: '#2f8fd6' },
  speed: { halo: 'rgba(255,205,90,0.26)', core: 'rgba(255,252,236,0.95)', ring: '#ffb02e', icon: '#e08a00' },
  multi: { halo: 'rgba(170,140,255,0.26)', core: 'rgba(246,240,255,0.95)', ring: '#a78bff', icon: '#6f4fd0' },
};

function drawCloneIcon(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;

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
  ctx.globalAlpha = 1;
}

function drawSpeedIcon(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.12, cy - r * 0.5);
  ctx.lineTo(cx - r * 0.34, cy + r * 0.06);
  ctx.lineTo(cx - r * 0.02, cy + r * 0.06);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.5);
  ctx.lineTo(cx + r * 0.36, cy - r * 0.1);
  ctx.lineTo(cx + r * 0.04, cy - r * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawMultiIcon(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const offs = [-r * 0.4, 0, r * 0.4];

  for (let i = 0; i < 3; i++) {
    const bx = cx + offs[i];
    util.roundRectPath(ctx, bx - r * 0.12, cy - r * 0.26, r * 0.24, r * 0.56, r * 0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, cy - r * 0.28, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOne(ctx, it, cameraX, now) {
  const x = it.x - cameraX;

  if (x + it.w < -60 || x > cfg.WIDTH + 60) return;

  const st = STYLE[it.kind] || STYLE.clone;
  const bob = Math.sin(now / 360 + (it.bobPhase || 0) * 6.283) * 5;
  const cx = x + it.w / 2;
  const cy = it.y + it.h / 2 + bob;
  const r = it.w * 0.5;

  const pulse = 1 + Math.sin(now / 300 + (it.bobPhase || 0) * 6.283) * 0.10;
  ctx.fillStyle = st.halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = st.core;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = st.ring;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  if (it.kind === 'speed') drawSpeedIcon(ctx, cx, cy, r, st.icon);
  else if (it.kind === 'multi') drawMultiIcon(ctx, cx, cy, r, st.icon);
  else drawCloneIcon(ctx, cx, cy, r, st.icon);
  ctx.restore();
}

function draw(ctx, level, cameraX, now) {
  const list = (level && level.list) || [];
  for (let i = 0; i < list.length; i++) drawOne(ctx, list[i], cameraX, now);
}

module.exports = { draw: draw };
