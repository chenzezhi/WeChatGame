// 敌人绘制：小怪（紫）+ Boss（暗红、王冠、粗血条）。

const cfg = require('./config.js');
const pal = require('./palette.js');
const util = require('./drawUtil.js');

const C = pal.C;

const BOSS_BODY = '#b8322c';
const BOSS_BODY_DARK = '#7d1d18';
const BOSS_HORN = '#ffd88a';
const BOSS_EYE = '#ffe14d';
const BOSS_HP = '#ff5252';
const BOSS_CROWN = '#ffd34d';

function drawCrown(ctx, cx, topY, bodyW) {
  const w = bodyW * 0.5;
  const h = bodyW * 0.22;
  const x0 = cx - w / 2;

  ctx.fillStyle = BOSS_CROWN;
  ctx.beginPath();
  ctx.moveTo(x0, topY);
  ctx.lineTo(x0 + w * 0.18, topY - h);
  ctx.lineTo(x0 + w * 0.34, topY - h * 0.25);
  ctx.lineTo(x0 + w * 0.5, topY - h * 1.1);
  ctx.lineTo(x0 + w * 0.66, topY - h * 0.25);
  ctx.lineTo(x0 + w * 0.82, topY - h);
  ctx.lineTo(x0 + w, topY);
  ctx.closePath();
  ctx.fill();
}

function drawOne(ctx, e, cameraX, now) {
  const x = e.x - cameraX;
  const w = e.w;
  const h = e.h;

  if (x + w < -60 || x > cfg.WIDTH + 60) return;

  const boss = !!e.isBoss;
  const hurt = !!(e.hurtAt && now - e.hurtAt < 150);
  const bob = Math.sin(now / (boss ? 560 : 420) + (e.bobPhase || 0) * 6.283) * h * (boss ? 0.014 : 0.028);

  const cx = x + w / 2;
  const baseY = e.y + h + bob;

  const bodyW = w * 0.86;
  const bodyH = h * 0.80;
  const bodyX = cx - bodyW / 2;
  const bodyY = baseY - bodyH;

  const bodyCol = boss ? (hurt ? '#ffffff' : BOSS_BODY) : (hurt ? C.enemyHurt : C.enemyBody);
  const darkCol = boss ? BOSS_BODY_DARK : C.enemyBodyDark;
  const hornCol = boss ? BOSS_HORN : C.enemyHorn;
  const eyeCol = boss ? BOSS_EYE : C.enemyEye;

  util.fillEllipse(ctx, cx, cfg.GROUND_Y + 3, w * 0.44, w * 0.14, C.shadow);

  // 犄角
  ctx.fillStyle = hornCol;
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
  ctx.fillStyle = bodyCol;
  util.roundRectPath(ctx, bodyX, bodyY, bodyW, bodyH, bodyW * 0.42);
  ctx.fill();

  ctx.fillStyle = hurt ? 'rgba(255,255,255,0.5)' : darkCol;
  util.roundRectPath(ctx, bodyX, bodyY + bodyH * 0.64, bodyW, bodyH * 0.36, bodyW * 0.3);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = eyeCol;
  const eyeR = bodyW * (boss ? 0.13 : 0.11);
  ctx.beginPath();
  ctx.arc(cx - bodyW * 0.18, bodyY + bodyH * 0.32, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + bodyW * 0.18, bodyY + bodyH * 0.32, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // 嘴
  ctx.strokeStyle = hurt ? 'rgba(120,90,160,0.5)' : darkCol;
  ctx.lineWidth = Math.max(1.5, bodyW * 0.05);
  ctx.beginPath();
  ctx.arc(cx, bodyY + bodyH * 0.58, bodyW * 0.2, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();

  // Boss 王冠
  if (boss) drawCrown(ctx, cx, bodyY - bodyH * 0.04, bodyW);

  // 血条：Boss 常显且更粗
  const showBar = boss || e.maxHp > 1 || e.hp < e.maxHp;
  if (showBar) {
    const barW = bodyW * (boss ? 0.98 : 0.92);
    const barH = boss ? 8 : 5;
    const barX = cx - barW / 2;
    const barY = bodyY - barH - (boss ? 26 : 9);

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    util.roundRectPath(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();

    const ratio = e.hp > 0 ? e.hp / e.maxHp : 0;
    if (ratio > 0) {
      ctx.fillStyle = boss ? BOSS_HP : C.enemyHp;
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
