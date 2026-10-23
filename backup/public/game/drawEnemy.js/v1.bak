// 敌人绘制：圆滚滚的紫色小怪 + 头顶血条 + 受击闪白。

const cfg = require('./config.js');
const pal = require('./palette.js');
const util = require('./drawUtil.js');

const C = pal.C;

function drawOne(ctx, e, cameraX, now) {
  const x = e.x - cameraX;
  const w = e.w;
  const h = e.h;

  if (x + w < -60 || x > cfg.WIDTH + 60) return;

  const hurt = !!(e.hurtAt && now - e.hurtAt < 150);
  const bob = Math.sin(now / 420 + (e.bobPhase || 0) * 6.283) * h * 0.028;

  const cx = x + w / 2;
  const baseY = e.y + h + bob;

  const bodyW = w * 0.86;
  const bodyH = h * 0.80;
  const bodyX = cx - bodyW / 2;
  const bodyY = baseY - bodyH;

  util.fillEllipse(ctx, cx, cfg.GROUND_Y + 3, w * 0.44, w * 0.14, C.shadow);

  // 犄角
  ctx.fillStyle = C.enemyHorn;
  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW * 0.20, bodyY + bodyH * 0.12);
  ctx.lineTo(bodyX + bodyW * 0.05, bodyY - bodyH * 0.22);
  ctx.lineTo(bodyX + bodyW * 0.38, bodyY + bodyH * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW * 0.80, bodyY + bodyH * 0.12);
  ctx.lineTo(bodyX + bodyW * 0.95, bodyY - bodyH * 0.22);
  ctx.lineTo(bodyX + bodyW * 0.62, bodyY + bodyH * 0.04);
  ctx.closePath();
  ctx.fill();

  // 身体
  ctx.fillStyle = hurt ? C.enemyHurt : C.enemyBody;
  util.roundRectPath(ctx, bodyX, bodyY, bodyW, bodyH, bodyW * 0.42);
  ctx.fill();

  ctx.fillStyle = hurt ? 'rgba(255,255,255,0.5)' : C.enemyBodyDark;
  util.roundRectPath(ctx, bodyX, bodyY + bodyH * 0.64, bodyW, bodyH * 0.36, bodyW * 0.3);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = C.enemyEye;
  const eyeR = bodyW * 0.11;
  ctx.beginPath();
  ctx.arc(cx - bodyW * 0.18, bodyY + bodyH * 0.32, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + bodyW * 0.18, bodyY + bodyH * 0.32, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // 嘴
  ctx.strokeStyle = hurt ? 'rgba(120,90,160,0.5)' : C.enemyBodyDark;
  ctx.lineWidth = Math.max(1.5, bodyW * 0.05);
  ctx.beginPath();
  ctx.arc(cx, bodyY + bodyH * 0.58, bodyW * 0.2, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();

  // 血条
  if (e.maxHp > 1 || e.hp < e.maxHp) {
    const barW = bodyW * 0.92;
    const barH = 5;
    const barX = cx - barW / 2;
    const barY = bodyY - barH - 9;

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    util.roundRectPath(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();

    const ratio = e.hp > 0 ? e.hp / e.maxHp : 0;
    if (ratio > 0) {
      ctx.fillStyle = C.enemyHp;
      util.roundRectPath(ctx, barX, barY, barW * ratio, barH, barH / 2);
      ctx.fill();
    }
  }
}

function draw(ctx, level, cameraX, now) {
  const list = (level && level.list) || [];
  for (let i = 0; i < list.length; i++) drawOne(ctx, list[i], cameraX, now);
}

module.exports = { draw: draw };
