// 道具绘制：按类型区分颜色与图标。

const cfg = require('./config.js');
const util = require('./drawUtil.js');

const STYLE = {
  clone: { halo: 'rgba(120,220,255,0.26)', core: 'rgba(232,250,255,0.95)', ring: '#59c8ff', icon: '#2f8fd6' },
  speed: { halo: 'rgba(255,205,90,0.26)', core: 'rgba(255,252,236,0.95)', ring: '#ffb02e', icon: '#e08a00' },
  multi: { halo: 'rgba(170,140,255,0.26)', core: 'rgba(246,240,255,0.95)', ring: '#a78bff', icon: '#6f4fd0' },
  heal: { halo: 'rgba(255,120,140,0.26)', core: 'rgba(255,244,246,0.95)', ring: '#ff5a72', icon: '#e02f4a' },
  coin: { halo: 'rgba(255,211,77,0.30)', core: 'rgba(255,250,230,0.95)', ring: '#ffd34d', icon: '#ffd34d' },
  damage: { halo: 'rgba(255,140,80,0.28)', core: 'rgba(255,246,238,0.95)', ring: '#ff8a3d', icon: '#e2551a' },
  ammo: { halo: 'rgba(140,200,255,0.28)', core: 'rgba(240,248,255,0.95)', ring: '#5aa9ff', icon: '#1f6fd0' },
  reload: { halo: 'rgba(120,235,190,0.28)', core: 'rgba(240,255,250,0.95)', ring: '#38d6a0', icon: '#128a63' },
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

function drawHealIcon(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;

  util.roundRectPath(ctx, cx - r * 0.16, cy - r * 0.46, r * 0.32, r * 0.92, r * 0.10);
  ctx.fill();
  util.roundRectPath(ctx, cx - r * 0.46, cy - r * 0.16, r * 0.92, r * 0.32, r * 0.10);
  ctx.fill();
}

function drawCoinIcon(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1, r * 0.10);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx - r * 0.13, cy - r * 0.42, r * 0.26, r * 0.84);
}

function drawDamageIcon(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();

  for (let i = 0; i < 12; i++) {
    const rad = (i % 2 === 0) ? r * 0.86 : r * 0.38;
    const ang = (Math.PI / 6) * i - Math.PI / 2;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();
}

// 弹药：一颗子弹（弹头 + 弹身）
function drawAmmoIcon(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;

  util.roundRectPath(ctx, cx - r * 0.22, cy - r * 0.12, r * 0.44, r * 0.58, r * 0.10);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.22, cy - r * 0.12);
  ctx.lineTo(cx, cy - r * 0.62);
  ctx.lineTo(cx + r * 0.22, cy - r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  util.roundRectPath(ctx, cx - r * 0.22, cy + r * 0.26, r * 0.44, r * 0.16, r * 0.07);
  ctx.fill();
}

// 快速装填：环形箭头
function drawReloadIcon(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.6, r * 0.22);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, Math.PI * 0.35, Math.PI * 1.85);
  ctx.stroke();

  ctx.fillStyle = color;
  const tipA = Math.PI * 1.85;
  const tx = cx + Math.cos(tipA) * r * 0.52;
  const ty = cy + Math.sin(tipA) * r * 0.52;

  ctx.beginPath();
  ctx.moveTo(tx + r * 0.30, ty + r * 0.02);
  ctx.lineTo(tx - r * 0.10, ty - r * 0.26);
  ctx.lineTo(tx - r * 0.10, ty + r * 0.28);
  ctx.closePath();
  ctx.fill();

  ctx.lineCap = 'butt';
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
  else if (it.kind === 'heal') drawHealIcon(ctx, cx, cy, r, st.icon);
  else if (it.kind === 'coin') drawCoinIcon(ctx, cx, cy, r, st.icon);
  else if (it.kind === 'damage') drawDamageIcon(ctx, cx, cy, r, st.icon);
  else if (it.kind === 'ammo') drawAmmoIcon(ctx, cx, cy, r, st.icon);
  else if (it.kind === 'reload') drawReloadIcon(ctx, cx, cy, r, st.icon);
  else drawCloneIcon(ctx, cx, cy, r, st.icon);
  ctx.restore();
}

function draw(ctx, level, cameraX, now) {
  const list = (level && level.list) || [];
  for (let i = 0; i < list.length; i++) drawOne(ctx, list[i], cameraX, now);
}

module.exports = { draw: draw };
