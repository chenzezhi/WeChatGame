// 主界面绘制：只负责画，不改状态。
// 内容全部在 core/ui.js 的设计坐标系（960×540）里绘制，等比缩放到屏幕。

const canvasKit = require('../core/canvas.js');
const ui = require('../core/ui.js');

// 版本标记，用于确认真机跑的是哪一版
const BUILD = 'menu-5';

const COLOR = {
  bgTop: '#1e1e2e',
  bgBottom: '#14141f',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.6)',
  textFaint: 'rgba(255,255,255,0.5)',
  accent: '#5ee0c0',
  accentFill: 'rgba(94,224,192,0.16)',
  disabledFill: 'rgba(255,255,255,0.08)',
  disabledStroke: 'rgba(255,255,255,0.15)',
  disabledText: 'rgba(255,255,255,0.35)',
  coin: '#ffd34d',
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

// 背景铺满整块画布（含留边），避免出现黑边
function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, canvasKit.height);
  g.addColorStop(0, COLOR.bgTop);
  g.addColorStop(1, COLOR.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasKit.width, canvasKit.height);
}

function drawTitle(ctx) {
  const cx = ui.DESIGN_W / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLOR.text;
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('冒险之旅', cx, 84);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText('点击开始你的冒险', cx, 112);
}

// 右上角金币
function drawCoins(ctx, state) {
  const cx = ui.DESIGN_W - 96;
  const cy = 40;

  ctx.fillStyle = COLOR.coin;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx - 1.6, cy - 5, 3.2, 10);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = COLOR.coin;
  ctx.fillText(String(state.coins || 0), cx + 16, cy + 1);

  ctx.textBaseline = 'alphabetic';
}

function disabledOf(item, state) {
  return item.id === 'load' && !state.hasSave;
}

function drawButtons(ctx, state) {
  const items = state.items || [];

  for (let i = 0; i < items.length; i++) {
    const b = items[i];
    const disabled = disabledOf(b, state);

    ctx.fillStyle = disabled ? COLOR.disabledFill : COLOR.accentFill;
    roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
    ctx.fill();

    ctx.lineWidth = 2.4;
    ctx.strokeStyle = disabled ? COLOR.disabledStroke : COLOR.accent;
    ctx.stroke();

    ctx.fillStyle = disabled ? COLOR.disabledText : COLOR.text;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawFooter(ctx, state) {
  if (!state.best) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = COLOR.textFaint;
  ctx.fillText('最佳距离 ' + state.best + ' m', ui.DESIGN_W / 2, ui.DESIGN_H - 16);
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

  drawTitle(ctx);
  drawCoins(ctx, state);
  drawButtons(ctx, state);
  drawFooter(ctx, state);
  drawBuildTag(ctx);

  ui.end(ctx);
}

module.exports = { draw: draw };
