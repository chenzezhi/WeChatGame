// 绘制层：只读状态、不修改状态。
// 冒险岛风格：蓝天 + 视差云/山/树 + 草地泥土 + Q 版人物（会眨眼）。

const cfg = require('./config.js');

const BUILD = 'game-2';

const C = {
  skyTop: '#7fd0f7',
  skyBottom: '#dff4ff',
  cloud: 'rgba(255,255,255,0.9)',
  hillFar: '#a8e0a4',
  hillMid: '#7fca78',
  treeTrunk: '#8a5a3b',
  treeLeaf: '#4fae52',
  treeLeafDark: '#3d9142',
  grass: '#5fd06a',
  grassDark: '#3fa84d',
  soilTop: '#8b6b4a',
  soilBottom: '#57422e',
  rockBody: '#9aa3ad',
  rockDark: '#6f7883',
  rockLight: '#c6ced6',
  skin: '#ffd9b3',
  hair: '#5a3a22',
  shirt: '#3f7fd6',
  shirtDark: '#2f63aa',
  pants: '#33415c',
  eye: '#22262e',
  shadow: 'rgba(0,0,0,0.16)',
  hudBg: 'rgba(255,255,255,0.82)',
  hudText: '#1d3a52',
};

// ---------------------------------------------------------------- 小工具
function roundRectPath(ctx, x, y, w, h, r) {
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

function fillEllipse(ctx, cx, cy, rx, ry, style) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
  ctx.restore();
}

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
  const factor = 0.15;
  const shift = (cameraX * factor) % CLOUD_SPAN;

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
  const shift = (cameraX * factor) % spacing;
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
  const factor = 0.5;
  const spacing = 230;

  // 负相机位置也要正确取模（往回走时视差不能跳）
  let shift = (cameraX * factor) % spacing;
  if (shift < 0) shift += spacing;

  let x = -spacing - shift;
  let i = 0;

  while (x < cfg.WIDTH + spacing) {
    const baseY = cfg.GROUND_Y;
    const th = 46 + (i % 3) * 12;

    // 树干
    ctx.fillStyle = C.treeTrunk;
    ctx.fillRect(x - 4, baseY - th * 0.55, 8, th * 0.55);

    // 树冠
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

  // 草皮
  ctx.fillStyle = C.grass;
  ctx.fillRect(0, y, cfg.WIDTH, 14);

  ctx.fillStyle = C.grassDark;
  ctx.fillRect(0, y + 14, cfg.WIDTH, 6);

  // 泥土
  const g = ctx.createLinearGradient(0, y + 20, 0, cfg.HEIGHT);
  g.addColorStop(0, C.soilTop);
  g.addColorStop(1, C.soilBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, y + 20, cfg.WIDTH, cfg.HEIGHT - y - 20);

  // 草皮高光（随相机滚动）
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  const step = 46;
  let shift = cameraX % step;
  if (shift < 0) shift += step;

  let x = -shift;
  while (x < cfg.WIDTH + step) {
    ctx.fillRect(x, y + 2, 18, 4);
    x += step;
  }

  // 泥土纹理
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

// ---------------------------------------------------------------- 石头
function drawRock(ctx, r, cameraX) {
  const x = r.x - cameraX;
  const y = r.y;
  const w = r.w;
  const h = r.h;

  if (x + w < -40 || x > cfg.WIDTH + 40) return;

  // 主体
  ctx.fillStyle = C.rockBody;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.08, y + h * 0.36);
  ctx.lineTo(x + w * 0.42, y);
  ctx.lineTo(x + w * 0.82, y + h * 0.18);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // 暗面
  ctx.fillStyle = C.rockDark;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.42, y);
  ctx.lineTo(x + w * 0.82, y + h * 0.18);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w * 0.58, y + h);
  ctx.closePath();
  ctx.fill();

  // 亮面
  ctx.fillStyle = C.rockLight;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.08, y + h * 0.36);
  ctx.lineTo(x + w * 0.42, y);
  ctx.lineTo(x + w * 0.48, y + h * 0.46);
  ctx.lineTo(x + w * 0.2, y + h * 0.64);
  ctx.closePath();
  ctx.fill();
}

function drawRocks(ctx, level, cameraX) {
  const rocks = (level && level.rocks) || [];
  for (let i = 0; i < rocks.length; i++) drawRock(ctx, rocks[i], cameraX);
}

// ---------------------------------------------------------------- 人物
// 眼睛：眨眼时画成两条闭合的短横线
function drawEyes(ctx, R, headCY, blinking) {
  if (blinking) {
    ctx.strokeStyle = C.eye;
    ctx.lineWidth = Math.max(1.6, R * 0.11);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(R * 0.02, headCY + R * 0.16);
    ctx.lineTo(R * 0.30, headCY + R * 0.16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(R * 0.42, headCY + R * 0.16);
    ctx.lineTo(R * 0.70, headCY + R * 0.16);
    ctx.stroke();

    ctx.lineCap = 'butt';
    return;
  }

  // 睁眼
  ctx.fillStyle = C.eye;
  ctx.beginPath();
  ctx.arc(R * 0.16, headCY + R * 0.12, R * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(R * 0.56, headCY + R * 0.12, R * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // 高光
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(R * 0.21, headCY + R * 0.07, R * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(R * 0.61, headCY + R * 0.07, R * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, p, cameraX) {
  const sx = p.x - cameraX;
  const sy = p.y;
  const w = p.w;
  const h = p.h;
  const cx = sx + w / 2;
  const feetY = sy + h;

  // 影子（始终贴地）
  fillEllipse(ctx, cx, cfg.GROUND_Y + 3, w * 0.46, w * 0.15, C.shadow);

  const R = w * 0.55;          // 头半径
  const headCY = -h * 0.70;    // 头心（相对脚底）
  const legW = w * 0.20;
  const legH = h * 0.24;
  const bodyW = w * 0.62;
  const bodyH = h * 0.34;
  const bodyY = -legH - bodyH + h * 0.02;
  const armW = w * 0.16;
  const armH = h * 0.22;

  const isJump = p.anim === 'jump';
  const swing = p.anim === 'run' ? Math.sin(p.runPhase * Math.PI * 2) : 0;

  ctx.save();
  ctx.translate(cx, feetY);
  ctx.scale(p.facing >= 0 ? 1 : -1, 1);

  // ---- 腿 ----
  ctx.fillStyle = C.pants;
  if (isJump) {
    roundRectPath(ctx, -legW * 1.55, -legH * 0.92, legW, legH * 0.9, legW * 0.42);
    ctx.fill();
    roundRectPath(ctx, legW * 0.55, -legH * 0.92, legW, legH * 0.9, legW * 0.42);
    ctx.fill();
  } else {
    const o1 = swing * h * 0.045;
    const o2 = -swing * h * 0.045;
    roundRectPath(ctx, -legW * 1.55, -legH + o1, legW, legH - o1, legW * 0.42);
    ctx.fill();
    roundRectPath(ctx, legW * 0.55, -legH + o2, legW, legH - o2, legW * 0.42);
    ctx.fill();
  }

  // ---- 身体（衣服） ----
  ctx.fillStyle = C.shirt;
  roundRectPath(ctx, -bodyW / 2, bodyY, bodyW, bodyH, bodyW * 0.34);
  ctx.fill();

  ctx.fillStyle = C.shirtDark;
  roundRectPath(ctx, -bodyW / 2, bodyY + bodyH * 0.66, bodyW, bodyH * 0.34, bodyW * 0.3);
  ctx.fill();

  // ---- 手臂 ----
  ctx.fillStyle = C.skin;
  if (isJump) {
    roundRectPath(ctx, -bodyW / 2 - armW * 0.65, bodyY - armH * 0.55, armW, armH, armW * 0.45);
    ctx.fill();
    roundRectPath(ctx, bodyW / 2 - armW * 0.35, bodyY - armH * 0.55, armW, armH, armW * 0.45);
    ctx.fill();
  } else {
    const o1 = swing * h * 0.03;
    const o2 = -swing * h * 0.03;
    roundRectPath(ctx, -bodyW / 2 - armW * 0.6, bodyY + armH * 0.12 + o1, armW, armH, armW * 0.45);
    ctx.fill();
    roundRectPath(ctx, bodyW / 2 - armW * 0.4, bodyY + armH * 0.12 + o2, armW, armH, armW * 0.45);
    ctx.fill();
  }

  // ---- 头 ----
  ctx.fillStyle = C.skin;
  ctx.beginPath();
  ctx.arc(0, headCY, R, 0, Math.PI * 2);
  ctx.fill();

  // 头发（上半圆帽 + 刘海）
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.arc(0, headCY, R * 1.02, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(R * 0.1, headCY - R * 0.86);
  ctx.lineTo(R * 0.78, headCY - R * 0.42);
  ctx.lineTo(R * 0.2, headCY - R * 0.3);
  ctx.closePath();
  ctx.fill();

  // ---- 眼睛（会眨） ----
  drawEyes(ctx, R, headCY, p.blinking);

  // ---- 嘴 ----
  ctx.strokeStyle = 'rgba(90,58,34,0.8)';
  ctx.lineWidth = Math.max(1, R * 0.08);
  ctx.beginPath();
  ctx.arc(R * 0.36, headCY + R * 0.42, R * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------- HUD
function drawHud(ctx, state) {
  const w = 112;
  const h = 36;
  const x = (cfg.WIDTH - w) / 2;

  ctx.fillStyle = C.hudBg;
  roundRectPath(ctx, x, 22, w, h, h / 2);
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

  // 操作提示
  ctx.textAlign = 'center';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(29,58,82,0.55)';
  ctx.fillText('按住左/右侧移动 · 上滑跳跃', cfg.WIDTH / 2, cfg.HEIGHT - 16);

  // 版本标记
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(29,58,82,0.45)';
  ctx.fillText(BUILD, 8, 8);
  ctx.textBaseline = 'alphabetic';
}

function drawDead(ctx, state, now) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, cfg.WIDTH, cfg.HEIGHT);

  const pulse = 1 + Math.sin((now - state.deadAt) / 260) * 0.02;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(30 * pulse) + 'px sans-serif';
  ctx.fillText('撞到石头了', cfg.WIDTH / 2, cfg.HEIGHT * 0.36);

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
  drawRocks(ctx, state.level, cameraX);

  if (state.player && state.phase !== 'dead') drawPlayer(ctx, state.player, cameraX);

  drawHud(ctx, state);

  if (state.phase === 'dead') drawDead(ctx, state, now);
}

module.exports = { draw: draw };
