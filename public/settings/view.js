// 设置界面绘制：只负责画，不改状态。

const canvasKit = require('../core/canvas.js');

const BUILD = 'settings-1';

const COLOR = {
  bgTop: '#1e1e2e',
  bgBottom: '#14141f',
  card: 'rgba(255,255,255,0.06)',
  cardStroke: 'rgba(255,255,255,0.16)',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.6)',
  accent: '#5ee0c0',
  trackOff: 'rgba(255,255,255,0.18)',
  knob: '#ffffff',
  danger: '#ff6b6b',
  dangerFill: 'rgba(255,107,107,0.14)',
};

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
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

function drawBackground(ctx, width, height) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, COLOR.bgTop);
  g.addColorStop(1, COLOR.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawHeader(ctx, width, height) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLOR.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('设置', width / 2, height * 0.19);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText('音乐 / 音效开关 · 重置游戏数据', width / 2, height * 0.19 + 22);
}

function drawBack(ctx, back) {
  if (!back) return;

  ctx.fillStyle = COLOR.card;
  roundRect(ctx, back.x, back.y, back.w, back.h, back.h / 2);
  ctx.fill();

  ctx.strokeStyle = COLOR.cardStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = COLOR.text;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('返回', back.x + back.w / 2, back.y + back.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

// 开关
function drawToggle(ctx, row, on) {
  const tw = 52;
  const th = 28;
  const tx = row.x + row.w - tw - 16;
  const ty = row.y + (row.h - th) / 2;

  ctx.fillStyle = on ? COLOR.accent : COLOR.trackOff;
  roundRect(ctx, tx, ty, tw, th, th / 2);
  ctx.fill();

  const kr = th / 2 - 3;
  const kx = on ? tx + tw - kr - 3 : tx + kr + 3;
  const ky = ty + th / 2;

  ctx.fillStyle = COLOR.knob;
  ctx.beginPath();
  ctx.arc(kx, ky, kr, 0, Math.PI * 2);
  ctx.fill();
}

function drawToggleRow(ctx, row, on, sub) {
  ctx.fillStyle = COLOR.card;
  roundRect(ctx, row.x, row.y, row.w, row.h, 16);
  ctx.fill();

  ctx.strokeStyle = COLOR.cardStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const midY = row.y + row.h / 2;

  ctx.font = 'bold 17px sans-serif';
  ctx.fillStyle = COLOR.text;
  ctx.fillText(row.label, row.x + 18, midY - 8);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText(on ? sub[0] : sub[1], row.x + 18, midY + 12);

  drawToggle(ctx, row, on);

  ctx.textBaseline = 'alphabetic';
}

function drawResetRow(ctx, row) {
  ctx.fillStyle = COLOR.dangerFill;
  roundRect(ctx, row.x, row.y, row.w, row.h, 16);
  ctx.fill();

  ctx.strokeStyle = COLOR.danger;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLOR.danger;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(row.label, row.x + row.w / 2, row.y + row.h / 2 + 1);

  ctx.textBaseline = 'alphabetic';
}

function drawBuildTag(ctx) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(BUILD, 14, canvasKit.height - 10);
}

function draw(ctx, state) {
  const width = canvasKit.width;
  const height = canvasKit.height;

  drawBackground(ctx, width, height);
  drawHeader(ctx, width, height);

  const b = state.built;

  if (b) {
    drawBack(ctx, b.back);

    drawToggleRow(ctx, b.music, !!state.musicOn, ['已开启 · 点击关闭', '已关闭 · 点击开启']);
    drawToggleRow(ctx, b.sfx, !!state.sfxOn, ['已开启 · 点击关闭', '已关闭 · 点击开启']);

    drawResetRow(ctx, b.reset);
  }

  drawBuildTag(ctx);
}

module.exports = { draw: draw };
