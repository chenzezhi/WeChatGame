// 设置界面绘制：只负责画，不改状态。
// 全部在设计坐标系（960×540）内绘制，等比缩放到屏幕。

const ui = require('../core/ui.js');
const canvasKit = require('../core/canvas.js');

const BUILD = 'settings-2';

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

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, canvasKit.height);
  g.addColorStop(0, COLOR.bgTop);
  g.addColorStop(1, COLOR.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasKit.width, canvasKit.height);
}

function drawHeader(ctx) {
  const cx = ui.DESIGN_W / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLOR.text;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('设置', cx, 78);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText('音乐 / 音效开关 · 重置游戏数据', cx, 104);
}

function drawBack(ctx, back) {
  if (!back) return;

  ctx.fillStyle = COLOR.card;
  roundRect(ctx, back.x, back.y, back.w, back.h, back.h / 2);
  ctx.fill();

  ctx.strokeStyle = COLOR.cardStroke;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = COLOR.text;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('返回', back.x + back.w / 2, back.y + back.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawToggle(ctx, row, on) {
  const tw = 64;
  const th = 34;
  const tx = row.x + row.w - tw - 20;
  const ty = row.y + (row.h - th) / 2;

  ctx.fillStyle = on ? COLOR.accent : COLOR.trackOff;
  roundRect(ctx, tx, ty, tw, th, th / 2);
  ctx.fill();

  const kr = th / 2 - 4;
  const kx = on ? tx + tw - kr - 4 : tx + kr + 4;
  const ky = ty + th / 2;

  ctx.fillStyle = COLOR.knob;
  ctx.beginPath();
  ctx.arc(kx, ky, kr, 0, Math.PI * 2);
  ctx.fill();
}

function drawToggleRow(ctx, row, on, sub) {
  ctx.fillStyle = COLOR.card;
  roundRect(ctx, row.x, row.y, row.w, row.h, 18);
  ctx.fill();

  ctx.strokeStyle = COLOR.cardStroke;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const midY = row.y + row.h / 2;

  ctx.font = 'bold 19px sans-serif';
  ctx.fillStyle = COLOR.text;
  ctx.fillText(row.label, row.x + 22, midY - 9);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText(on ? sub[0] : sub[1], row.x + 22, midY + 13);

  drawToggle(ctx, row, on);

  ctx.textBaseline = 'alphabetic';
}

function drawResetRow(ctx, row) {
  ctx.fillStyle = COLOR.dangerFill;
  roundRect(ctx, row.x, row.y, row.w, row.h, 18);
  ctx.fill();

  ctx.strokeStyle = COLOR.danger;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLOR.danger;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(row.label, row.x + row.w / 2, row.y + row.h / 2 + 1);

  ctx.textBaseline = 'alphabetic';
}

function drawBuildTag(ctx) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(BUILD, 12, ui.DESIGN_H - 10);
}

function draw(ctx, state) {
  drawBackground(ctx);

  ui.begin(ctx);

  drawHeader(ctx);

  const b = state.built;

  if (b) {
    drawBack(ctx, b.back);

    drawToggleRow(ctx, b.music, !!state.musicOn, ['已开启 · 点击关闭', '已关闭 · 点击开启']);
    drawToggleRow(ctx, b.sfx, !!state.sfxOn, ['已开启 · 点击关闭', '已关闭 · 点击开启']);

    drawResetRow(ctx, b.reset);
  }

  drawBuildTag(ctx);

  ui.end(ctx);
}

module.exports = { draw: draw };
