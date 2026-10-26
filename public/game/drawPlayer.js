// 玩家绘制：Q 版小人（大头 / 圆润轮廓 / 粗描边 / 大眼睛高光 / 腮红）+ 小手枪。

const cfg = require('./config.js');
const pal = require('./palette.js');
const util = require('./drawUtil.js');

const C = pal.C;
const OUT = pal.OUT;

// 带描边的圆角肢体
function limb(ctx, jx, jy, len, thick, angle, fill, out, outW) {
  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(angle);
  util.roundRectPath(ctx, -thick / 2, -thick * 0.35, thick, len + thick * 0.35, thick * 0.5);
  ctx.fillStyle = fill;
  ctx.fill();
  if (out) { ctx.strokeStyle = out; ctx.lineWidth = outW; ctx.stroke(); }
  ctx.restore();
}

// 带描边的小脚掌
function foot(ctx, jx, jy, len, thick, angle, fill, out, outW) {
  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(angle);
  util.roundRectPath(ctx, -thick * 0.62, len - thick * 0.5, thick * 1.66, thick * 0.9, thick * 0.45);
  ctx.fillStyle = fill;
  ctx.fill();
  if (out) { ctx.strokeStyle = out; ctx.lineWidth = outW; ctx.stroke(); }
  ctx.restore();
}

// 大眼睛：眼白 + 瞳孔 + 高光；眨眼时画两条弧
function drawEyes(ctx, R, headCY, blinking) {
  const eyeDX = R * 0.35;
  const eyeY = headCY + R * 0.06;
  const rx = R * 0.21;
  const ry = R * 0.26;

  if (blinking) {
    ctx.strokeStyle = C.eye;
    ctx.lineWidth = Math.max(1.8, R * 0.10);
    ctx.lineCap = 'round';

    for (let i = 0; i < 2; i++) {
      const ex = i === 0 ? -eyeDX : eyeDX;
      ctx.beginPath();
      ctx.arc(ex, eyeY + ry * 0.2, rx * 0.9, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    ctx.lineCap = 'butt';
    return;
  }

  for (let i = 0; i < 2; i++) {
    const ex = i === 0 ? -eyeDX : eyeDX;

    util.fillEllipse(ctx, ex, eyeY, rx, ry, '#ffffff');
    util.fillEllipse(ctx, ex, eyeY + ry * 0.08, rx * 0.74, ry * 0.80, C.eye);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + rx * 0.24, eyeY - ry * 0.30, Math.max(1.2, rx * 0.30), 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ex - rx * 0.26, eyeY + ry * 0.34, Math.max(0.9, rx * 0.16), 0, Math.PI * 2);
    ctx.fill();
  }
}

// 小手枪：枪口朝 +x，s = 整体缩放
function drawGun(ctx, hx, hy, angle, s, outW) {
  const lw = Math.max(1, outW / (s > 0 ? s : 1));

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.scale(s, s);

  // 握把
  util.roundRectPath(ctx, -4.5, -1.5, 8, 12, 3.4);
  ctx.fillStyle = C.gunDark;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();

  // 枪身
  util.roundRectPath(ctx, -6, -7, 18, 9, 3.6);
  ctx.fillStyle = C.gun;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();

  // 枪口
  util.roundRectPath(ctx, 11, -5.4, 7, 5.6, 2.4);
  ctx.fillStyle = C.gunDark;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();

  // 高光
  util.roundRectPath(ctx, -4, -6, 10, 2.4, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
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

  const hurt = !!(p.hurtAt && now - p.hurtAt < 220);

  util.fillEllipse(ctx, cx, cfg.GROUND_Y + 4, w * 0.48, w * 0.16, C.shadow);

  // ---- 比例（Q 版：头大、身小） ----
  const R = w * 0.60;                          // 头半径
  const outW = Math.max(1.6, R * 0.10);        // 描边宽度
  const OUTCOL = hurt ? 'rgba(255,255,255,0.92)' : OUT;

  const legW = w * 0.28;
  const legH = h * 0.16;
  const bodyW = w * 0.70;
  const bodyH = h * 0.30;
  const bodyY = -legH - bodyH;
  const armW = w * 0.21;
  const armH = h * 0.20;
  const headCY = bodyY - R * 0.52;

  const hipX = w * 0.15;
  const hipY = -legH;
  const shoulderX = bodyW * 0.44;
  const shoulderY = bodyY + bodyH * 0.34;

  // ---- 动作 ----
  const isJump = p.anim === 'jump';
  const isRun = p.anim === 'run';

  const phase = p.runPhase * Math.PI * 2;
  const swing = isRun ? Math.sin(phase) : 0;
  const bob = isRun ? Math.abs(Math.sin(phase)) * h * 0.04 : 0;

  let legL, legR, armL, armR;

  if (isJump) {
    legL = 0.50;
    legR = -0.30;
    armL = 2.30;
    armR = -2.30;
  } else {
    legL = swing * 0.60;
    legR = -swing * 0.60;
    armL = -swing * 0.50;
    armR = swing * 0.50;
  }

  const facing = p.facing >= 0 ? 1 : -1;
  const aimLocal = (typeof aimAngle === 'number')
    ? (facing >= 0 ? aimAngle : Math.PI - aimAngle)
    : null;

  if (aimLocal !== null) armR = aimLocal - Math.PI / 2;

  let handX, handY;
  if (aimLocal !== null) {
    handX = shoulderX + Math.cos(aimLocal) * armH * 0.95;
    handY = shoulderY + Math.sin(aimLocal) * armH * 0.95;
  } else {
    handX = shoulderX - Math.sin(armR) * armH * 0.95;
    handY = shoulderY + Math.cos(armR) * armH * 0.95;
  }

  // ---- 配色（受伤整体闪白） ----
  const skin = hurt ? '#ffffff' : C.skin;
  const shirt = hurt ? '#ffffff' : C.shirt;
  const pantsC = hurt ? '#ffffff' : C.pants;
  const shoeC = hurt ? '#ffffff' : C.shoe;
  const hairC = hurt ? '#ffffff' : C.hair;

  ctx.save();
  ctx.translate(cx, feetY - bob);
  ctx.scale(facing, 1);

  // 后腿 / 后臂
  limb(ctx, -hipX, hipY, legH, legW, legL, pantsC, OUTCOL, outW);
  foot(ctx, -hipX, hipY, legH, legW, legL, shoeC, OUTCOL, outW);
  limb(ctx, -shoulderX, shoulderY, armH, armW, armL, skin, OUTCOL, outW);

  // 身体
  util.roundRectPath(ctx, -bodyW / 2, bodyY, bodyW, bodyH, bodyW * 0.42);
  ctx.fillStyle = shirt;
  ctx.fill();
  ctx.strokeStyle = OUTCOL;
  ctx.lineWidth = outW;
  ctx.stroke();

  // 肚子高光
  if (!hurt) {
    util.fillEllipse(ctx, 0, bodyY + bodyH * 0.52, bodyW * 0.30, bodyH * 0.28, 'rgba(255,255,255,0.22)');
  }

  // 前腿 / 前臂
  limb(ctx, hipX, hipY, legH, legW, legR, pantsC, OUTCOL, outW);
  foot(ctx, hipX, hipY, legH, legW, legR, shoeC, OUTCOL, outW);
  limb(ctx, shoulderX, shoulderY, armH, armW, armR, skin, OUTCOL, outW);

  // 手枪
  drawGun(ctx, handX, handY, aimLocal !== null ? aimLocal : 0, w / 30, outW);

  // ---- 头 ----
  ctx.beginPath();
  ctx.arc(0, headCY, R, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = OUTCOL;
  ctx.lineWidth = outW;
  ctx.stroke();

  // 头发（上半个帽状）
  ctx.beginPath();
  ctx.arc(0, headCY, R * 0.99, Math.PI * 1.03, Math.PI * 1.97);
  ctx.closePath();
  ctx.fillStyle = hairC;
  ctx.fill();
  ctx.strokeStyle = OUTCOL;
  ctx.lineWidth = outW * 0.9;
  ctx.stroke();

  // 呆毛
  ctx.beginPath();
  ctx.moveTo(-R * 0.06, headCY - R * 0.90);
  ctx.quadraticCurveTo(R * 0.42, headCY - R * 1.30, R * 0.56, headCY - R * 0.70);
  ctx.quadraticCurveTo(R * 0.22, headCY - R * 0.92, -R * 0.06, headCY - R * 0.90);
  ctx.closePath();
  ctx.fillStyle = hairC;
  ctx.fill();
  ctx.strokeStyle = OUTCOL;
  ctx.lineWidth = outW * 0.8;
  ctx.stroke();

  // 眼睛
  drawEyes(ctx, R, headCY, p.blinking);

  // 腮红
  if (!hurt) {
    util.fillEllipse(ctx, -R * 0.60, headCY + R * 0.42, R * 0.17, R * 0.11, C.blush);
    util.fillEllipse(ctx, R * 0.60, headCY + R * 0.42, R * 0.17, R * 0.11, C.blush);
  }

  // 嘴（小猫嘴）
  ctx.strokeStyle = C.eye;
  ctx.lineWidth = Math.max(1.2, R * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-R * 0.08, headCY + R * 0.42, R * 0.12, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(R * 0.08, headCY + R * 0.42, R * 0.12, 0, Math.PI);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.restore();
}

module.exports = { draw: draw };
