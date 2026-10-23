// 主界面绘制：只负责画，不改状态。

const canvasKit = require('../core/canvas.js');

// 版本标记，用于确认真机跑的是哪一版
const BUILD = 'menu-2';

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

function drawTitle(ctx, width, height) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLOR.text;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('弹跳小球', width / 2, height * 0.24);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText('按住屏幕左右滑动，挡板跟着移动', width / 2, height * 0.24 + 32);
}

// 右上角金币
function drawCoins(ctx, width, state) {
  const cx = width - 78;
  const cy = 32;

  ctx.fillStyle = COLOR.coin;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx - 1.4, cy - 4.5, 2.8, 9);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = COLOR.coin;
  ctx.fillText(String(state.coins || 0), cx + 14, cy + 1);

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

    ctx.lineWidth = 2;
    ctx.strokeStyle = disabled ? COLOR.disabledStroke : COLOR.accent;
    ctx.stroke();

    ctx.fillStyle = disabled ? COLOR.disabledText : COLOR.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawFooter(ctx, width, height, state) {
  if (!state.best) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = COLOR.textFaint;
  ctx.fillText('最佳距离 ' + state.best + ' m', width / 2, height * 0.92);
}

function drawBuildTag(ctx) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(BUILD, 10, canvasKit.height - 10);
}

function draw(ctx, state) {
  const width = canvasKit.width;
  const height = canvasKit.height;

  drawBackground(ctx, width, height);
  drawTitle(ctx, width, height);
  drawCoins(ctx, width, state);
  drawButtons(ctx, state);
  drawFooter(ctx, width, height, state);
  drawBuildTag(ctx);
}

module.exports = { draw: draw };
