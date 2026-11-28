'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面（原生画布绘制）
 *
 * 每帧：Ticker 推进 Battle 逻辑 → Overlay 用 Canvas 2D 直接画。
 * 画的东西：篝火、格子上的武器、怪物、子弹、HUD、两个按钮、商店遮罩。
 *
 * 武器形状按种类画（剑 / 斧 / 矛 / 杖），颜色按等级取自武器表，
 * 所以同一把武器 1~4 级一眼能看出差别。
 * ==============================================*/

/* ==================== 用法 ====================
 * const view = BattleView.create({ stage, sm, board, shop, battle, config: COMBAT });
 * view.handleTap(x, y);   // 画布物理像素坐标
 * ==============================================*/

/* ==================== 注意 ====================
 * 逻辑和绘制分开：battle.update(dt) 挂在 Ticker，绘制挂在 Overlay。
 *
 * 人物是 cax 的精灵，永远在覆盖层下面；所以人物所在格子的武器不画，
 * 视觉上就等于「人物压在武器上面」。
 * ==============================================*/

const Overlay = require('./overlay.js');
const Ticker = require('./ticker.js');
const World = require('./world.js');
const texture = require('./texture.js');

// 界面色
const COLOR = {
  bladeEdge: '#2c3440',
  guard: '#c9a14a',
  hilt: '#6b4a2a',
  monster: '#a83b3b',
  monsterDark: '#6e2222',
  monsterEye: '#fff4c9',
  campStone: '#4a4a52',
  campFlame: '#e8622a',
  campInner: '#f7d24a',
  campLog: '#7a5433',
  fightBtn: '#8b2f2f',
  refreshBtn: '#2f5d8b',
  btnText: '#ffe9c9',
  btnTextOff: '#ff6a6a',
  // 银币：白银色（不要金色）
  coin: '#d9dfe8',
  coinRim: '#8d98a8',
  coinShine: '#ffffff',
  hud: '#ffffff',
  hudBg: 'rgba(0,0,0,0.45)',
  mask: '#12121a',
  hpBack: '#3a1a1a',
  hpFill: '#e04b4b',
};

// 画一个圆角矩形路径
function roundRectPath(ctx, x, y, w, h, r) {
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

// 画一枚银币：银色底面 + 深色边 + 一点高光
// cx, cy - 圆心；r - 半径
function drawCoin(ctx, cx, cy, r) {
  // 银底
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.coin;
  ctx.fill();

  // 外圈：深一点的银灰
  ctx.lineWidth = Math.max(1, r * 0.26);
  ctx.strokeStyle = COLOR.coinRim;
  ctx.stroke();

  // 内圈：压一道浅色环，看起来像币面
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.strokeStyle = COLOR.coinRim;
  ctx.stroke();

  // 高光：左上角一小块
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.3, r * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.coinShine;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ---------------- 四种武器形状 ---------------- */

// 剑：竖刃 + 横格 + 短柄
function drawSwordShape(ctx, color, cx, cy, s) {
  const bladeW = Math.max(3, s * 0.22);
  const bladeH = s * 0.52;
  const guardW = s * 0.56;
  const guardH = Math.max(2, s * 0.1);
  const hiltW = Math.max(2, s * 0.16);
  const hiltH = s * 0.2;
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  roundRectPath(ctx, cx - bladeW / 2, top, bladeW, bladeH, bladeW * 0.3);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();

  roundRectPath(ctx, cx - guardW / 2, top + bladeH, guardW, guardH, guardH * 0.4);
  ctx.fillStyle = COLOR.guard;
  ctx.fill();
  ctx.stroke();

  roundRectPath(ctx, cx - hiltW / 2, top + bladeH + guardH, hiltW, hiltH, hiltW * 0.4);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();
}

// 斧：长柄 + 一侧厚刃
function drawAxeShape(ctx, color, cx, cy, s) {
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  // 柄
  roundRectPath(ctx, cx - s * 0.05, top, s * 0.1, s, s * 0.04);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();

  // 斧刃：梯形
  ctx.beginPath();
  ctx.moveTo(cx, top + s * 0.12);
  ctx.lineTo(cx + s * 0.42, top + s * 0.05);
  ctx.lineTo(cx + s * 0.34, top + s * 0.42);
  ctx.lineTo(cx, top + s * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
}

// 矛：细长杆 + 尖头
function drawSpearShape(ctx, color, cx, cy, s) {
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  roundRectPath(ctx, cx - s * 0.035, top + s * 0.2, s * 0.07, s * 0.8, s * 0.03);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();

  // 矛尖
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx + s * 0.12, top + s * 0.26);
  ctx.lineTo(cx, top + s * 0.34);
  ctx.lineTo(cx - s * 0.12, top + s * 0.26);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
}

// 杖：杆 + 圆形法球
function drawStaffShape(ctx, color, cx, cy, s) {
  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  roundRectPath(ctx, cx - s * 0.04, top + s * 0.22, s * 0.08, s * 0.78, s * 0.03);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, top + s * 0.16, s * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
}

// 旋刃：三叶飞刀，绕中心转
function drawSpinShape(ctx, color, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);

  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 3);

    ctx.beginPath();
    ctx.moveTo(0, -s * 0.1);
    ctx.lineTo(s * 0.46, -s * 0.3);
    ctx.lineTo(s * 0.2, s * 0.05);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.strokeStyle = COLOR.bladeEdge;
    ctx.stroke();

    ctx.restore();
  }

  // 轴心
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.guard;
  ctx.fill();

  ctx.restore();
}

// 爱心：加耐久卡用
function drawHeartShape(ctx, color, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.42);
  ctx.bezierCurveTo(cx - s * 0.75, cy - s * 0.12, cx - s * 0.34, cy - s * 0.6, cx, cy - s * 0.2);
  ctx.bezierCurveTo(cx + s * 0.34, cy - s * 0.6, cx + s * 0.75, cy - s * 0.12, cx, cy + s * 0.42);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// 闪电：加速卡用
function drawBoltShape(ctx, color, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.12, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.02, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.5);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.03, cy - s * 0.1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// 在格子右下角写一个小标签（×2 / +4 这种）
// text - 要写的字
// x, y - 右下角坐标
// size - 字号，单位 px
function drawBadge(ctx, text, x, y, size) {
  ctx.font = 'bold ' + Math.round(size) + 'px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';

  // 先描一圈暗边，保证任何背景上都看得清
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(text, x, y);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

// 一张卡右下角该显示什么数字
// def - 卡牌表里的一行
// 返回字符串，不显示时返回空串
function badgeTextOf(def) {
  if (!def) return '';

  if (def.kind === 'heal' || def.type === 'heal') return '+' + (def.heal || 0);
  if (def.kind === 'speed' || def.type === 'speed') return '×' + (def.speedMul || 0);
  return '×' + (def.shots || 1);
}

// 按武器表里的 kind 分发
// def - 卡牌表里的一行（含 kind / color）
function drawWeapon(ctx, def, cx, cy, s) {
  const kind = def.kind || 'sword';
  const color = def.color || '#d8dee8';

  if (kind === 'spin') return drawSpinShape(ctx, color, cx, cy, s);
  if (kind === 'heal') return drawHeartShape(ctx, color, cx, cy, s * 0.9);
  if (kind === 'speed') return drawBoltShape(ctx, color, cx, cy, s * 0.9);
  if (kind === 'axe') return drawAxeShape(ctx, color, cx, cy, s);
  if (kind === 'spear') return drawSpearShape(ctx, color, cx, cy, s);
  if (kind === 'staff') return drawStaffShape(ctx, color, cx, cy, s);
  return drawSwordShape(ctx, color, cx, cy, s);
}

// 带旋转的武器：绕自身中心转
// angle - 弧度，0 表示朝右；图形本身是朝上的，所以加 90°
function drawWeaponAimed(ctx, def, cx, cy, s, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle || 0) + Math.PI / 2);
  drawWeapon(ctx, def, 0, 0, s);
  ctx.restore();
}

/* ---------------- 怪物 / 篝火 ---------------- */

// 小怪：圆身子 + 角 + 眼睛 + 嘴 + 血条
// kind - 用来区分颜色深浅
function drawMonster(ctx, cx, cy, s, hpRatio, kind) {
  const r = s * 0.34;
  const body = kind === 'boss' ? '#7a2a8f' : kind === 'elite' ? '#a85f1f' : COLOR.monster;
  const dark = kind === 'boss' ? '#4a1550' : kind === 'elite' ? '#6b3a0f' : COLOR.monsterDark;

  // 角
  ctx.fillStyle = dark;
  for (let i = 0; i < 2; i++) {
    const dir = i === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + dir * r * 0.55, cy - r * 0.75);
    ctx.lineTo(cx + dir * r * 1.05, cy - r * 1.35);
    ctx.lineTo(cx + dir * r * 0.95, cy - r * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  // 身子
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.strokeStyle = dark;
  ctx.stroke();

  // 眼睛
  const eyeR = Math.max(2, r * 0.26);
  for (let i = 0; i < 2; i++) {
    const ex = cx + (i === 0 ? -r * 0.36 : r * 0.36);
    ctx.beginPath();
    ctx.arc(ex, cy - r * 0.1, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = COLOR.monsterEye;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex, cy - r * 0.05, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();
  }

  // 嘴
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.42, r * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  ctx.lineWidth = Math.max(1.2, s * 0.04);
  ctx.strokeStyle = dark;
  ctx.stroke();

  // 血条
  if (hpRatio < 1) {
    const bw = s * 0.8;
    const bh = Math.max(3, s * 0.08);
    const bx = cx - bw / 2;
    const by = cy - r - bh * 3;
    ctx.fillStyle = COLOR.hpBack;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = COLOR.hpFill;
    ctx.fillRect(bx, by, bw * Math.max(0, hpRatio), bh);
  }
}

// 篝火：交叉柴火 + 围石 + 两层火苗
function drawCampfire(ctx, cx, cy, s) {
  // 柴火
  ctx.save();
  ctx.translate(cx, cy + s * 0.3);
  ctx.fillStyle = COLOR.campLog;
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.rotate((i === 0 ? -1 : 1) * 0.35);
    roundRectPath(ctx, -s * 0.34, -s * 0.06, s * 0.68, s * 0.12, s * 0.05);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 围石
  ctx.fillStyle = COLOR.campStone;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * s * 0.34, cy + s * 0.28 + Math.sin(a) * s * 0.1, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // 外焰
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.05, cx + s * 0.16, cy + s * 0.22);
  ctx.quadraticCurveTo(cx, cy + s * 0.3, cx - s * 0.16, cy + s * 0.22);
  ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.05, cx, cy - s * 0.5);
  ctx.closePath();
  ctx.fillStyle = COLOR.campFlame;
  ctx.fill();

  // 内焰
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.2);
  ctx.quadraticCurveTo(cx + s * 0.14, cy + s * 0.02, cx + s * 0.08, cy + s * 0.18);
  ctx.quadraticCurveTo(cx, cy + s * 0.24, cx - s * 0.08, cy + s * 0.18);
  ctx.quadraticCurveTo(cx - s * 0.14, cy + s * 0.02, cx, cy - s * 0.2);
  ctx.closePath();
  ctx.fillStyle = COLOR.campInner;
  ctx.fill();
}

// 创建战斗视图
// options - { stage, sm, board, shop, battle, config }
// 返回 { handleTap(x, y) }
function create(options) {
  const o = options || {};
  const board = o.board;
  const shop = o.shop;
  const battle = o.battle;
  const cfg = o.config || {};
  const tpl = cfg.template || {};

  if (!board || !battle) {
    console.warn('[battle-view] 缺少 board / battle，战斗画面没有创建');
    return null;
  }

  // 尺寸，单位 px
  const cardSize = board.cellW * 0.6;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.55;
  const bulletSize = board.cellW * (tpl.bulletScale == null ? 0.42 : tpl.bulletScale);
  const monsterSize = board.cellW * (tpl.monsterSizeRatio == null ? 0.5 : tpl.monsterSizeRatio);
  const campfireSize = board.cellW * (tpl.campfireSizeRatio == null ? 1 : tpl.campfireSizeRatio);
  const fontPx = Math.max(12, Math.round(board.cellW * 0.16));

  /* ---------- 抽奖按钮：商店外壳左上角 ---------- */
  const gachaBtn = (function () {
    const shell = shop && shop.shell ? shop.shell : null;
    const pad = board.cellW * 0.12;
    const size = board.cellW * 0.5;

    if (!shell) {
      return { x: pad, y: battle.height * 0.66, w: size * 1.6, h: size, label: '抽奖' };
    }

    return {
      x: Math.max(shell.x, 0) + pad,
      y: Math.max(shell.y, 0) + pad,
      w: size * 1.6,
      h: size,
      label: '抽奖',
    };
  })();

  /* ---------- 两个按钮：刷新（带价格）+ 开始战斗，大小一样 ---------- */
  const buttonH = board.cellH * 0.55;
  const buttonW = Math.min(board.cellW * 1.45, battle.width * 0.4);
  const buttonGap = board.cellW * 0.18;

  const slot0 = shop && shop.slots && shop.slots[0] ? shop.slots[0] : null;
  const slotY = slot0 ? slot0.y : battle.height * 0.82;
  const slotH = slot0 ? slot0.h : 0;

  let by = slotY + slotH + board.cellH * 0.12;
  by = Math.min(by, battle.height - buttonH - 8);

  const totalW = buttonW * 2 + buttonGap;
  const leftX = (battle.width - totalW) / 2;

  const refreshButton = {
    x: leftX,
    y: by,
    w: buttonW,
    h: buttonH,
    label: '刷新',
    cost: tpl.refreshCost || 0,
    onTap: function () {
      battle.refreshShop();
    },
  };

  const fightButton = {
    x: leftX + buttonW + buttonGap,
    y: by,
    w: buttonW,
    h: buttonH,
    label: '开始战斗',
    cost: null,
    onTap: function () {
      if (battle.state !== 'build') return;
      battle.startWave();
    },
  };

  // 重新开始按钮：结束时出现在屏幕中间
  const restartButton = {
    x: (battle.width - buttonW) / 2,
    y: (battle.height - buttonH) / 2,
    w: buttonW,
    h: buttonH,
    label: '重新开始',
    cost: null,
    onTap: function () {
      battle.restart();
      lastLine = '重新开始';
    },
  };

  // 上一次操作的结果，HUD 最后一段显示
  let lastLine = '';

  // 拖拽中：手指位置（屏幕坐标）和要拖的武器定义
  let dragPoint = null;
  let dragDef = null;

  /* ---------- 外壳图片：可能是图片路径，异步读一次 ---------- */
  let shellImg = null;
  if (shop && shop.shell && /[\/.]/.test(String(shop.shell.asset))) {
    texture.load(
      shop.shell.asset,
      function (t) {
        shellImg = t;
        console.log('[battle-view] 外壳图 ' + t.width + 'x' + t.height +
          '，盒子 ' + Math.round(shop.shell.w) + 'x' + Math.round(shop.shell.h) +
          ' @ ' + Math.round(shop.shell.x) + ',' + Math.round(shop.shell.y));
      },
      function (err) { console.warn('[battle-view] 外壳图片加载失败：' + err.message); }
    );
  }

  /* ---------- 垃圾桶：商店外壳右上角 ---------- */
  const trashSize = board.cellW * 0.4;
  const trashRect = (function () {
    const shell = shop && shop.shell ? shop.shell : null;
    const pad = board.cellW * 0.12;

    if (!shell) {
      return { x: battle.width - trashSize - pad, y: battle.height * 0.7, w: trashSize, h: trashSize };
    }

    // 外壳可能超出屏幕，取个不越界的位置
    const right = Math.min(shell.x + shell.w, battle.width) - pad;
    const top = Math.max(shell.y, 0) + pad;

    return { x: right - trashSize, y: top, w: trashSize, h: trashSize };
  })();

  // 按下时命中的格子 / 槽位（还没确认是不是拖拽）
  let pendingCell = null;
  let pendingSlot = null;

  // 真正开始拖之后，源格子 / 槽位要先「空出来」
  let dragFromCell = null;
  let dragFromSlot = null;

  // 当前世界缩放，逐帧向目标靠拢
  let worldZoom = 1;

  // 把一组 cax 对象按世界缩放摆好（围绕篝火中心）
  // sprites - 带 _baseX / _baseY / _baseScale 的对象数组
  // z - 缩放倍数
  function scaleSprites(sprites, z) {
    if (!sprites) return;
    const c = battle.campfire;

    for (let i = 0; i < sprites.length; i++) {
      const n = sprites[i];
      n.x = c.x + (n._baseX - c.x) * z;
      n.y = c.y + (n._baseY - c.y) * z;
      n.scale = (n._baseScale || 1) * z;
    }
  }

  // 统一显隐
  // sprites - cax 对象数组
  // v - true 显示 / false 隐藏
  function setVisible(sprites, v) {
    if (!sprites) return;
    for (let i = 0; i < sprites.length; i++) sprites[i].visible = v;
  }

  /* ---------- 绘制 ---------- */
  // 把这一帧所有动态内容画出来
  // ctx - Canvas 2D 上下文，坐标是画布物理像素
  function paintAll(ctx) {
    // 0. 世界缩放：布阵 1，战斗时缩小（平滑过渡）
    const targetZoom = battle.state === 'build' ? 1 : (tpl.battleZoom || 0.62);
    worldZoom += (targetZoom - worldZoom) * 0.18;
    if (Math.abs(targetZoom - worldZoom) < 0.002) worldZoom = targetZoom;

    World.set(worldZoom, battle.campfire.x, battle.campfire.y);
    battle.viewZoom = worldZoom;   // 子弹回收按这个算屏幕边界

    // 棋盘与商店是 cax 对象，只能手改坐标和 scale 来跟着缩
    scaleSprites(board.sprites, worldZoom);
    scaleSprites(shop && shop.sprites, worldZoom);

    // 战斗时把商店整块藏起来（外壳 + 槽位），打完再露出来
    setVisible(shop && shop.sprites, battle.state === 'build');

    // 下面画的东西都在世界坐标里，统一套缩放
    ctx.save();
    World.apply(ctx);

    // 1. 篝火
    drawCampfire(ctx, battle.campfire.x, battle.campfire.y, campfireSize);

    // 1.5 篝火右下角：爱心 + 当前耐久
    const st = battle.status();
    const heartSize = campfireSize * 0.26;
    const hx = battle.campfire.x + campfireSize * 0.3;
    const hy = battle.campfire.y + campfireSize * 0.34;
    drawHeartShape(ctx, '#ff4d6d', hx, hy, heartSize);
    drawBadge(ctx, String(Math.round(st.hp)), hx + heartSize * 1.5, hy + heartSize * 0.55, campfireSize * 0.2);

    // 2. 格子上的卡牌：不旋转，永远朝上摆着
    // 正在被拖走的那一格先空出来，做出「拔出来」的效果
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!cell.card || !cell.card.def) continue;
      if (cell === dragFromCell) continue;

      drawWeapon(ctx, cell.card.def, cell.x + cell.w / 2, cell.y + cell.h / 2, cardSize);
      drawBadge(ctx, badgeTextOf(cell.card.def), cell.x + cell.w * 0.86, cell.y + cell.h * 0.9, board.cellW * 0.13);
    }

    // 5. 怪物
    for (let i = 0; i < battle.monsters.length; i++) {
      const m = battle.monsters[i];
      drawMonster(ctx, m.x, m.y, monsterSize, m.maxHp ? m.hp / m.maxHp : 1, m.rec.kind);
    }

    // 6. 子弹：旋刃自转放大，普通子弹朝目标
    for (let i = 0; i < battle.bullets.length; i++) {
      const b = battle.bullets[i];

      if (b.spin) {
        const size = bulletSize * (b.growScale || 1) * 2;
        drawWeaponAimed(ctx, b.def, b.x, b.y, size, b.spinAngle || 0);
        continue;
      }

      const angle = b.target && b.target.alive
        ? Math.atan2(b.target.y + (b.oy || 0) - b.y, b.target.x + (b.ox || 0) - b.x)
        : Math.atan2(b.vy || 0, b.vx || 1);
      drawWeaponAimed(ctx, b.def, b.x, b.y, bulletSize, angle);
    }

    // 12. 商店最后画：外壳 → 槽位 → 卡牌 → 垃圾桶（保证在最上层）
    // 商店：外壳 → 槽位底图 → 卡牌图标 → 价格 → 垃圾桶
    if (shop && shop.shell) {
      const build = battle.state === 'build';

      // 4.1 外壳（图片路径也能画）
      if (build) drawShell(ctx);

      // 4.2 槽位
      if (shop.slots) {
        for (let i = 0; i < shop.slots.length; i++) {
          const slot = shop.slots[i];

          // 槽位底板：一块圆角深色块，保证卡牌有底
          ctx.fillStyle = build ? 'rgba(18,22,30,0.72)' : 'rgba(18,22,30,0.0)';
          roundRectPath(ctx, slot.x, slot.y, slot.w, slot.h, slot.w * 0.12);
          ctx.fill();

          if (!build) continue;

          const phase = battle.gacha.phase;

          // 选宝箱：三个槽位显示宝箱 + 价格
          if (phase === 'chests') {
            const chests = tpl.chests || [];
            const chest = chests[i] || chests[0];
            if (chest) drawChest(ctx, slot, i, chest.price || 0);
            continue;
          }

          // 滚动中：显示随机预览卡，带一点上移
          if (phase === 'rolling') {
            const pv = battle.gacha.preview[i];
            if (pv) {
              const drift = ((battle.gacha.t % 120) / 120) * slot.h * 0.12;
              drawWeapon(ctx, pv, slot.x + slot.w / 2, slot.y + slot.h * 0.4 + drift, slotIconSize);
            }
            continue;
          }

          if (slot.sold || !slot.weapon) continue;
          if (slot === dragFromSlot) continue;   // 正在被拖走

          drawWeapon(ctx, slot.weapon, slot.x + slot.w / 2, slot.y + slot.h * 0.42, slotIconSize);
          drawBadge(ctx, badgeTextOf(slot.weapon), slot.x + slot.w * 0.84, slot.y + slot.h * 0.58, slot.w * 0.14);

          // 抽奖结果：价格位写「免费」
          if (phase === 'result') drawFreeLabel(ctx, slot);
          else drawSlotPrice(ctx, slot);
        }
      }

      // 4.3 抽奖 / 返回 按钮 + 垃圾桶
      if (build) {
        const ph = battle.gacha.phase;

        // 没抽奖时是「抽奖」，显示宝箱时变成「返回」
        if (ph === 'off' || ph === 'chests') {
          gachaBtn.label = ph === 'off' ? '抽奖' : '返回';
          drawButton(ctx, gachaBtn, ph === 'off' ? COLOR.refreshBtn : COLOR.fightBtn, null, true);
        }

        // 垃圾桶只在正常阶段和出结果阶段有用
        if (ph === 'off' || ph === 'result') drawTrash(ctx, isOverTrash());
      }
    }


    // 世界内容画完，恢复屏幕坐标，按钮和 HUD 不跟着缩
    ctx.restore();

    // 8. 两个按钮（刷新价格每次会涨，实时读）
    if (battle.state === 'build') {
      const rp = battle.refreshPrice();
      drawButton(ctx, refreshButton, COLOR.refreshBtn, rp, battle.coins >= rp);
      drawButton(ctx, fightButton, COLOR.fightBtn, null, true);
    } else if (battle.state === 'over') {
      // 全屏压暗，中间出一个重新开始
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, battle.width, battle.height);
      drawButton(ctx, restartButton, COLOR.fightBtn, null, true);
    }

    // 9. 拖拽中的武器跟着手指，并在上方显示核心属性
    if (dragPoint && dragDef) {
      drawWeaponAimed(ctx, dragDef, dragPoint.x, dragPoint.y, slotIconSize * 0.8, -Math.PI / 2);
      drawDragHint(ctx, dragDef);
    }

    // 9.5 抽奖的两种提示
    if (battle.gacha.phase === 'jackpot') {
      // 三个槽位压暗，中间写奖励多少银币
      if (shop && shop.slots && shop.slots.length) {
        const a = shop.slots[0];
        const b2 = shop.slots[shop.slots.length - 1];
        ctx.fillStyle = 'rgba(10,12,18,0.62)';
        roundRectPath(ctx, a.x, a.y, (b2.x + b2.w) - a.x, a.h, a.w * 0.1);
        ctx.fill();
      }

      const size = Math.round(fontPx * 2.2);
      ctx.font = 'bold ' + size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = '豹子！+' + battle.gacha.reward + ' 银币';
      const cx = battle.width / 2;
      const cy = shop && shop.slots && shop.slots[0] ? shop.slots[0].y + shop.slots[0].h / 2 : battle.height * 0.85;

      ctx.lineWidth = Math.max(3, size * 0.14);
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(text, cx, cy);

      ctx.fillStyle = '#ffd94a';
      ctx.fillText(text, cx, cy);
    }

    if (battle.gacha.phase === 'result') {
      // 还有免费的卡没用：屏幕中间提示
      const size = Math.round(fontPx * 1.6);
      ctx.font = 'bold ' + size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = '还有免费的卡牌  未使用或卖出';
      const cx = battle.width / 2;
      const cy = battle.height * 0.62;

      ctx.lineWidth = Math.max(3, size * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(text, cx, cy);

      ctx.fillStyle = '#ffe9c9';
      ctx.fillText(text, cx, cy);
    }

    // 10. HUD：左上角银币
    drawHud(ctx);

    // 11. 右上角：第几波
    drawWave(ctx);
  }

  // 画槽位下方的价格：银币图标 + 数字，钱不够变红
  // slot - 商店槽位 { x, y, w, h, price }
  function drawSlotPrice(ctx, slot) {
    if (!slot.price) return;

    const afford = battle.coins >= slot.price;
    const fontSize = Math.max(10, Math.round(slot.h * 0.17));
    const iconR = fontSize * 0.45;
    const numText = String(slot.price);

    ctx.font = 'bold ' + fontSize + 'px sans-serif';
    ctx.textBaseline = 'middle';
    const numW = ctx.measureText(numText).width;

    const gap = fontSize * 0.3;
    const totalW = iconR * 2 + gap + numW;
    const startX = slot.x + (slot.w - totalW) / 2;
    const y = slot.y + slot.h * 0.84;

    drawCoin(ctx, startX + iconR, y, iconR);

    ctx.textAlign = 'left';
    ctx.fillStyle = afford ? COLOR.btnText : COLOR.btnTextOff;
    ctx.fillText(numText, startX + iconR * 2 + gap, y);
  }

  // 拖拽时在顶部居中显示这张卡的属性；拖到垃圾桶上就改成显示能卖多少钱
  // def - 卡牌表里的一行
  function drawDragHint(ctx, def) {
    // 顶部留白：不贴边，也不和左上角的银币打架
    const y = fontPx * 4.2;
    const size = Math.round(fontPx * 1.2);

    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let text;

    // 拖到垃圾桶上：显示能卖多少
    if (isOverTrash() && dragFromCell && dragFromCell.card) {
      text = '卖出 +' + battle.sellPrice(dragFromCell.card.def) + ' 银币';
    } else if (def.type === 'heal' || def.kind === 'heal') {
      text = '耐久 +' + (def.heal || 0);
    } else if (def.type === 'speed' || def.kind === 'speed') {
      const sec = ((def.durationMs || 0) / 1000).toFixed(1).replace(/\.0$/, '');
      text = '移动速度 ×' + (def.speedMul || 0) + '    持续 ' + sec + ' 秒';
    } else {
      // 攻速换成「每秒几次」，比毫秒直观
      const perSec = def.cdMs ? (1000 / def.cdMs).toFixed(2).replace(/0$/, '') : '0';
      text = '伤害 ' + (def.damage || 0) +
        '    攻击速度 ' + perSec + ' 次/秒' +
        '    数量 ×' + (def.shots || 1);
    }

    // 文字颜色压暗，外面描一圈浅边保证背景变化也看得清
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeText(text, battle.width / 2, y);

    ctx.fillStyle = 'rgba(46,56,74,0.95)';
    ctx.fillText(text, battle.width / 2, y);
  }

  // 手指（拖拽中）是否在垃圾桶上
  function isOverTrash() {
    if (!dragPoint || !dragDef) return false;
    const p = World.toWorld(dragPoint.x, dragPoint.y);
    return inside(p.x, p.y, trashRect);
  }

  // 抽到的卡，价格位显示「免费」
  function drawFreeLabel(ctx, slot) {
    const size = Math.max(10, Math.round(slot.h * 0.17));
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8fe0a8';
    ctx.fillText('免费', slot.x + slot.w / 2, slot.y + slot.h * 0.86);
  }

  // 画一个宝箱
  // tier - 0 铜 / 1 银 / 2 金
  function drawChest(ctx, slot, tier, price) {
    const themes = [
      { body: '#8a5a2b', lid: '#a06a33', band: '#d9a441' },
      { body: '#8f97a3', lid: '#aab3c0', band: '#e6edf5' },
      { body: '#b8860b', lid: '#d9a520', band: '#ffe680' },
    ];
    const th = themes[tier] || themes[0];

    const w = slot.w * 0.62;
    const h = slot.h * 0.5;
    const x = slot.x + (slot.w - w) / 2;
    const y = slot.y + slot.h * 0.18;

    // 箱体
    ctx.fillStyle = th.body;
    roundRectPath(ctx, x, y + h * 0.34, w, h * 0.66, w * 0.06);
    ctx.fill();

    // 箱盖
    ctx.fillStyle = th.lid;
    roundRectPath(ctx, x - w * 0.03, y, w * 1.06, h * 0.42, w * 0.06);
    ctx.fill();

    // 锁扣
    ctx.fillStyle = th.band;
    roundRectPath(ctx, x + w * 0.42, y + h * 0.28, w * 0.16, h * 0.36, w * 0.04);
    ctx.fill();

    // 名字
    const size = Math.max(10, Math.round(slot.w * 0.13));
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240,244,250,0.95)';
    ctx.fillText(['初级', '中级', '高级'][tier] || '', slot.x + slot.w / 2, slot.y + slot.h * 0.1);

    // 价格
    const iconR = size * 0.42;
    const numText = String(price);
    const numW = ctx.measureText(numText).width;
    const gap = size * 0.28;
    const total = iconR * 2 + gap + numW;
    const px = slot.x + (slot.w - total) / 2;
    const py = slot.y + slot.h * 0.86;

    drawCoin(ctx, px + iconR, py, iconR);

    ctx.textAlign = 'left';
    ctx.fillStyle = battle.coins >= price ? 'rgba(240,244,250,0.95)' : '#ff6a6a';
    ctx.fillText(numText, px + iconR * 2 + gap, py);
  }

  // 画商店外壳：先垫一层不透明底，再把图片 cover 进去。
  // 垫底是为了防两种情况：图片带透明区（背景草地会透上来）、图片还没加载完
  function drawShell(ctx) {
    const s = shop && shop.shell ? shop.shell : null;
    if (!s) return;

    // 1. 不透明底板
    ctx.fillStyle = '#1b2230';
    roundRectPath(ctx, s.x, s.y, s.w, s.h, Math.min(s.w, s.h) * 0.04);
    ctx.fill();

    if (!shellImg || !shellImg.image) return;

    // 2. 图片铺进盒子：缩放方式和对齐方式都由配置决定
    //    cover  按「铺满」缩放（比例不符时四边裁）
    //    width  按宽度缩放（高度可能溢出，上下按 anchor 裁）
    //    height 按高度缩放（宽度可能溢出，左右裁）
    const fit = tpl.shellFit || 'width';
    const anchor = tpl.shellAnchor || 'top';

    let scale;
    if (fit === 'height') scale = s.h / shellImg.height;
    else if (fit === 'cover') scale = Math.max(s.w / shellImg.width, s.h / shellImg.height);
    else scale = s.w / shellImg.width;

    const w = shellImg.width * scale;
    const h = shellImg.height * scale;

    // 水平：默认居中（宽度不会裁时无所谓）
    const dx = s.x + (s.w - w) / 2;

    // 垂直：top 保住顶部装饰边，bottom 贴底，center 居中裁
    let dy;
    if (anchor === 'bottom') dy = s.y + s.h - h;
    else if (anchor === 'center') dy = s.y + (s.h - h) / 2;
    else dy = s.y;

    ctx.save();
    roundRectPath(ctx, s.x, s.y, s.w, s.h, Math.min(s.w, s.h) * 0.04);
    ctx.clip();
    ctx.drawImage(shellImg.image, dx, dy, w, h);
    ctx.restore();

    // 3. 调试标记：洋红=盒子边框，黄=图片实际范围，红=盒子顶边
    if (cfg.template && cfg.template.debugShell) {
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      ctx.strokeStyle = '#ffe000';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + (s.w - w) / 2, s.y + (s.h - h) / 2, w, h);

      ctx.strokeStyle = '#ff2020';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.w, s.y);
      ctx.stroke();
    }
  }

  // 画垃圾桶；hover 时变红并掀盖子
  function drawTrash(ctx, hover) {
    const r = trashRect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    // 底板
    ctx.fillStyle = hover ? 'rgba(220,70,70,0.3)' : 'rgba(0,0,0,0.35)';
    roundRectPath(ctx, r.x, r.y, r.w, r.h, r.w * 0.18);
    ctx.fill();

    const bodyW = r.w * 0.42;
    const bodyH = r.h * 0.4;
    const bx = cx - bodyW / 2;
    const by = cy - bodyH * 0.3;
    const color = hover ? '#ff9a9a' : '#d6dde8';

    // 桶身
    ctx.fillStyle = color;
    roundRectPath(ctx, bx, by, bodyW, bodyH, bodyW * 0.16);
    ctx.fill();

    // 桶身竖纹
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, r.w * 0.03);
    for (let i = -1; i <= 1; i++) {
      const x = cx + i * bodyW * 0.26;
      ctx.beginPath();
      ctx.moveTo(x, by + bodyH * 0.22);
      ctx.lineTo(x, by + bodyH * 0.78);
      ctx.stroke();
    }

    // 盖子：hover 时掀起一个角度
    const lidW = bodyW * 1.24;
    const lidH = r.h * 0.09;
    ctx.fillStyle = color;

    if (hover) {
      ctx.save();
      ctx.translate(cx - lidW / 2, by - r.h * 0.12);
      ctx.rotate(-0.5);
      roundRectPath(ctx, 0, 0, lidW, lidH, lidH * 0.5);
      ctx.fill();
      ctx.restore();
    } else {
      roundRectPath(ctx, cx - lidW / 2, by - r.h * 0.12, lidW, lidH, lidH * 0.5);
      ctx.fill();
    }
  }

  // 画一个按钮：左边文字，右边「银币图标 + 价格」
  // btn - { x, y, w, h, label }
  // bg - 底色
  // cost - 要显示的价格，null 表示不显示
  // affordable - 钱够不够，不够就把价格画成红色
  function drawButton(ctx, btn, bg, cost, affordable) {
    roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, btn.h * 0.25);
    ctx.fillStyle = bg;
    ctx.fill();

    const pad = btn.w * 0.08;
    const fontSize = Math.round(btn.h * 0.36);

    ctx.font = 'bold ' + fontSize + 'px sans-serif';
    ctx.textBaseline = 'middle';

    // 没有价格的就居中写（开始战斗 / 重新开始）
    if (!cost) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLOR.btnText;
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      return;
    }

    // 左边：按钮名字
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOR.btnText;
    ctx.fillText(btn.label, btn.x + pad, btn.y + btn.h / 2);

    // 右边：银币图标 + 数字
    {
      const numText = String(cost);
      ctx.font = fontSize + 'px sans-serif';
      const numW = ctx.measureText(numText).width;

      const iconR = btn.h * 0.16;
      const rightX = btn.x + btn.w - pad;
      const iconX = rightX - numW - iconR * 1.4;

      drawCoin(ctx, iconX, btn.y + btn.h / 2, iconR);

      ctx.textAlign = 'right';
      ctx.fillStyle = affordable ? COLOR.btnText : COLOR.btnTextOff;
      ctx.fillText(numText, rightX, btn.y + btn.h / 2);
    }
  }

  // 右上角：第几波
  function drawWave(ctx) {
    const wave = battle.wave;
    const text = wave > 0 ? '第 ' + wave + ' 波' : '待战';
    const size = Math.round(fontPx * 1.5);

    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const padX = size * 0.5;
    const padY = size * 0.35;
    const tw = ctx.measureText(text).width;
    const boxW = tw + padX * 2;
    const boxH = size + padY * 2;

    const x = battle.width - 12 - boxW;
    const y = 12;

    ctx.fillStyle = COLOR.hudBg;
    roundRectPath(ctx, x, y, boxW, boxH, boxH * 0.3);
    ctx.fill();

    ctx.fillStyle = COLOR.hud;
    ctx.fillText(text, x + boxW - padX, y + boxH / 2);
  }

  // 画 HUD：只剩银币图标 + 数量，左上角，字号放大
  function drawHud(ctxRef) {
    const coins = battle.coins;
    const size = Math.round(fontPx * 1.7);
    const iconR = size * 0.5;
    const numText = String(coins);

    ctxRef.font = 'bold ' + size + 'px sans-serif';
    ctxRef.textAlign = 'left';
    ctxRef.textBaseline = 'middle';

    const padX = size * 0.5;
    const padY = size * 0.35;
    const numW = ctxRef.measureText(numText).width;
    const gap = size * 0.3;
    const boxW = padX * 2 + iconR * 2 + gap + numW;
    const boxH = size + padY * 2;

    // 半透明底板，保证任何背景上都看得清
    ctxRef.fillStyle = COLOR.hudBg;
    roundRectPath(ctxRef, 12, 12, boxW, boxH, boxH * 0.3);
    ctxRef.fill();

    // 银币图标
    const iconCx = 12 + padX + iconR;
    const iconCy = 12 + boxH / 2;
    drawCoin(ctxRef, iconCx, iconCy, iconR);

    // 数量
    ctxRef.fillStyle = COLOR.hud;
    ctxRef.fillText(numText, iconCx + iconR + gap, iconCy);
  }

  // HUD 的文字在 drawHud 里画，不需要额外的上下文变量

  /* ---------- 点击 ---------- */
  // 点是否落在矩形里
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 屏幕坐标是否落在某个格子上
  // x, y - 世界坐标
  // 返回 Cell 或 null
  function cellAtPoint(x, y) {
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (inside(x, y, cell)) return cell;
    }
    return null;
  }

  // 世界坐标是否落在某个商店槽位上
  // x, y - 世界坐标
  // 返回 Slot 或 null
  function slotAtPoint(x, y) {
    if (!shop || !shop.slots) return null;
    for (let i = 0; i < shop.slots.length; i++) {
      if (inside(x, y, shop.slots[i])) return shop.slots[i];
    }
    return null;
  }

  // 拖拽中：记下手指位置；第一次移动时把源格子/槽位「拔出来」
  function handleDrag(x, y) {
    if (battle.state !== 'build' || !dragDef) return;

    // 还没标记源：现在确认是在拖，把源空出来
    if (!dragFromCell && !dragFromSlot) {
      dragFromCell = pendingCell;
      dragFromSlot = pendingSlot;
    }

    dragPoint = { x: x, y: y };
  }

  // 拖拽落地：从商店拖是买，从棋盘拖是移动 / 合成
  // sx, sy - 按下的位置；ex, ey - 抬手的位置；moved - 是否真的拖动了
  // 返回 true 表示成功了
  function handleDrop(sx, sy, ex, ey, moved) {
    // 先取回源，再清状态
    const fromCell = dragFromCell;
    const fromSlot = dragFromSlot;

    dragPoint = null;
    dragDef = null;
    pendingCell = null;
    pendingSlot = null;
    dragFromCell = null;
    dragFromSlot = null;

    if (!moved || battle.state !== 'build') return false;
    if (battle.gacha.phase === 'chests' || battle.gacha.phase === 'rolling') return false;

    const to = World.toWorld(ex, ey);
    const toCell = cellAtPoint(to.x, to.y);

    // 0. 丢到垃圾桶上：卖掉（只对棋盘上的卡有效）
    if (fromCell && fromCell.card && inside(to.x, to.y, trashRect)) {
      const gain = battle.sellCard(fromCell);
      lastLine = '卖出 +' + gain;
      return gain > 0;
    }

    // 1. 从商店槽位拖出来：买
    if (fromSlot && !fromSlot.sold && fromSlot.weapon) {
      battle.selectSlot(fromSlot);
      if (!toCell) {
        lastLine = '没放到格子上';
        return false;
      }
      const ok = battle.placeWeapon(toCell, battle.selected);
      lastLine = ok ? '买到第 ' + toCell.index + ' 格' : '放不了（不同类/满级/没钱）';
      return ok;
    }

    // 2. 从棋盘格子拖出来：移动 或 合成
    if (fromCell && fromCell.card) {
      if (!toCell) {
        lastLine = '没放到格子上';
        return false;
      }
      const ok = battle.moveWeapon(fromCell, toCell);
      lastLine = ok ? (toCell.card.level > 1 ? '合到 ' + toCell.card.level + ' 级' : '挪过去了') : '挪不了（不同类/满级）';
      return ok;
    }

    lastLine = '没拖动东西';
    return false;
  }

  // 把一次点击派给按钮 / 槽位 / 格子
  function handleTap(x, y) {
    lastLine = '';

    // 结束了只认重新开始
    if (battle.state === 'over') {
      if (inside(x, y, restartButton)) {
        restartButton.onTap();
        return true;
      }
      return false;
    }

    // 按钮是屏幕坐标，不缩放
    if (battle.state === 'build') {
      // 抽奖：没开就进选宝箱，开着就取消恢复
      if (inside(x, y, gachaBtn)) {
        if (battle.gacha.phase === 'off') {
          battle.enterChestSelect();
          lastLine = '选宝箱';
          return true;
        }
        if (battle.gacha.phase === 'chests') {
          battle.exitGacha();     // 返回：恢复抽奖前的卡槽
          lastLine = '返回';
          return true;
        }
        return false;
      }

      if (battle.gacha.phase === 'off' && inside(x, y, refreshButton)) {
        refreshButton.onTap();
        return true;
      }
      if (inside(x, y, fightButton)) {
        fightButton.onTap();
        return true;
      }
    }

    // 槽位和格子在世界上，先把点击位置换算回世界坐标
    const pt = World.toWorld(x, y);
    const x0 = pt.x;
    const y0 = pt.y;

    // 按下时先记下可能拖的东西，等真移动了才「拔出来」
    pendingCell = null;
    pendingSlot = null;

    // 商店槽位：选中这把武器（拖拽时用来显示跟随图标）
    if (shop && shop.slots) {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (!inside(x0, y0, slot)) continue;

        // 宝箱阶段：槽位里没有武器，先判抽奖，不能走下面的「槽位空了」
        if (battle.gacha.phase === 'chests') {
          const ok = battle.buyChest(i);
          lastLine = ok ? '开宝箱' : '银币不够';
          return ok;
        }

        // 滚动中不能点
        if (battle.gacha.phase === 'rolling') return false;

        // 正常阶段：卖掉了或没卡就是空的
        if (slot.sold || !slot.weapon) {
          lastLine = '槽位空了';
          return false;
        }

        battle.selectSlot(slot);
        dragDef = slot.weapon;
        pendingSlot = slot;
        lastLine = '选中 ' + slot.weapon.name + ' ' + slot.level + ' 级（' + slot.price + '）';
        return true;
      }
    }

    // 棋盘格子：放武器 / 合成；同时记下拖的什么，供拖拽显示
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!inside(x0, y0, cell)) continue;

      if (cell.card) {
        dragDef = cell.card.def;
        pendingCell = cell;
      } else if (battle.selected) {
        dragDef = battle.weaponDef(battle.selected.name, 1);
      }

      const before = cell.card ? cell.card.level : 0;
      const ok = battle.placeWeapon(cell, battle.selected);
      if (!ok) {
        lastLine = cell.card ? '合不了（不同类/满级/没钱）' : '放不了（没钱）';
      } else if (before) {
        lastLine = '合成到 ' + cell.card.level + ' 级';
      } else {
        lastLine = '放到第 ' + cell.index + ' 格';
      }
      return ok;
    }

    return false;
  }

  /* ---------- 挂到两条流水线上 ---------- */
  Ticker.onFrame(function (dt) {
    battle.update(dt);
  });

  // 绘制里任何错误都要打出来，否则会静默变成「半屏不显示」
  let paintErrLogged = false;
  Overlay.onDraw(function (ctx) {
    try {
      paintAll(ctx);
    } catch (e) {
      if (!paintErrLogged) {
        paintErrLogged = true;
        console.error('[battle-view] 绘制出错：' + ((e && e.stack) || e));
      }
    }
  });

  // 波次日志（只留必要的，方便在手机上确认流程）
  battle.onWaveStart = function (n, count) {
    console.log('[battle] 第 ' + n + ' 波开始，怪物 ' + count + ' 只');
  };
  battle.onWaveEnd = function (n, bonus) {
    console.log('[battle] 第 ' + n + ' 波结束，回到布阵，奖励 +' + (bonus || 0) + ' 银币');
  };
  battle.onOver = function () {
    console.log('[battle] 篝火灭了，本局结束');
  };

  console.log('[battle-view] 按钮 ' + Math.round(leftX) + ',' + Math.round(by) +
    ' 尺寸 ' + Math.round(buttonW) + 'x' + Math.round(buttonH) +
    '；篝火 ' + Math.round(battle.campfire.x) + ',' + Math.round(battle.campfire.y));

  return { handleTap: handleTap, handleDrag: handleDrag, handleDrop: handleDrop };
}

module.exports = { create: create };
