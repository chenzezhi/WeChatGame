// 商店绘制：只负责画，不改状态。

const canvasKit = require('../core/canvas.js');

const BUILD = 'shop-2';

const COLOR = {
  bgTop: '#1e1e2e',
  bgBottom: '#14141f',
  card: 'rgba(255,255,255,0.06)',
  cardStroke: 'rgba(255,255,255,0.16)',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.6)',
  accent: '#5ee0c0',
  accentFill: 'rgba(94,224,192,0.16)',
  coin: '#ffd34d',
  coinText: '#ffd34d',
  poor: 'rgba(255,255,255,0.35)',
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

function drawCoinDot(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx - r * 0.16, cy - r * 0.5, r * 0.32, r * 1.0);
}

function drawBackground(ctx, width, height) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, COLOR.bgTop);
  g.addColorStop(1, COLOR.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawHeader(ctx, width, height, state) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLOR.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('商店', width / 2, height * 0.10);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText('分身升级费用是主体的 2 倍 · 道具仅本局有效', width / 2, height * 0.10 + 20);

  // 金币
  const cx = width - 74;
  const cy = 30;

  drawCoinDot(ctx, cx, cy, 9, COLOR.coin);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = COLOR.coinText;
  ctx.fillText(String(state.coins || 0), cx + 14, cy + 1);

  ctx.textBaseline = 'alphabetic';
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

function drawTabs(ctx, built) {
  const tabs = (built && built.tabs) || [];
  const active = (built && built.tab) || 'player';

  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    const on = t.id === active;

    ctx.fillStyle = on ? COLOR.accentFill : COLOR.card;
    roundRect(ctx, t.x, t.y, t.w, t.h, t.h / 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = on ? COLOR.accent : COLOR.cardStroke;
    ctx.stroke();

    ctx.fillStyle = on ? COLOR.text : COLOR.textDim;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label, t.x + t.w / 2, t.y + t.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawRow(ctx, row, coins) {
  const poor = coins < row.cost;

  ctx.fillStyle = COLOR.card;
  roundRect(ctx, row.x, row.y, row.w, row.h, 14);
  ctx.fill();

  ctx.strokeStyle = poor ? 'rgba(255,255,255,0.10)' : COLOR.cardStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const midY = row.y + row.h / 2;
  const twoLine = row.h > 46;

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = poor ? COLOR.poor : COLOR.text;
  ctx.fillText(row.label, row.x + 14, midY - (twoLine ? 8 : 0));

  if (twoLine) {
    const sub = (row.kind === 'item')
      ? (row.desc + (row.own > 0 ? ' · 已有 ' + row.own : ''))
      : (row.desc + ' · Lv.' + row.level);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = COLOR.textDim;
    ctx.fillText(sub, row.x + 14, midY + 10);
  }

  // 右侧：价格
  const priceX = row.x + row.w - 58;

  drawCoinDot(ctx, priceX, midY, 8, poor ? 'rgba(255,211,77,0.35)' : COLOR.coin);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = poor ? COLOR.poor : COLOR.coinText;
  ctx.fillText(String(row.cost), priceX + 13, midY + 1);

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
  drawHeader(ctx, width, height, state);

  const built = state.built;
  if (built) {
    drawBack(ctx, built.back);
    drawTabs(ctx, built);

    const rows = built.rows || [];
    for (let i = 0; i < rows.length; i++) drawRow(ctx, rows[i], state.coins || 0);
  }

  drawBuildTag(ctx);
}

module.exports = { draw: draw };
