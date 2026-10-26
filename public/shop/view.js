// 商店绘制：只负责画，不改状态。
// 内容区用 clip() 裁剪，右侧画滚动条。

const canvasKit = require('../core/canvas.js');

const BUILD = 'shop-7';

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
  maxed: 'rgba(255,255,255,0.28)',
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

// 顶部：标题（横屏高度紧张，压到左上角一行）
function drawHeader(ctx, width, state) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLOR.text;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('商店', 94, 30);

  const cx = width - 74;
  const cy = 28;

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

    ctx.lineWidth = 1.8;
    ctx.strokeStyle = on ? COLOR.accent : COLOR.cardStroke;
    ctx.stroke();

    ctx.fillStyle = on ? COLOR.text : COLOR.textDim;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label, t.x + t.w / 2, t.y + t.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

// 夹角滑块：竖向，顶部 = 最大夹角，底部 = 已购买的最小夹角
function drawSlider(ctx, row) {
  const s = row.slider;
  if (!s) return;

  const cx = s.x + s.w / 2;

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, s.y + 5);
  ctx.lineTo(cx, s.y + s.h - 5);
  ctx.stroke();

  let t = typeof row.sliderRatio === 'number' ? row.sliderRatio : 1;
  if (t < 0) t = 0;
  if (t > 1) t = 1;

  const ky = s.y + 5 + (s.h - 10) * t;

  ctx.fillStyle = COLOR.accent;
  ctx.beginPath();
  ctx.arc(cx, ky, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.lineCap = 'butt';
}

function drawSection(ctx, row) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(row.label, row.x + 2, row.y + row.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawRow(ctx, row, coins) {
  if (row.kind === 'section') {
    drawSection(ctx, row);
    return;
  }

  const maxed = !!row.maxed;
  const poor = !maxed && coins < row.cost;
  const dim = maxed || poor;

  ctx.fillStyle = maxed ? 'rgba(255,255,255,0.03)' : COLOR.card;
  roundRect(ctx, row.x, row.y, row.w, row.h, 12);
  ctx.fill();

  ctx.strokeStyle = dim ? 'rgba(255,255,255,0.10)' : COLOR.cardStroke;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  if (row.slider) drawSlider(ctx, row);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const midY = row.y + row.h / 2;
  const twoLine = row.h >= 40;
  const tx = typeof row.textX === 'number' ? row.textX : row.x + 13;

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = maxed ? COLOR.maxed : (poor ? COLOR.poor : COLOR.text);
  ctx.fillText(row.label, tx, midY - (twoLine ? 7 : 0));

  if (twoLine) {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = maxed ? 'rgba(255,255,255,0.30)' : COLOR.textDim;
    ctx.fillText(row.desc || '', tx, midY + 9);
  }

  // 满级：右侧显示「满级」，不显示价格
  if (maxed) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = 'rgba(94,224,192,0.55)';
    ctx.fillText('满级', row.x + row.w - 13, midY + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return;
  }

  const priceX = row.x + row.w - 56;

  drawCoinDot(ctx, priceX, midY, 7, poor ? 'rgba(255,211,77,0.35)' : COLOR.coin);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = poor ? COLOR.poor : COLOR.coinText;
  ctx.fillText(String(row.cost), priceX + 12, midY + 1);

  ctx.textBaseline = 'alphabetic';
}

// 右侧滚动条
function drawScrollBar(ctx, built, width) {
  const max = built.scrollMax || 0;
  if (max <= 0) return;

  const vh = built.viewH;
  const ch = built.contentH || (vh + max);

  const barW = 4;
  const barX = width - 7;
  const trackY = built.viewTop;
  const trackH = vh;

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, barX, trackY, barW, trackH, barW / 2);
  ctx.fill();

  let thumbH = trackH * (vh / ch);
  if (thumbH < 24) thumbH = 24;
  if (thumbH > trackH) thumbH = trackH;

  const t = max > 0 ? built.scroll / max : 0;
  const thumbY = trackY + (trackH - thumbH) * t;

  ctx.fillStyle = 'rgba(94,224,192,0.75)';
  roundRect(ctx, barX, thumbY, barW, thumbH, barW / 2);
  ctx.fill();
}

function drawBuildTag(ctx) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(BUILD, 14, canvasKit.height - 6);
}

function draw(ctx, state) {
  const width = canvasKit.width;
  const height = canvasKit.height;

  drawBackground(ctx, width, height);
  drawHeader(ctx, width, state);

  const built = state.built;

  if (built) {
    drawBack(ctx, built.back);
    drawTabs(ctx, built);

    // ---- 内容区：裁剪后绘制（超出的部分不显示） ----
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, built.viewTop, width, built.viewH);
    ctx.clip();

    const rows = built.rows || [];
    for (let i = 0; i < rows.length; i++) drawRow(ctx, rows[i], state.coins || 0);

    ctx.restore();

    drawScrollBar(ctx, built, width);
  }

  drawBuildTag(ctx);
}

module.exports = { draw: draw };
