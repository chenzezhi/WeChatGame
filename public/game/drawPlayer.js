// 玩家绘制：Q 版小人 + 小手枪（枪口朝准星）+ 会眨的眼睛。

const cfg = require('./config.js');
const pal = require('./palette.js');
const util = require('./drawUtil.js');

const C = pal.C;

// 眼睛：眨眼时画成两条短横线
function drawEyes(ctx, R, headCY, blinking) {
  if (blinking) {
    ctx.strokeStyle = C.eye;
    ctx.lineWidth = Math.max(1.6, R * 0.11);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(R * 0.02, headCY + R * 0.16);
    ctx.lineTo(R * 0.30, headCY + R * 0.16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(R * 0.42, headCY + R * 0.16);
    ctx.lineTo(R * 0.70, headCY + R * 0.16);
    ctx.stroke();

    ctx.lineCap = 'butt';
    return;
  }

  ctx.fillStyle = C.eye;
  ctx.beginPath();
  ctx.arc(R * 0.16, headCY + R * 0.12, R * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(R * 0.56, headCY + R * 0.12, R * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(R * 0.21, headCY + R * 0.07, R * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(R * 0.61, headCY + R * 0.07, R * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

// 小手枪：枪口朝 +x 方向，s = 整体缩放
function drawGun(ctx, hx, hy, angle, s) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.scale(s, s);

  ctx.fillStyle = C.gunDark;
  util.roundRectPath(ctx, -3, -2, 6, 10, 2.4);
  ctx.fill();

  ctx.fillStyle = C.gun;
  util.roundRectPath(ctx, -4, -6, 13, 7, 2.6);
  ctx.fill();

  ctx.fillStyle = C.gunDark;
  util.roundRectPath(ctx, 8, -4.4, 7, 4, 1.8);
  ctx.fill();

  ctx.fillStyle = '#23282f';
  util.roundRectPath(ctx, 14.2, -4, 2.2, 3.2, 1.1);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  util.roundRectPath(ctx, -2.4, -5.4, 8, 1.8, 0.9);
  ctx.fill();

  ctx.restore();
}

// aimAngle = 世界角度；null 表示没瞄准（枪口朝面朝方向）
function draw(ctx, p, cameraX, aimAngle, now) {
  const sx = p.x - cameraX;
  const w = p.w;
  const h = p.h;
  const cx = sx + w / 2;
  const feetY = p.y + h;

  util.fillEllipse(ctx, cx, cfg.GROUND_Y + 3, w * 0.46, w * 0.15, C.shadow);

  const R = w * 0.55;
  const headCY = -h * 0.70;

  const legW = w * 0.24;
  const legH = h * 0.26;
  const bodyW = w * 0.64;
  const bodyH = h * 0.34;
  const bodyY = -legH - bodyH + h * 0.02;
  const armW = w * 0.19;
  const armH = h * 0.24;

  const isJump = p.anim === 'jump';
  const isRun = p.anim === 'run';

  const phase = p.runPhase * Math.PI * 2;
  const swing = isRun ? Math.sin(phase) : 0;
  const bob = isRun ? Math.abs(Math.sin(phase)) * h * 0.035 : 0;

  let legL, legR, armL, armR;

  if (isJump) {
    legL = 0.55;
    legR = -0.32;
    armL = 2.35;
    armR = -2.35;
  } else {
    legL = swing * 0.62;
    legR = -swing * 0.62;
    armL = -swing * 0.55;
    armR = swing * 0.55;
  }

  const hipY = -legH;
  const hipX = legW * 0.42;
  const shoulderY = bodyY + bodyH * 0.16;
  const shoulderX = bodyW * 0.5 - armW * 0.1;

  const facing = p.facing >= 0 ? 1 : -1;
  const aimLocal = (typeof aimAngle === 'number')
    ? (facing >= 0 ? aimAngle : Math.PI - aimAngle)
    : null;

  if (aimLocal !== null) armR = aimLocal - Math.PI / 2;

  let handX, handY;
  if (aimLocal !== null) {
    handX = shoulderX + Math.cos(aimLocal) * armH * 0.92;
    handY = shoulderY + Math.sin(aimLocal) * armH * 0.92;
  } else {
    handX = shoulderX - Math.sin(armR) * armH * 0.92;
    handY = shoulderY + Math.cos(armR) * armH * 0.92;
  }

  // 受伤时整体闪白
  const hurt = !!(p.hurtAt && now - p.hurtAt < 220);
  const skinColor = hurt ? '#ffffff' : C.skin;

  ctx.save();
  ctx.translate(cx, feetY - bob);
  ctx.scale(facing, 1);

  // 后腿 / 后臂
  util.drawLimb(ctx, -hipX, hipY, legH, legW, legL, C.pants);
  util.drawFoot(ctx, -hipX, hipY, legH, legW, legL, C.shoe);
  util.drawLimb(ctx, -shoulderX, shoulderY, armH, armW, armL, skinColor);

  // 身体
  ctx.fillStyle = hurt ? '#ffffff' : C.shirt;
  util.roundRectPath(ctx, -bodyW / 2, bodyY, bodyW, bodyH, bodyW * 0.34);
  ctx.fill();

  ctx.fillStyle = hurt ? 'rgba(255,255,255,0.75)' : C.shirtDark;
  util.roundRectPath(ctx, -bodyW / 2, bodyY + bodyH * 0.66, bodyW, bodyH * 0.34, bodyW * 0.3);
  ctx.fill();

  // 前腿 / 前臂
  util.drawLimb(ctx, hipX, hipY, legH, legW, legR, C.pants);
  util.drawFoot(ctx, hipX, hipY, legH, legW, legR, C.shoe);
  util.drawLimb(ctx, shoulderX, shoulderY, armH, armW, armR, skinColor);

  // 手枪
  drawGun(ctx, handX, handY, aimLocal !== null ? aimLocal : 0, w / 30);

  // 头
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, headCY, R, 0, Math.PI * 2);
  ctx.fill();

  // 头发
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.arc(0, headCY, R * 1.02, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(R * 0.1, headCY - R * 0.86);
  ctx.lineTo(R * 0.78, headCY - R * 0.42);
  ctx.lineTo(R * 0.2, headCY - R * 0.3);
  ctx.closePath();
  ctx.fill();

  drawEyes(ctx, R, headCY, p.blinking);

  ctx.strokeStyle = 'rgba(90,58,34,0.8)';
  ctx.lineWidth = Math.max(1, R * 0.08);
  ctx.beginPath();
  ctx.arc(R * 0.36, headCY + R * 0.42, R * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

module.exports = { draw: draw };
