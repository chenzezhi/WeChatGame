// 分身绘制：复用玩家绘制（外观一致），外加青色光圈 + 头顶血条 + 存活时间条。

const cfg = require('./config.js');
const util = require('./drawUtil.js');
const drawPlayer = require('./drawPlayer.js');

const GLOW = 'rgba(120,220,255,0.45)';
const HP_FILL = '#7fe0ff';
const LIFE_FILL = '#ffd34d';
const LIFE_BG = 'rgba(0,0,0,0.25)';

function drawHpBar(ctx, c, cameraX, y) {
  const x = c.x - cameraX + c.w * 0.12;
  const w = c.w * 0.76;
  const h = 4;
  const ratio = c.maxHp > 0 ? Math.max(0, c.hp) / c.maxHp : 0;

  ctx.fillStyle = LIFE_BG;
  util.roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle = HP_FILL;
    util.roundRectPath(ctx, x, y, w * ratio, h, h / 2);
    ctx.fill();
  }
}

// 存活时间条：只有倒计时分身才画
function drawLifeBar(ctx, c, cameraX, now, y) {
  if (!c.lifeUntil || c.lifeTotal <= 0) return;

  const left = c.lifeUntil - now;
  if (left <= 0) return;

  let ratio = left / c.lifeTotal;
  if (ratio > 1) ratio = 1;
  if (ratio < 0) ratio = 0;

  const x = c.x - cameraX + c.w * 0.12;
  const w = c.w * 0.76;
  const h = 3;

  ctx.fillStyle = LIFE_BG;
  util.roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle = LIFE_FILL;
    util.roundRectPath(ctx, x, y, Math.max(2, w * ratio), h, h / 2);
    ctx.fill();
  }
}

function draw(ctx, level, cameraX, now) {
  const list = (level && level.list) || [];

  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (!c.alive) continue;

    const sx = c.x - cameraX;
    if (sx + c.w < -60 || sx > cfg.WIDTH + 60) continue;

    util.fillEllipse(ctx, sx + c.w / 2, c.y + c.h + 3, c.w * 0.52, c.w * 0.19, GLOW);

    ctx.save();
    ctx.globalAlpha = 0.92;
    drawPlayer.draw(ctx, c, cameraX, c.aimAngle, now);
    ctx.restore();

    drawHpBar(ctx, c, cameraX, c.y - 12);
    drawLifeBar(ctx, c, cameraX, now, c.y - 6);
  }
}

module.exports = { draw: draw };
