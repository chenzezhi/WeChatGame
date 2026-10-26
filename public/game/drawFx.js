// 特效绘制（Q 版）：子弹加发光描边，摇杆更圆润、带高光与内圈。

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

    // 拖尾
    ctx.strokeStyle = theme.trail;
    ctx.lineWidth = b.r * 2.0;
    ctx.beginPath();
    ctx.moveTo(x - b.vx * 14, y - b.vy * 14);
    ctx.lineTo(x, y);
    ctx.stroke();

    // 外圈（描边）
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = theme.body;
    ctx.fill();

    if (theme.edge) {
      ctx.strokeStyle = theme.edge;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // 高光核心
    ctx.fillStyle = theme.core;
    ctx.beginPath();
    ctx.arc(x - b.vx * 2, y - b.vy * 2, b.r * 0.52, 0, Math.PI * 2);
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
  ctx.globalAlpha = active ? 1 : 0.78;

  // 底盘
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = C.joyBase;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.stroke();

  // 内圈
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();

  // 摇杆头
  const kx = cx + dx * r * 0.62;
  const ky = cy + dy * r * 0.62;
  const kr = r * cfg.JOY_KNOB_RATIO;

  ctx.beginPath();
  ctx.arc(kx, ky, kr, 0, Math.PI * 2);
  ctx.fillStyle = C.joyKnob;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(kx - kr * 0.30, ky - kr * 0.34, kr * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
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
  ctx.globalAlpha = held ? 1 : 0.78;

  // 底盘
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = C.joyBase;
  ctx.fill();

  // 外圈：开火时变红
  ctx.strokeStyle = active ? C.aimRing : 'rgba(255,255,255,0.75)';
  ctx.lineWidth = active ? 3 : 2.5;
  ctx.stroke();

  // 内圈
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.stroke();

  // 射击方向指示
  if (active && len > 0.0001) {
    const ux = dx / len;
    const uy = dy / len;

    ctx.strokeStyle = C.aimRing;
    ctx.lineWidth = 3.5;
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
  const kx = cx + dx * r * 0.62;
  const ky = cy + dy * r * 0.62;
  const kr = r * cfg.AIM_KNOB_RATIO;

  ctx.beginPath();
  ctx.arc(kx, ky, kr, 0, Math.PI * 2);
  ctx.fillStyle = C.joyKnob;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(kx - kr * 0.30, ky - kr * 0.34, kr * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  ctx.restore();
}

module.exports = {
  drawBullets: drawBullets,
  drawJoystick: drawJoystick,
  drawAimStick: drawAimStick,
};
