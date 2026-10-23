// 特效绘制：子弹、准星、摇杆。

const cfg = require('./config.js');
const pal = require('./palette.js');

const C = pal.C;

function drawBullets(ctx, level, cameraX, theme) {
  const list = (level && level.list) || [];

  ctx.lineCap = 'round';

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const x = b.x - cameraX;
    const y = b.y;

    if (x < -40 || x > cfg.WIDTH + 40) continue;

    ctx.strokeStyle = theme.trail;
    ctx.lineWidth = b.r * 1.6;
    ctx.beginPath();
    ctx.moveTo(x - b.vx * 12, y - b.vy * 12);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = theme.body;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme.core;
    ctx.beginPath();
    ctx.arc(x - b.vx * 2, y - b.vy * 2, b.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineCap = 'butt';
}

function drawAim(ctx, aim, now) {
  if (!aim) return;

  const pulse = 1 + Math.sin(now / 110) * 0.08;
  const r = 13 * pulse;

  ctx.strokeStyle = C.aimRing;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(aim.x, aim.y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(aim.x - r - 5, aim.y);
  ctx.lineTo(aim.x - r + 2, aim.y);
  ctx.moveTo(aim.x + r - 2, aim.y);
  ctx.lineTo(aim.x + r + 5, aim.y);
  ctx.moveTo(aim.x, aim.y - r - 5);
  ctx.lineTo(aim.x, aim.y - r + 2);
  ctx.moveTo(aim.x, aim.y + r - 2);
  ctx.lineTo(aim.x, aim.y + r + 5);
  ctx.stroke();
}

function drawJoystick(ctx, joy) {
  const cx = cfg.JOY_CX;
  const cy = cfg.JOY_CY;
  const r = cfg.JOY_RADIUS;
  const active = !!(joy && joy.active);

  const dx = active ? joy.dx : 0;
  const dy = active ? joy.dy : 0;

  ctx.save();
  ctx.globalAlpha = active ? 1 : 0.8;

  ctx.fillStyle = C.joyBase;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = C.joyRing;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = C.joyKnob;
  ctx.beginPath();
  ctx.arc(cx + dx * r * 0.62, cy + dy * r * 0.62, r * cfg.JOY_KNOB_RATIO, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

module.exports = {
  drawBullets: drawBullets,
  drawAim: drawAim,
  drawJoystick: drawJoystick,
};
