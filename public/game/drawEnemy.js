// 敌人绘制（Q 版）：胖圆果冻身 + 小脚 + 大白眼 + 彩色瞳孔高光 + 小犄角。
// Boss：更大、戴王冠、粗血条；仍然保留蓄力 / 冲刺特效。

const cfg = require('./config.js');
const pal = require('./palette.js');
const util = require('./drawUtil.js');

const C = pal.C;
const OUT = pal.OUT;

const BOSS_BODY = '#ef5f57';
const BOSS_BODY_DARK = '#c23b36';
const BOSS_HORN = '#ffd98a';
const BOSS_EYE = '#ffb020';
const BOSS_HP = '#ff6a6a';
const BOSS_CROWN = '#ffd34d';
const BOSS_CROWN_DARK = '#d99a12';

function drawCrown(ctx, cx, topY, bodyW, outW) {
  const w = bodyW * 0.50;
  const h = bodyW * 0.24;
  const x0 = cx - w / 2;

  ctx.beginPath();
  ctx.moveTo(x0, topY);
  ctx.lineTo(x0 + w * 0.18, topY - h);
  ctx.lineTo(x0 + w * 0.34, topY - h * 0.28);
  ctx.lineTo(x0 + w * 0.50, topY - h * 1.12);
  ctx.lineTo(x0 + w * 0.66, topY - h * 0.28);
  ctx.lineTo(x0 + w * 0.82, topY - h);
  ctx.lineTo(x0 + w, topY);
  ctx.closePath();

  ctx.fillStyle = BOSS_CROWN;
  ctx.fill();
  ctx.strokeStyle = BOSS_CROWN_DARK;
  ctx.lineWidth = outW * 0.8;
  ctx.stroke();
}

// 蓄力：背后红光 + 向内收缩的蓄力环
function drawDashWindup(ctx, e, cx, bodyY, bodyW, bodyH, now) {
  const windMs = cfg.BOSS_DASH_WINDUP_MS > 0 ? cfg.BOSS_DASH_WINDUP_MS : 900;
  const left = Math.max(0, e.dashWindupUntil - now);
  const progress = 1 - Math.min(1, left / windMs);
  const cy = bodyY + bodyH * 0.5;
  const R = bodyW * 0.95;

  const g = ctx.createRadialGradient(cx, cy, bodyW * 0.2, cx, cy, R);
  g.addColorStop(0, 'rgba(255,80,70,' + (0.28 + 0.30 * progress).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(255,80,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  for (let k = 0; k < 3; k++) {
    const t = ((now / 240) + k / 3) % 1;
    const rr = R * (1.08 - t * 0.72);

    ctx.strokeStyle = 'rgba(255,120,110,' + (0.55 * (1 - t)).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// 冲刺：身后拖出速度残影
function drawDashTrail(ctx, e, cx, bodyY, bodyW, bodyH) {
  const back = e.dashDir >= 0 ? -1 : 1;

  ctx.strokeStyle = 'rgba(255,170,120,0.6)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  for (let k = 0; k < 4; k++) {
    const yy = bodyY + bodyH * (0.18 + k * 0.22);
    const len = bodyW * (0.55 + k * 0.16);

    ctx.beginPath();
    ctx.moveTo(cx + back * bodyW * 0.42, yy);
    ctx.lineTo(cx + back * (bodyW * 0.42 + len), yy);
    ctx.stroke();
  }

  ctx.lineCap = 'butt';
}

function drawOne(ctx, e, cameraX, now) {
  const x = e.x - cameraX;
  const w = e.w;
  const h = e.h;

  if (x + w < -60 || x > cfg.WIDTH + 60) return;

  const boss = !!e.isBoss;
  const hurt = !!(e.hurtAt && now - e.hurtAt < 150);
  const bob = Math.sin(now / (boss ? 560 : 420) + (e.bobPhase || 0) * 6.283) * h * (boss ? 0.014 : 0.03);

  const cx = x + w / 2;
  const baseY = e.y + h + bob;

  const bodyW = w * 0.92;
  const bodyH = h * 0.82;
  const bodyX = cx - bodyW / 2;
  const bodyY = baseY - bodyH;

  const outW = Math.max(1.8, bodyW * 0.055);

  const bodyCol = boss
    ? (hurt ? '#ffffff' : BOSS_BODY)
    : (hurt ? C.enemyHurt : C.enemyBody);
  const darkCol = boss ? BOSS_BODY_DARK : C.enemyBodyDark;
  const hornCol = boss ? BOSS_HORN : C.enemyHorn;
  const eyeCol = boss ? BOSS_EYE : C.enemyEye;
  const OUTCOL = hurt ? 'rgba(255,255,255,0.9)' : OUT;

  util.fillEllipse(ctx, cx, cfg.GROUND_Y + 4, w * 0.46, w * 0.15, C.shadow);

  // Boss 技能特效（画在身体后面）
  if (boss) {
    if (e.dashState === 'windup') drawDashWindup(ctx, e, cx, bodyY, bodyW, bodyH, now);
    else if (e.dashState === 'dash') drawDashTrail(ctx, e, cx, bodyY, bodyW, bodyH);
  }

  // 小脚
  ctx.fillStyle = darkCol;
  util.fillEllipse(ctx, cx - bodyW * 0.24, baseY - bodyH * 0.02, bodyW * 0.17, bodyH * 0.10, darkCol);
  util.fillEllipse(ctx, cx + bodyW * 0.24, baseY - bodyH * 0.02, bodyW * 0.17, bodyH * 0.10, darkCol);

  // 犄角
  ctx.fillStyle = hornCol;

  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW * 0.24, bodyY + bodyH * 0.16);
  ctx.quadraticCurveTo(bodyX + bodyW * 0.10, bodyY - bodyH * 0.30, bodyX + bodyW * 0.40, bodyY + bodyH * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTCOL;
  ctx.lineWidth = outW * 0.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW * 0.76, bodyY + bodyH * 0.16);
  ctx.quadraticCurveTo(bodyX + bodyW * 0.90, bodyY - bodyH * 0.30, bodyX + bodyW * 0.60, bodyY + bodyH * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTCOL;
  ctx.lineWidth = outW * 0.8;
  ctx.stroke();

  // 身体（胖圆）
  util.roundRectPath(ctx, bodyX, bodyY, bodyW, bodyH, Math.min(bodyW, bodyH) * 0.46);
  ctx.fillStyle = bodyCol;
  ctx.fill();
  ctx.strokeStyle = OUTCOL;
  ctx.lineWidth = outW;
  ctx.stroke();

  // 肚皮高光
  if (!hurt) {
    util.fillEllipse(ctx, cx, bodyY + bodyH * 0.72, bodyW * 0.32, bodyH * 0.20, 'rgba(255,255,255,0.22)');
  }

  // 眼睛：大白眼 + 彩色瞳孔 + 高光
  const eyeR = bodyW * (boss ? 0.17 : 0.155);
  const eyeY = bodyY + bodyH * 0.36;
  const eyeDX = bodyW * 0.21;

  const charging = (e.dashState === 'windup' || e.dashState === 'dash');

  for (let i = 0; i < 2; i++) {
    const ex = i === 0 ? cx - eyeDX : cx + eyeDX;

    util.circleStyled(ctx, ex, eyeY, eyeR, '#ffffff', OUTCOL, outW * 0.7);

    if (charging) {
      util.circleStyled(ctx, ex, eyeY, eyeR * 0.52, '#ffffff', null, 0);
      util.circleStyled(ctx, ex, eyeY, eyeR * 0.26, hurt ? '#ffdede' : eyeCol, null, 0);
    } else {
      util.circleStyled(ctx, ex, eyeY + eyeR * 0.06, eyeR * 0.56, eyeCol, null, 0);
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + eyeR * 0.26, eyeY - eyeR * 0.30, Math.max(1, eyeR * 0.26), 0, Math.PI * 2);
    ctx.fill();
  }

  // 嘴：小 "o" / 微笑
  ctx.strokeStyle = darkCol;
  ctx.lineWidth = Math.max(1.5, bodyW * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();

  if (charging) {
    ctx.arc(cx, bodyY + bodyH * 0.66, bodyW * 0.10, 0, Math.PI * 2);
  } else {
    ctx.arc(cx, bodyY + bodyH * 0.62, bodyW * 0.13, Math.PI * 0.20, Math.PI * 0.80);
  }

  ctx.stroke();
  ctx.lineCap = 'butt';

  // Boss 王冠
  if (boss) drawCrown(ctx, cx, bodyY - bodyH * 0.02, bodyW, outW);

  // 血条：Boss 常显且更粗
  const showBar = boss || e.maxHp > 1 || e.hp < e.maxHp;
  if (showBar) {
    const barW = bodyW * (boss ? 0.98 : 0.92);
    const barH = boss ? 9 : 6;
    const barX = cx - barW / 2;
    const barY = bodyY - barH - (boss ? 30 : 10);

    util.roundRectStyled(ctx, barX, barY, barW, barH, barH / 2, 'rgba(40,26,52,0.42)', 'rgba(255,255,255,0.5)', 1.4);

    const ratio = e.hp > 0 ? e.hp / e.maxHp : 0;
    if (ratio > 0) {
      util.roundRectPath(ctx, barX, barY, barW * ratio, barH, barH / 2);
      ctx.fillStyle = boss ? BOSS_HP : C.enemyHp;
      ctx.fill();
    }
  }
}

function draw(ctx, level, cameraX, now) {
  const list = (level && level.list) || [];
  for (let i = 0; i < list.length; i++) drawOne(ctx, list[i], cameraX, now);
}

module.exports = { draw: draw };
