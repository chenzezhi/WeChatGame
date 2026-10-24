// 绘制总入口：背景 + 敌人 + 道具 + 子弹 + 分身 + 玩家 + 护盾/变大光环 + 摇杆 + 自动开火 + HUD。

const cfg = require('./config.js');
const pal = require('./palette.js');
const util = require('./drawUtil.js');
const drawPlayer = require('./drawPlayer.js');
const drawEnemy = require('./drawEnemy.js');
const drawFx = require('./drawFx.js');
const drawPickup = require('./drawPickup.js');
const drawClone = require('./drawClone.js');
const activeKit = require('./active.js');
const autoKit = require('./autofire.js');

const C = pal.C;
const BUILD = 'game-22';

const XP_FILL = '#ffcf4d';
const ICON_DARK = '#1d3a52';
const ICON_DAMAGE = '#e2551a';
const ICON_AMMO = '#1f6fd0';
const ICON_AMMO_EMPTY = '#c0392b';
const ICON_SHIELD = '#1f9ecf';
const ICON_GROW = '#b45ad6';

// ---------------- 背景 ----------------
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

// ---------------- 图标 ----------------
function heartPath(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.78);
  ctx.bezierCurveTo(cx - r * 1.25, cy - r * 0.05, cx - r * 0.75, cy - r * 1.05, cx, cy - r * 0.38);
  ctx.bezierCurveTo(cx + r * 0.75, cy - r * 1.05, cx + r * 1.25, cy - r * 0.05, cx, cy + r * 0.78);
  ctx.closePath();
}

function iconCoin(ctx, cx, cy, r) {
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(cx - r * 0.14, cy - r * 0.45, r * 0.28, r * 0.9);
}

function iconClone(ctx, cx, cy, r) {
  ctx.fillStyle = ICON_DARK;

  ctx.beginPath();
  ctx.arc(cx - r * 0.32, cy - r * 0.30, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  util.roundRectPath(ctx, cx - r * 0.62, cy + r * 0.02, r * 0.60, r * 0.72, r * 0.24);
  ctx.fill();

  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(cx + r * 0.38, cy - r * 0.12, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  util.roundRectPath(ctx, cx + r * 0.14, cy + r * 0.16, r * 0.48, r * 0.58, r * 0.2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function iconSpeed(ctx, cx, cy, r) {
  ctx.fillStyle = ICON_DARK;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.20, cy - r * 0.85);
  ctx.lineTo(cx - r * 0.55, cy + r * 0.10);
  ctx.lineTo(cx - r * 0.05, cy + r * 0.10);
  ctx.lineTo(cx - r * 0.20, cy + r * 0.85);
  ctx.lineTo(cx + r * 0.58, cy - r * 0.15);
  ctx.lineTo(cx + r * 0.05, cy - r * 0.15);
  ctx.closePath();
  ctx.fill();
}

function iconBullet(ctx, cx, cy, r) {
  ctx.fillStyle = ICON_DARK;
  const offs = [-r * 0.55, 0, r * 0.55];

  for (let i = 0; i < 3; i++) {
    const bx = cx + offs[i];
    util.roundRectPath(ctx, bx - r * 0.16, cy - r * 0.34, r * 0.32, r * 0.76, r * 0.16);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, cy - r * 0.36, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function iconDamage(ctx, cx, cy, r) {
  ctx.fillStyle = ICON_DAMAGE;
  ctx.beginPath();

  for (let i = 0; i < 12; i++) {
    const rad = (i % 2 === 0) ? r * 0.92 : r * 0.40;
    const ang = (Math.PI / 6) * i - Math.PI / 2;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();
}

// 弹夹图标：一颗子弹
function iconAmmo(ctx, cx, cy, r, color) {
  ctx.fillStyle = color || ICON_AMMO;

  util.roundRectPath(ctx, cx - r * 0.26, cy - r * 0.10, r * 0.52, r * 0.66, r * 0.12);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.26, cy - r * 0.10);
  ctx.lineTo(cx, cy - r * 0.72);
  ctx.lineTo(cx + r * 0.26, cy - r * 0.10);
  ctx.closePath();
  ctx.fill();
}

// 盾牌
function iconShield(ctx, cx, cy, r, color) {
  ctx.fillStyle = color || ICON_SHIELD;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.86, cy - r * 0.56);
  ctx.lineTo(cx + r * 0.86, cy + r * 0.14);
  ctx.quadraticCurveTo(cx + r * 0.80, cy + r * 0.86, cx, cy + r * 1.06);
  ctx.quadraticCurveTo(cx - r * 0.80, cy + r * 0.86, cx - r * 0.86, cy + r * 0.14);
  ctx.lineTo(cx - r * 0.86, cy - r * 0.56);
  ctx.closePath();
  ctx.fill();
}

// 变大：圈 + 向上箭头
function iconGrow(ctx, cx, cy, r, color) {
  const c = color || ICON_GROW;

  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(1.8, r * 0.24);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.44);
  ctx.lineTo(cx + r * 0.36, cy + r * 0.20);
  ctx.lineTo(cx - r * 0.36, cy + r * 0.20);
  ctx.closePath();
  ctx.fill();
}

// 准星（自动开火图标）
function iconCrosshair(ctx, cx, cy, r, color) {
  const c = color || '#1f9ecf';

  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(1.6, r * 0.17);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.70, 0, Math.PI * 2);
  ctx.stroke();

  const out = r * 1.02;
  const inn = r * 0.30;

  ctx.beginPath();
  ctx.moveTo(cx, cy - out);
  ctx.lineTo(cx, cy - inn);
  ctx.moveTo(cx, cy + inn);
  ctx.lineTo(cx, cy + out);
  ctx.moveTo(cx - out, cy);
  ctx.lineTo(cx - inn, cy);
  ctx.moveTo(cx + inn, cy);
  ctx.lineTo(cx + out, cy);
  ctx.stroke();

  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.4, r * 0.16), 0, Math.PI * 2);
  ctx.fill();
}

// 小锁（提示「锁定」）
function iconLock(ctx, cx, cy, r, color) {
  const c = color || '#1f9ecf';

  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(1.2, r * 0.34);
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.22, r * 0.44, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = c;
  util.roundRectPath(ctx, cx - r * 0.70, cy - r * 0.08, r * 1.40, r * 1.02, r * 0.24);
  ctx.fill();
}

// ---------------- HUD ----------------
function drawHp(ctx, player) {
  if (!player) return;

  const hp = Math.max(0, player.hp);
  const num = String(hp);

  const r = 11;
  const x0 = 16;
  const cy = 40;
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

  const hx = x0 + r;
  ctx.fillStyle = C.hpPip;
  heartPath(ctx, hx, cy, r);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  heartPath(ctx, hx - r * 0.28, cy - r * 0.34, r * 0.34);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.hudText;
  ctx.font = font;
  ctx.fillText(num, x0 + r * 2 + 12, cy + 1);

  ctx.textBaseline = 'alphabetic';
}

function drawCoins(ctx, state) {
  const num = String(state.coins || 0);

  ctx.font = 'bold 20px sans-serif';
  const tw = ctx.measureText(num).width;

  const pillW = 22 + tw + 12;
  const pillH = 34;
  const pillX = cfg.WIDTH - pillW - 12;
  const pillY = 24;

  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  util.roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  iconCoin(ctx, pillX + 16, pillY + pillH / 2, 10);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8a6100';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(num, pillX + 30, pillY + pillH / 2 + 1);

  ctx.textBaseline = 'alphabetic';
}

function drawMenuButton(ctx) {
  const x = cfg.MENU_BTN_X;
  const y = cfg.MENU_BTN_Y;
  const w = cfg.MENU_BTN_W;
  const h = cfg.MENU_BTN_H;

  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  util.roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  ctx.fillStyle = C.hudText;
  const lx = x + 14;
  const lw = 16;
  const lh = 2.4;

  ctx.fillRect(lx, y + h / 2 - 7, lw, lh);
  ctx.fillRect(lx, y + h / 2 - lh / 2, lw, lh);
  ctx.fillRect(lx, y + h / 2 + 7 - lh, lw, lh);

  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('菜单', lx + lw + 8, y + h / 2 + 1);

  ctx.textBaseline = 'alphabetic';
}

// 主动道具按钮：瞄准摇杆右上角
function drawActiveBar(ctx, state, now) {
  const items = activeKit.ITEMS;

  for (let i = 0; i < items.length; i++) {
    const id = items[i];
    const r = activeKit.rectOf(id);
    const count = (state.activeItems && state.activeItems[id]) || 0;
    const until = (id === 'shield') ? state.shieldUntil : state.growUntil;
    const on = !!until && now < until;

    let bg = 'rgba(255,255,255,0.35)';
    if (on) bg = 'rgba(94,224,192,0.90)';
    else if (count > 0) bg = 'rgba(255,255,255,0.82)';

    ctx.fillStyle = bg;
    util.roundRectPath(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();

    ctx.strokeStyle = on ? '#5ee0c0' : 'rgba(29,58,82,0.25)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const icx = r.x + r.w / 2;
    const icy = r.y + r.h / 2 - 3;
    const dim = (!on && count <= 0);

    if (id === 'shield') iconShield(ctx, icx, icy, 11, dim ? 'rgba(29,58,82,0.35)' : ICON_SHIELD);
    else iconGrow(ctx, icx, icy, 11, dim ? 'rgba(29,58,82,0.35)' : ICON_GROW);

    // 右下角数量 / 剩余秒数
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = on ? '#0b3a34' : (count > 0 ? '#1d3a52' : 'rgba(29,58,82,0.45)');

    let tag;
    if (on) tag = Math.ceil((until - now) / 1000) + 's';
    else tag = '×' + count;

    ctx.fillText(tag, r.x + r.w - 5, r.y + r.h - 5);
  }
}

// 自动开火按钮：关闭时是摇杆右下角的小钮，开启时占据摇杆位置并放大
function drawAutoButton(ctx, state, now) {
  const on = !!state.autoFire;
  const r = autoKit.rectOf(on);

  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rad = r.w / 2;

  ctx.save();

  if (on) {
    const pulse = 1 + Math.sin(now / 220) * 0.03;

    // 外发光
    const g = ctx.createRadialGradient(cx, cy, rad * 0.5, cx, cy, rad * 1.35);
    g.addColorStop(0, 'rgba(94,224,192,0.30)');
    g.addColorStop(1, 'rgba(94,224,192,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // 主圆
    ctx.fillStyle = 'rgba(94,224,192,0.94)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * pulse * 0.92, 0, Math.PI * 2);
    ctx.stroke();

    iconCrosshair(ctx, cx, cy - rad * 0.20, rad * 0.46, 'rgba(11,58,52,0.95)');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0b3a34';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('锁定开火', cx, cy + rad * 0.46);

    ctx.font = '9px sans-serif';
    ctx.fillStyle = 'rgba(11,58,52,0.72)';
    ctx.fillText('点击解除', cx, cy + rad * 0.46 + 13);
  } else {
    // 小圆钮
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = ICON_SHIELD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rad - 1, 0, Math.PI * 2);
    ctx.stroke();

    iconCrosshair(ctx, cx - rad * 0.10, cy - rad * 0.10, rad * 0.56, ICON_SHIELD);

    // 右下角的小锁，提示这是「锁定开火」
    iconLock(ctx, cx + rad * 0.66, cy + rad * 0.66, rad * 0.34, '#2f7fd0');
  }

  ctx.restore();
}

// 护盾光环：包住玩家的青色光圈 + 两颗绕着他转的小盾牌
function drawShieldAura(ctx, state, now) {
  const until = state.shieldUntil;
  const p = state.player;

  if (!until || !isFinite(until) || now >= until || !p) return;

  const cameraX = state.cameraX || 0;
  const cx = p.x + p.w / 2 - cameraX;
  const cy = p.y + p.h / 2;
  const r = Math.max(p.w, p.h) * 0.95 + 8;

  const pulse = 1 + Math.sin(now / 150) * 0.04;
  const rr = r * pulse;

  ctx.save();

  const g = ctx.createRadialGradient(cx, cy, rr * 0.55, cx, cy, rr * 1.12);
  g.addColorStop(0, 'rgba(120,225,255,0.05)');
  g.addColorStop(0.75, 'rgba(120,225,255,0.26)');
  g.addColorStop(1, 'rgba(120,225,255,0.02)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rr * 1.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(150,245,255,0.95)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rr * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  const orbR = rr * 1.04;
  for (let i = 0; i < 2; i++) {
    const a = now / 420 + i * Math.PI;
    const sx = cx + Math.cos(a) * orbR;
    const sy = cy + Math.sin(a) * orbR;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();

    iconShield(ctx, sx, sy, 5.2, ICON_SHIELD);
  }

  ctx.restore();
}

// 变大光环：紫色脉冲圈，表示属性翻倍生效中
function drawGrowAura(ctx, state, now) {
  const until = state.growUntil;
  const p = state.player;

  if (!until || !isFinite(until) || now >= until || !p) return;

  const cameraX = state.cameraX || 0;
  const cx = p.x + p.w / 2 - cameraX;
  const cy = p.y + p.h / 2;
  const r = Math.max(p.w, p.h) * 0.72;

  const pulse = 1 + Math.sin(now / 200) * 0.06;

  ctx.save();
  ctx.strokeStyle = 'rgba(200,120,255,0.75)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawXp(ctx, state) {
  const x0 = 15;
  const y0 = 74;
  const w = Math.round(cfg.WIDTH * 0.42);
  const h = 9;

  const need = state.xpNeed > 0 ? state.xpNeed : 1;
  let ratio = state.xp / need;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  util.roundRectPath(ctx, x0 - 6, y0 - 5, w + 12, h + 10, 7);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  util.roundRectPath(ctx, x0, y0, w, h, 4);
  ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle = XP_FILL;
    util.roundRectPath(ctx, x0, y0, Math.max(3, w * ratio), h, 4);
    ctx.fill();
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = C.hudText;
  ctx.fillText('Lv.' + state.level, x0 + w + 12, y0 + h / 2 + 1);

  ctx.textBaseline = 'alphabetic';
}

function drawStatPill(ctx, x, y, iconFn, value, color) {
  const h = 28;

  ctx.font = 'bold 14px sans-serif';
  const tw = ctx.measureText(value).width;
  const w = 28 + tw + 11;

  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  util.roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  if (color) iconFn(ctx, x + 15, y + h / 2, 8, color);
  else iconFn(ctx, x + 15, y + h / 2, 8);

  ctx.fillStyle = color || C.hudText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x + 27, y + h / 2 + 1);

  ctx.textBaseline = 'alphabetic';

  return w;
}

function drawStats(ctx, state) {
  const y = 96;
  const gap = 5;
  let x = 15;

  const cloneCount = state.clones ? state.clones.list.length : 0;
  const speed = cfg.PLAYER_FIRE_MS_START / Math.max(1, state.fireMs || cfg.PLAYER_FIRE_MS_START);
  const multi = state.multishot || cfg.PLAYER_MULTI_START;
  const dmg = state.damage || cfg.PLAYER_DAMAGE_START;
  const ammo = state.ammo || 0;
  const ammoMax = state.ammoMax || cfg.PLAYER_AMMO_START;

  x += drawStatPill(ctx, x, y, iconClone, String(cloneCount)) + gap;
  x += drawStatPill(ctx, x, y, iconSpeed, 'x' + speed.toFixed(1)) + gap;
  x += drawStatPill(ctx, x, y, iconBullet, String(multi)) + gap;
  x += drawStatPill(ctx, x, y, iconDamage, dmg.toFixed(1)) + gap;

  const ammoColor = ammo > 0 ? ICON_AMMO : ICON_AMMO_EMPTY;
  x += drawStatPill(ctx, x, y, iconAmmo, ammo + '/' + ammoMax, ammoColor) + gap;
}

function drawHud(ctx, state, now) {
  drawHp(ctx, state.player);
  drawCoins(ctx, state);
  drawMenuButton(ctx);
  drawActiveBar(ctx, state, now);
  drawXp(ctx, state);
  drawStats(ctx, state);

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
  ctx.textBaseline = 'alphabetic';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(29,58,82,0.55)';
  ctx.fillText(
    state.autoFire
      ? '自动开火中 · 点击右侧大按钮解除'
      : '左下摇杆移动（上推跳跃） · 右下摇杆瞄准射击',
    cfg.WIDTH / 2,
    cfg.HEIGHT - 16
  );

  ctx.textAlign = 'left';
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

// ---------------- 暂停弹窗 ----------------
function drawPause(ctx, state) {
  if (!state.menuOpen || !state.pausePanel) return;

  const p = state.pausePanel;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, cfg.WIDTH, cfg.HEIGHT);

  ctx.fillStyle = 'rgba(30,30,46,0.97)';
  util.roundRectPath(ctx, p.x, p.y, p.w, p.h, 20);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('菜单', p.x + p.w / 2, p.y + 30);

  const list = state.pauseButtons || [];

  for (let i = 0; i < list.length; i++) {
    const b = list[i];

    ctx.fillStyle = i === 0 ? 'rgba(94,224,192,0.18)' : 'rgba(255,255,255,0.08)';
    util.roundRectPath(ctx, b.x, b.y, b.w, b.h, b.h / 2);
    ctx.fill();

    ctx.strokeStyle = i === 0 ? '#5ee0c0' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  ctx.textBaseline = 'alphabetic';
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

  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('金币 ' + (state.coins || 0) + ' · 进度已清除', cfg.WIDTH / 2, cfg.HEIGHT * 0.36 + 104);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('点击屏幕返回主菜单', cfg.WIDTH / 2, cfg.HEIGHT * 0.36 + 142);

  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(BUILD, cfg.WIDTH / 2, cfg.HEIGHT - 12);

  ctx.textBaseline = 'alphabetic';
}

// ---------------- 总入口 ----------------
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
    drawGrowAura(ctx, state, now);
    drawShieldAura(ctx, state, now);
    drawPlayer.draw(ctx, state.player, cameraX, state.firing ? state.aimAngle : null, now);
  }

  drawFx.drawJoystick(ctx, state.joy);

  // 自动开火开启时，右摇杆隐藏，原位换成放大的锁定按钮
  if (!state.autoFire) drawFx.drawAimStick(ctx, state.aimStick);

  drawAutoButton(ctx, state, now);

  drawHud(ctx, state, now);
  drawHurtFlash(ctx, state.player, now);

  if (state.phase === 'dead') drawDead(ctx, state, now);
  else drawPause(ctx, state);
}

module.exports = { draw: draw };
