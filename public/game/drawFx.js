// 特效绘制：子弹、左摇杆、右瞄准摇杆。

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

// 移动摇杆（左下）
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

// 瞄准摇杆（右下）：推动方向 = 子弹方向
function drawAimStick(ctx, aim) {
  const cx = cfg.AIM_CX;
  const cy = cfg.AIM_CY;
  const r = cfg.AIM_RADIUS;

  const held = !!(aim && aim.held);
  const active = !!(aim && aim.active);

  const dx = held ? aim.dx : 0;
  const dy = held ? aim.dy : 0;
  const len = Math.sqrt(dx * dx + dy * dy);

  ctx.save();
  ctx.globalAlpha = held ? 1 : 0.8;

  // 底盘
  ctx.fillStyle = C.joyBase;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 外圈：开火时变红
  ctx.strokeStyle = active ? C.aimRing : C.joyRing;
  ctx.lineWidth = active ? 3 : 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // 射击方向指示
  if (active && len > 0.0001) {
    const ux = dx / len;
    const uy = dy / len;

    ctx.strokeStyle = C.aimRing;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + ux * r * 0.55, cy + uy * r * 0.55);
    ctx.lineTo(cx + ux * r * 1.12, cy + uy * r * 1.12);
    ctx.stroke();

    // 箭头
    const tipX = cx + ux * r * 1.22;
    const tipY = cy + uy * r * 1.22;
    const nx = -uy;
    const ny = ux;

    ctx.fillStyle = C.aimRing;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - ux * r * 0.26 + nx * r * 0.17, tipY - uy * r * 0.26 + ny * r * 0.17);
    ctx.lineTo(tipX - ux * r * 0.26 - nx * r * 0.17, tipY - uy * r * 0.26 - ny * r * 0.17);
    ctx.closePath();
    ctx.fill();

    ctx.lineCap = 'butt';
  }

  // 摇杆头
  ctx.fillStyle = C.joyKnob;
  ctx.beginPath();
  ctx.arc(cx + dx * r * 0.62, cy + dy * r * 0.62, r * cfg.AIM_KNOB_RATIO, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

module.exports = {
  drawBullets: drawBullets,
  drawJoystick: drawJoystick,
  drawAimStick: drawAimStick,
};
