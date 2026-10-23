// 分身绘制：复用玩家绘制（外观一致），外加青色光圈 + 头顶小血条。

const cfg = require('./config.js');
const util = require('./drawUtil.js');
const drawPlayer = require('./drawPlayer.js');

const GLOW = 'rgba(120,220,255,0.45)';
const HP_FILL = '#7fe0ff';

function drawHpBar(ctx, c, cameraX) {
  const x = c.x - cameraX + c.w * 0.12;
  const w = c.w * 0.76;
  const h = 4;
  const y = c.y - 10;
  const ratio = c.maxHp > 0 ? Math.max(0, c.hp) / c.maxHp : 0;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  util.roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle = HP_FILL;
    util.roundRectPath(ctx, x, y, w * ratio, h, h / 2);
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

    drawHpBar(ctx, c, cameraX);
  }
}

module.exports = { draw: draw };
