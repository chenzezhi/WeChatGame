'use strict';

/* ==================== 功能 ====================
 * Shapes —— 战斗画面的纯绘图函数
 *
 * 只负责「给我坐标和尺寸，我画个形状」，不碰任何状态。
 * 全部用 Canvas 2D 原生 API（这个版本的 cax 里 Polygon 画不出来）。
 * ==============================================*/

/* ==================== 用法 ====================
 * const S = require('./shapes.js');
 * S.drawWeapon(ctx, def, cx, cy, size);
 * S.drawMonster(ctx, cx, cy, size, hpRatio, kind);
 * ==============================================*/

const COLOR = {
  bladeEdge: '#2c3440',
  guard: '#c9a14a',
  hilt: '#6b4a2a',
  monster: '#a83b3b',
  monsterDark: '#6e2222',
  monsterEye: '#fff4c9',
  campStone: '#4a4a52',
  campFlame: '#e8622a',
  campInner: '#f7d24a',
  campLog: '#7a5433',
  fightBtn: '#8b2f2f',
  refreshBtn: '#2f5d8b',
  btnText: '#ffe9c9',
  btnTextOff: '#ff6a6a',
  // 银币：白银色（不要金色）
  coin: '#d9dfe8',
  coinRim: '#8d98a8',
  coinShine: '#ffffff',
  hud: '#ffffff',
  hudBg: 'rgba(0,0,0,0.45)',
  mask: '#12121a',
  hpBack: '#3a1a1a',
  hpFill: '#e04b4b',
};

// 画一个圆角矩形路径
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

// 画一枚银币：银色底面 + 深色边 + 一点高光
// cx, cy - 圆心；r - 半径
function drawCoin(ctx, cx, cy, r) {
  // 银底
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.coin;
  ctx.fill();

  // 外圈：深一点的银灰
  ctx.lineWidth = Math.max(1, r * 0.26);
  ctx.strokeStyle = COLOR.coinRim;
  ctx.stroke();

  // 内圈：压一道浅色环，看起来像币面
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.strokeStyle = COLOR.coinRim;
  ctx.stroke();

  // 高光：左上角一小块
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.3, r * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.coinShine;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ---------------- 四种武器形状 ---------------- */

// 剑：竖刃 + 横格 + 短柄
function drawSwordShape(ctx, color, cx, cy, s) {
  const bladeW = Math.max(3, s * 0.22);
  const bladeH = s * 0.52;
  const guardW = s * 0.56;
  const guardH = Math.max(2, s * 0.1);
  const hiltW = Math.max(2, s * 0.16);
  const hiltH = s * 0.2;
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  roundRectPath(ctx, cx - bladeW / 2, top, bladeW, bladeH, bladeW * 0.3);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();

  roundRectPath(ctx, cx - guardW / 2, top + bladeH, guardW, guardH, guardH * 0.4);
  ctx.fillStyle = COLOR.guard;
  ctx.fill();
  ctx.stroke();

  roundRectPath(ctx, cx - hiltW / 2, top + bladeH + guardH, hiltW, hiltH, hiltW * 0.4);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();
}

// 斧：长柄 + 一侧厚刃
function drawAxeShape(ctx, color, cx, cy, s) {
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  // 柄
  roundRectPath(ctx, cx - s * 0.05, top, s * 0.1, s, s * 0.04);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();

  // 斧刃：梯形
  ctx.beginPath();
  ctx.moveTo(cx, top + s * 0.12);
  ctx.lineTo(cx + s * 0.42, top + s * 0.05);
  ctx.lineTo(cx + s * 0.34, top + s * 0.42);
  ctx.lineTo(cx, top + s * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
}

// 矛：细长杆 + 尖头
function drawSpearShape(ctx, color, cx, cy, s) {
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  roundRectPath(ctx, cx - s * 0.035, top + s * 0.2, s * 0.07, s * 0.8, s * 0.03);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();

  // 矛尖
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx + s * 0.12, top + s * 0.26);
  ctx.lineTo(cx, top + s * 0.34);
  ctx.lineTo(cx - s * 0.12, top + s * 0.26);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
}

// 杖：杆 + 圆形法球
function drawStaffShape(ctx, color, cx, cy, s) {
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  roundRectPath(ctx, cx - s * 0.04, top + s * 0.22, s * 0.08, s * 0.78, s * 0.03);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, top + s * 0.16, s * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
}

// 旋刃：三叶飞刀，绕中心转
function drawSpinShape(ctx, color, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);

  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 3);

    ctx.beginPath();
    ctx.moveTo(0, -s * 0.1);
    ctx.lineTo(s * 0.46, -s * 0.3);
    ctx.lineTo(s * 0.2, s * 0.05);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.strokeStyle = COLOR.bladeEdge;
    ctx.stroke();

    ctx.restore();
  }

  // 轴心
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.guard;
  ctx.fill();

  ctx.restore();
}

// 爱心：加耐久卡用
function drawHeartShape(ctx, color, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.42);
  ctx.bezierCurveTo(cx - s * 0.75, cy - s * 0.12, cx - s * 0.34, cy - s * 0.6, cx, cy - s * 0.2);
  ctx.bezierCurveTo(cx + s * 0.34, cy - s * 0.6, cx + s * 0.75, cy - s * 0.12, cx, cy + s * 0.42);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// 闪电：加速卡用
function drawBoltShape(ctx, color, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.12, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.5);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.03, cy - s * 0.1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// 在格子右下角写一个小标签（×2 / +4 这种）
// text - 要写的字
// x, y - 右下角坐标
// size - 字号，单位 px
function drawBadge(ctx, text, x, y, size) {
  ctx.font = 'bold ' + Math.round(size) + 'px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';

  // 先描一圈暗边，保证任何背景上都看得清
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(text, x, y);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

// 一张卡右下角该显示什么数字
// def - 卡牌表里的一行
// 返回字符串，不显示时返回空串
function badgeTextOf(def) {
  if (!def) return '';

  if (def.kind === 'heal' || def.type === 'heal') return '+' + (def.heal || 0);
  if (def.kind === 'speed' || def.type === 'speed') return '×' + (def.speedMul || 0);
  return '×' + (def.shots || 1);
}

// 按武器表里的 kind 分发
// def - 卡牌表里的一行（含 kind / color）
function drawWeapon(ctx, def, cx, cy, s) {
  const kind = def.kind || 'sword';
  const color = def.color || '#d8dee8';

  // 满级（5 级）发光：用 shadow 在轮廓外打一层同色光晕
  const isMax = Number(def.level) >= 5;

  if (isMax) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = s * 0.45;
  }

  if (kind === 'spin') drawSpinShape(ctx, color, cx, cy, s);
  else if (kind === 'heal') drawHeartShape(ctx, color, cx, cy, s * 0.9);
  else if (kind === 'speed') drawBoltShape(ctx, color, cx, cy, s * 0.9);
  else if (kind === 'axe') drawAxeShape(ctx, color, cx, cy, s);
  else if (kind === 'spear') drawSpearShape(ctx, color, cx, cy, s);
  else if (kind === 'staff') drawStaffShape(ctx, color, cx, cy, s);
  else drawSwordShape(ctx, color, cx, cy, s);

  if (isMax) ctx.restore();
}

// 带旋转的武器：绕自身中心转
// angle - 弧度，0 表示朝右；图形本身是朝上的，所以加 90°
function drawWeaponAimed(ctx, def, cx, cy, s, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle || 0) + Math.PI / 2);
  drawWeapon(ctx, def, 0, 0, s);
  ctx.restore();
}

/* ---------------- 怪物 / 篝火 ---------------- */

// 小怪：圆身子 + 角 + 眼睛 + 嘴 + 血条
// kind - 用来区分颜色深浅
function drawMonster(ctx, cx, cy, s, hpRatio, kind) {
  const r = s * 0.34;
  const body = kind === 'boss' ? '#7a2a8f' : kind === 'elite' ? '#a85f1f' : COLOR.monster;
  const dark = kind === 'boss' ? '#4a1550' : kind === 'elite' ? '#6b3a0f' : COLOR.monsterDark;

  // 角
  ctx.fillStyle = dark;
  for (let i = 0; i < 2; i++) {
    const dir = i === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + dir * r * 0.55, cy - r * 0.75);
    ctx.lineTo(cx + dir * r * 1.05, cy - r * 1.35);
    ctx.lineTo(cx + dir * r * 0.95, cy - r * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  // 身子
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.strokeStyle = dark;
  ctx.stroke();

  // 眼睛
  const eyeR = Math.max(2, r * 0.26);
  for (let i = 0; i < 2; i++) {
    const ex = cx + (i === 0 ? -r * 0.36 : r * 0.36);
    ctx.beginPath();
    ctx.arc(ex, cy - r * 0.1, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.monsterEye;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex, cy - r * 0.05, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();
  }

  // 嘴
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.42, r * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  ctx.lineWidth = Math.max(1.2, s * 0.04);
  ctx.strokeStyle = dark;
  ctx.stroke();

  // 血条
  if (hpRatio < 1) {
    const bw = s * 0.8;
    const bh = Math.max(3, s * 0.08);
    const bx = cx - bw / 2;
    const by = cy - r - bh * 3;
    ctx.fillStyle = COLOR.hpBack;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = COLOR.hpFill;
    ctx.fillRect(bx, by, bw * Math.max(0, hpRatio), bh);
  }
}

// 篝火：交叉柴火 + 围石 + 两层火苗
// frame - 0~3，火苗的跳动帧（几帧循环看起来就在烧）
function drawCampfire(ctx, cx, cy, s, frame) {
  const f = frame || 0;

  // 火苗每帧的形态：左右轻摆 + 高低起伏
  const sway = [0, 0.05, 0, -0.05][f];
  const tall = [1, 1.07, 1.13, 1.05][f];
  const wide = [1, 1.04, 0.97, 1.02][f];

  // 柴火
  ctx.save();
  ctx.translate(cx, cy + s * 0.3);
  ctx.fillStyle = COLOR.campLog;
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.rotate((i === 0 ? -1 : 1) * 0.35);
    roundRectPath(ctx, -s * 0.34, -s * 0.06, s * 0.68, s * 0.12, s * 0.05);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 围石
  ctx.fillStyle = COLOR.campStone;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * s * 0.34, cy + s * 0.28 + Math.sin(a) * s * 0.1, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // 外焰（带帧摆动）
  const topY = cy - s * 0.5 * tall;
  const swing = s * sway;

  ctx.beginPath();
  ctx.moveTo(cx + swing, topY);
  ctx.quadraticCurveTo(cx + s * 0.3 * wide, cy - s * 0.05, cx + s * 0.16, cy + s * 0.22);
  ctx.quadraticCurveTo(cx, cy + s * 0.3, cx - s * 0.16, cy + s * 0.22);
  ctx.quadraticCurveTo(cx - s * 0.3 * wide, cy - s * 0.05, cx + swing, topY);
  ctx.closePath();
  ctx.fillStyle = COLOR.campFlame;
  ctx.fill();

  // 内焰
  const inTop = cy - s * 0.2 * tall;
  ctx.beginPath();
  ctx.moveTo(cx + swing * 0.6, inTop);
  ctx.quadraticCurveTo(cx + s * 0.14 * wide, cy + s * 0.02, cx + s * 0.08, cy + s * 0.18);
  ctx.quadraticCurveTo(cx, cy + s * 0.24, cx - s * 0.08, cy + s * 0.18);
  ctx.quadraticCurveTo(cx - s * 0.14 * wide, cy + s * 0.02, cx + swing * 0.6, inTop);
  ctx.closePath();
  ctx.fillStyle = COLOR.campInner;
  ctx.fill();
}


module.exports = {
  COLOR: COLOR,
  roundRectPath: roundRectPath,
  drawCoin: drawCoin,
  drawSwordShape: drawSwordShape,
  drawAxeShape: drawAxeShape,
  drawSpearShape: drawSpearShape,
  drawStaffShape: drawStaffShape,
  drawSpinShape: drawSpinShape,
  drawHeartShape: drawHeartShape,
  drawBoltShape: drawBoltShape,
  drawWeapon: drawWeapon,
  drawWeaponAimed: drawWeaponAimed,
  drawMonster: drawMonster,
  drawCampfire: drawCampfire,
  drawBadge: drawBadge,
  badgeTextOf: badgeTextOf,
};
