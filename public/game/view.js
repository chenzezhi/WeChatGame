// 绘制总入口：背景 + 敌人 + 道具 + 子弹 + 分身 + 玩家 + HUD。
// 具体人物 / 敌人 / 特效分别在同目录的 draw*.js 里。

const cfg = require('./config.js');
const pal = require('./palette.js');
const util = require('./drawUtil.js');
const drawPlayer = require('./drawPlayer.js');
const drawEnemy = require('./drawEnemy.js');
const drawFx = require('./drawFx.js');
const drawPickup = require('./drawPickup.js');
const drawClone = require('./drawClone.js');

const C = pal.C;
const BUILD = 'game-9';

// ---------------------------------------------------------------- 背景
const CLOUD_SPAN = 1500;
const CLOUDS = [];
(function buildClouds() {
  let x = 60;
  let i = 0;
  while (i < 9) {
    CLOUDS.push({ x: x % CLOUD_SPAN, y: 34 + (i % 3) * 44, s: 0.7 + (i % 4) * 0.16 });
    x += 150 + (i % 5) * 55;
    i++;
  }
})();

function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, cfg.GROUND_Y);
  g.addColorStop(0, C.skyTop);
  g.addColorStop(1, C.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cfg.WIDTH, cfg.GROUND_Y + 2);
}

function puffyCloud(ctx, x, y, s) {
  ctx.fillStyle = C.cloud;
  ctx.beginPath();
  ctx.arc(x, y, 20 * s, 0, Math.PI * 2);
  ctx.arc(x + 22 * s, y + 6 * s, 15 * s, 0, Math.PI * 2);
  ctx.arc(x - 22 * s, y + 7 * s, 14 * s, 0, Math.PI * 2);
  ctx.arc(x + 4 * s, y - 12 * s, 15 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, cameraX) {
  const shift = (cameraX * 0.15) % CLOUD_SPAN;

  for (let k = -1; k <= 1; k++) {
    for (let i = 0; i < CLOUDS.length; i++) {
      const c = CLOUDS[i];
      const x = c.x - shift + k * CLOUD_SPAN;
      if (x < -80 || x > cfg.WIDTH + 80) continue;
      puffyCloud(ctx, x, c.y, c.s);
    }
  }
}

function drawHills(ctx, cameraX, factor, color, baseY, radius, spacing) {
  let shift = (cameraX * factor) % spacing;
  if (shift < 0) shift += spacing;

  ctx.fillStyle = color;

  let x = -spacing - shift;
  while (x < cfg.WIDTH + spacing) {
    ctx.beginPath();
    ctx.arc(x, baseY, radius, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    x += spacing;
  }
}

function drawTrees(ctx, cameraX) {
  const spacing = 230;

  let shift = (cameraX * 0.5) % spacing;
  if (shift < 0) shift += spacing;

  let x = -spacing - shift;
  let i = 0;

  while (x < cfg.WIDTH + spacing) {
    const baseY = cfg.GROUND_Y;
    const th = 46 + (i % 3) * 12;

    ctx.fillStyle = C.treeTrunk;
    ctx.fillRect(x - 4, baseY - th * 0.55, 8, th * 0.55);

    ctx.fillStyle = C.treeLeaf;
    ctx.beginPath();
    ctx.arc(x, baseY - th * 0.55, th * 0.42, 0, Math.PI * 2);
    ctx.arc(x - th * 0.24, baseY - th * 0.38, th * 0.3, 0, Math.PI * 2);
    ctx.arc(x + th * 0.24, baseY - th * 0.38, th * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.treeLeafDark;
    ctx.beginPath();
    ctx.arc(x + th * 0.12, baseY - th * 0.42, th * 0.24, 0, Math.PI * 2);
    ctx.fill();

    x += spacing;
    i++;
  }
}

function drawGround(ctx, cameraX) {
  const y = cfg.GROUND_Y;

  ctx.fillStyle = C.grass;
  ctx.fillRect(0, y, cfg.WIDTH, 14);

  ctx.fillStyle = C.grassDark;
  ctx.fillRect(0, y + 14, cfg.WIDTH, 6);

  const g = ctx.createLinearGradient(0, y + 20, 0, cfg.HEIGHT);
  g.addColorStop(0, C.soilTop);
  g.addColorStop(1, C.soilBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, y + 20, cfg.WIDTH, cfg.HEIGHT - y - 20);

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  const step = 46;
  let shift = cameraX % step;
  if (shift < 0) shift += step;

  let x = -shift;
  while (x < cfg.WIDTH + step) {
    ctx.fillRect(x, y + 2, 18, 4);
    x += step;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  const step2 = 92;
  let shift2 = cameraX % step2;
  if (shift2 < 0) shift2 += step2;

  let x2 = -shift2;
  while (x2 < cfg.WIDTH + step2) {
    ctx.fillRect(x2, y + 42, 26, 8);
    ctx.fillRect(x2 + 34, y + 72, 18, 6);
    x2 += step2;
  }
}

// ---------------------------------------------------------------- 爱心路径
function heartPath(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.78);
  ctx.bezierCurveTo(cx - r * 1.25, cy - r * 0.05, cx - r * 0.75, cy - r * 1.05, cx, cy - r * 0.38);
  ctx.bezierCurveTo(cx + r * 0.75, cy - r * 1.05, cx + r * 1.25, cy - r * 0.05, cx, cy + r * 0.78);
  ctx.closePath();
}

// ---------------------------------------------------------------- HUD
// 血量：一颗红心 + 旁边放大的数字
function drawHp(ctx, player) {
  if (!player) return;

  const hp = Math.max(0, player.hp);
  const num = String(hp);

  const r = 11;
  const x0 = 16;
  const cy = 38;
  const font = 'bold 26px sans-serif';

  ctx.font = font;
  const tw = ctx.measureText(num).width;

  const pillX = x0 - 8;
  const pillY = cy - 23;
  const pillW = r * 2 + 12 + tw + 16;
  const pillH = 46;

  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  util.roundRectPath(ctx, pillX, pillY, pillW, pillH, 15);
  ctx.fill();

  // 红心
  const hx = x0 + r;
  ctx.fillStyle = C.hpPip;
  heartPath(ctx, hx, cy, r);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  heartPath(ctx, hx - r * 0.28, cy - r * 0.34, r * 0.34);
  ctx.fill();

  // 数字（放大）
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.hudText;
  ctx.font = font;
  ctx.fillText(num, x0 + r * 2 + 12, cy + 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
}

function drawHud(ctx, state) {
  drawHp(ctx, state.player);

  const w = 112;
  const h = 36;
  const x = (cfg.WIDTH - w) / 2;

  ctx.fillStyle = C.hudBg;
  util.roundRectPath(ctx, x, 22, w, h, h / 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(state.distance + ' m', cfg.WIDTH / 2, 22 + h / 2 + 1);

  if (state.best > 0) {
    ctx.textAlign = 'right';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(29,58,82,0.75)';
    ctx.fillText('最佳 ' + state.best + ' m', cfg.WIDTH - 14, 40);
  }

  ctx.textAlign = 'center';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(29,58,82,0.55)';
  ctx.fillText('左下摇杆移动（上推跳跃） · 按住其它位置射击', cfg.WIDTH / 2, cfg.HEIGHT - 16);

  // 左下角：版本号（小字体）
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(29,58,82,0.55)';
  ctx.fillText(BUILD, 10, cfg.HEIGHT - 6);
}

function drawHurtFlash(ctx, player, now) {
  if (!player || !player.hurtAt || now - player.hurtAt > 220) return;

  const a = 1 - (now - player.hurtAt) / 220;
  ctx.strokeStyle = 'rgba(255,60,60,' + (0.55 * a).toFixed(3) + ')';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, cfg.WIDTH, cfg.HEIGHT);
}

function drawDead(ctx, state, now) {
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0, 0, cfg.WIDTH, cfg.HEIGHT);

  const pulse = 1 + Math.sin((now - state.deadAt) / 260) * 0.02;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(30 * pulse) + 'px sans-serif';
  ctx.fillText('被击倒了', cfg.WIDTH / 2, cfg.HEIGHT * 0.36);

  ctx.font = '18px sans-serif';
  ctx.fillText('本局 ' + state.distance + ' m', cfg.WIDTH / 2, cfg.HEIGHT * 0.36 + 44);

  if (state.best > 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('最佳 ' + state.best + ' m', cfg.WIDTH / 2, cfg.HEIGHT * 0.36 + 74);
  }

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('点击屏幕返回主菜单', cfg.WIDTH / 2, cfg.HEIGHT * 0.36 + 118);

  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(BUILD, cfg.WIDTH / 2, cfg.HEIGHT - 12);

  ctx.textBaseline = 'alphabetic';
}

// ---------------------------------------------------------------- 总入口
function draw(ctx, state, now) {
  const cameraX = state.cameraX || 0;

  drawSky(ctx);
  drawClouds(ctx, cameraX);
  drawHills(ctx, cameraX, 0.25, C.hillFar, cfg.GROUND_Y + 10, 150, 210);
  drawHills(ctx, cameraX, 0.4, C.hillMid, cfg.GROUND_Y + 14, 110, 170);
  drawTrees(ctx, cameraX);
  drawGround(ctx, cameraX);

  drawEnemy.draw(ctx, state.enemies, cameraX, now);
  drawPickup.draw(ctx, state.pickups, cameraX, now);

  drawFx.drawBullets(ctx, state.eBullets, cameraX, pal.ENEMY_BULLET);
  drawFx.drawBullets(ctx, state.bullets, cameraX, pal.PLAYER_BULLET);

  drawClone.draw(ctx, state.clones, cameraX, now);

  if (state.player) {
    drawPlayer.draw(ctx, state.player, cameraX, state.aim ? state.aimAngle : null, now);
  }

  drawFx.drawAim(ctx, state.aim, now);
  drawFx.drawJoystick(ctx, state.joy);

  drawHud(ctx, state);
  drawHurtFlash(ctx, state.player, now);

  if (state.phase === 'dead') drawDead(ctx, state, now);
}

module.exports = { draw: draw };
