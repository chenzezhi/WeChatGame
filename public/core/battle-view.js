'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面（原生画布绘制）
 *
 * 每帧：Ticker 推进 Battle 逻辑 → Overlay 用 Canvas 2D 直接画。
 * 画的东西：篝火、格子上的武器、怪物、子弹、HUD、开始按钮、商店遮罩。
 *
 * 之所以不用 cax 的图形对象：这个版本的 cax 里 Polygon 构造不报错但画不出来，
 * 复杂形状画不了。cax 继续负责静态内容（背景 / 棋盘 / 商店），
 * 会动和需要细节的东西全部走这里。
 * ==============================================*/

/* ==================== 用法 ====================
 * const view = BattleView.create({ stage, sm, board, shop, battle, config: COMBAT });
 * view.handleTap(x, y);   // 画布物理像素坐标
 * ==============================================*/

/* ==================== 注意 ====================
 * 逻辑和绘制分开：battle.update(dt) 挂在 Ticker，绘制挂在 Overlay。
 * 坐标全部是画布物理像素，和棋盘 / 商店用同一套坐标。
 * ==============================================*/

const Overlay = require('./overlay.js');
const Ticker = require('./ticker.js');

// 色板
const COLOR = {
  blade: '#e6ecf5',
  bladeEdge: '#38404f',
  guard: '#c9a14a',
  hilt: '#6b4a2a',
  bullet: '#ffd24a',
  monster: '#a83b3b',
  monsterDark: '#6e2222',
  monsterEye: '#fff4c9',
  campStone: '#4a4a52',
  campFlame: '#e8622a',
  campInner: '#f7d24a',
  campLog: '#7a5433',
  button: '#8b2f2f',
  refresh: '#2f6b8b',
  buttonText: '#ffe9c9',
  hud: '#ffffff',
  hudBg: 'rgba(0,0,0,0.45)',
  mask: '#12121a',
  mark: '#ffffff',
  hpBack: '#3a1a1a',
  hpFill: '#e04b4b',
};

// 画一个圆角矩形路径
// ctx - 画布上下文
// x, y, w, h - 矩形，单位 px
// r - 圆角半径
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

// 画一把剑当武器图标（中心点 cx, cy，整体高度 s）
function drawSword(ctx, cx, cy, s) {
  const bladeW = Math.max(3, s * 0.22);
  const bladeH = s * 0.52;
  const guardW = s * 0.56;
  const guardH = Math.max(2, s * 0.1);
  const hiltW = Math.max(2, s * 0.16);
  const hiltH = s * 0.2;

  const top = cy - s * 0.5;

  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.strokeStyle = COLOR.bladeEdge;

  // 剑身
  roundRectPath(ctx, cx - bladeW / 2, top, bladeW, bladeH, bladeW * 0.3);
  ctx.fillStyle = COLOR.blade;
  ctx.fill();
  ctx.stroke();

  // 剑格
  roundRectPath(ctx, cx - guardW / 2, top + bladeH, guardW, guardH, guardH * 0.4);
  ctx.fillStyle = COLOR.guard;
  ctx.fill();
  ctx.stroke();

  // 剑柄
  roundRectPath(ctx, cx - hiltW / 2, top + bladeH + guardH, hiltW, hiltH, hiltW * 0.4);
  ctx.fillStyle = COLOR.hilt;
  ctx.fill();
  ctx.stroke();
}

// 画一个小怪（中心点 cx, cy，整体尺寸 s）
// hpRatio - 剩余血量比例 0~1，用来画血条
function drawMonster(ctx, cx, cy, s, hpRatio) {
  const r = s * 0.34;

  // 两只角
  ctx.fillStyle = COLOR.monsterDark;
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
  ctx.fillStyle = COLOR.monster;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.strokeStyle = COLOR.monsterDark;
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
    ctx.fillStyle = COLOR.monsterDark;
    ctx.fill();
  }

  // 嘴
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.42, r * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  ctx.lineWidth = Math.max(1.2, s * 0.04);
  ctx.strokeStyle = COLOR.monsterDark;
  ctx.stroke();

  // 血条：只在小怪头顶
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

// 画篝火（中心点 cx, cy，整体尺寸 s）
function drawCampfire(ctx, cx, cy, s) {
  // 柴火：两根交叉的棕色条
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

  // 石圈：几块深灰圆当围石
  ctx.fillStyle = COLOR.campStone;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * s * 0.34, cy + s * 0.28 + Math.sin(a) * s * 0.1, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // 外焰：曲线画出的火苗
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

// 画一颗子弹
function drawBullet(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.bullet;
  ctx.fill();
}

// 创建战斗视图
// options - { stage, sm, board, shop, battle, config }
// 返回 { handleTap(x, y), refresh() }
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
  const cardSize = board.cellW * 0.55;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.55;
  const bulletR = board.cellW * 0.06;
  const monsterSize = board.cellW * 0.7;
  const campfireSize = board.cellW * (tpl.campfireSizeRatio == null ? 1 : tpl.campfireSizeRatio);
  const fontPx = Math.max(12, Math.round(board.cellW * 0.16));

  /* ---------- 两个按钮：刷新（左）+ 开始战斗（右），大小一样 ---------- */
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

  // 刷新按钮：花银币把卡槽补满
  const refreshButton = {
    x: leftX,
    y: by,
    w: buttonW,
    h: buttonH,
    label: '刷新',
    onTap: function () {
      const ok = battle.refreshShop();
      lastLine = ok ? '已刷新（-' + (tpl.refreshCost || 0) + ' 银币）' : '银币不够刷新';
    },
  };

  // 开始战斗按钮：进入下一波
  const fightButton = {
    x: leftX + buttonW + buttonGap,
    y: by,
    w: buttonW,
    h: buttonH,
    label: '开始战斗',
    onTap: function () {
      if (battle.state === 'over') {
        lastLine = '本局已结束';
        return;
      }
      const ok = battle.startWave();
      lastLine = ok ? '开打：第 ' + battle.wave + ' 波' : '没有下一波了（加数据）';
    },
  };

  // 运行时状态
  let lastLine = '等待点击';
  let lastTap = null;

  /* ---------- 绘制：一整帧 ---------- */
  // 把这一帧所有动态内容画出来
  // ctx - Canvas 2D 上下文，坐标是画布物理像素
  function paintAll(ctx) {
    // 1. 篝火
    drawCampfire(ctx, battle.campfire.x, battle.campfire.y, campfireSize);

    // 2. 格子上的武器
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!cell.card) continue;
      drawSword(ctx, cell.x + cell.w / 2, cell.y + cell.h / 2, cardSize);
    }

    // 3. 商店槽位里的武器图标（卖掉的槽位不画）
    if (shop && shop.slots && battle.state === 'build') {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (slot.sold || !slot.weapon) continue;
        drawSword(ctx, slot.x + slot.w / 2, slot.y + slot.h / 2, slotIconSize);
      }
    }

    // 4. 怪物
    for (let i = 0; i < battle.monsters.length; i++) {
      const m = battle.monsters[i];
      drawMonster(ctx, m.x, m.y, monsterSize, m.maxHp ? m.hp / m.maxHp : 1);
    }

    // 5. 子弹
    for (let i = 0; i < battle.bullets.length; i++) {
      const b = battle.bullets[i];
      drawBullet(ctx, b.x, b.y, bulletR);
    }

    // 6. 战斗时盖住商店
    if (shop && shop.shell && battle.state !== 'build') {
      ctx.fillStyle = COLOR.mask;
      ctx.fillRect(shop.shell.x, shop.shell.y, shop.shell.w, shop.shell.h);
    }

    // 7. 两个按钮：刷新 + 开始战斗（布阵阶段才显示）
    if (battle.state === 'build') {
      const buttons = [refreshButton, fightButton];

      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];

        roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, btn.h * 0.25);
        ctx.fillStyle = i === 0 ? COLOR.refresh : COLOR.button;
        ctx.fill();

        ctx.fillStyle = COLOR.buttonText;
        ctx.font = 'bold ' + Math.round(btn.h * 0.42) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      }
    }

    // 8. HUD
    const s = battle.status();
    let text = '银币 ' + s.coins + '   耐久 ' + s.hp + '   第 ' + s.wave + ' 波   怪 ' + s.alive;
    if (lastTap) text += '   点击 ' + Math.round(lastTap.x) + ',' + Math.round(lastTap.y);
    text += '   ' + lastLine;

    ctx.font = fontPx + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const padX = fontPx * 0.6;
    const padY = fontPx * 0.4;
    const tw = ctx.measureText(text).width;

    ctx.fillStyle = COLOR.hudBg;
    roundRectPath(ctx, 12, 12, tw + padX * 2, fontPx + padY * 2, fontPx * 0.3);
    ctx.fill();

    ctx.fillStyle = COLOR.hud;
    ctx.fillText(text, 12 + padX, 12 + padY);

    // 9. 点击标记
    if (lastTap && Date.now() - lastTap.at < 400) {
      ctx.fillStyle = COLOR.mark;
      ctx.fillRect(lastTap.x - 10, lastTap.y - 10, 20, 20);
    }
  }

  /* ---------- 点击派活：按钮 → 槽位 → 格子 ---------- */
  // 点是否落在矩形里
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 把一次点击派出去
  // x, y - 画布物理像素坐标
  // 返回 true 表示有人接手了
  function handleTap(x, y) {
    lastTap = { x: x, y: y, at: Date.now() };
    lastLine = '未命中';

    // 1. 两个按钮
    if (battle.state === 'build') {
      if (inside(x, y, refreshButton)) {
        refreshButton.onTap();
        return true;
      }
      if (inside(x, y, fightButton)) {
        fightButton.onTap();
        return true;
      }
    }

    // 2. 商店槽位
    if (shop && shop.slots) {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (inside(x, y, slot)) {
          if (slot.sold || !slot.weapon) {
            lastLine = '这个槽位空了';
            return false;
          }
          battle.selectedWeapon = slot.weapon.name;
          lastLine = '选中 ' + battle.selectedWeapon;
          return true;
        }
      }
    }

    // 3. 棋盘格子
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (inside(x, y, cell)) {
        const ok = battle.placeWeapon(cell, battle.selectedWeapon);
        lastLine = ok ? '第 ' + cell.index + ' 格放好了' : '放不了（已有/没钱）';
        return ok;
      }
    }

    return false;
  }

  /* ---------- 挂到两条流水线上 ---------- */
  // 逻辑每帧推进
  Ticker.onFrame(function (dt) {
    battle.update(dt);
  });

  // 画面每帧绘制（在 cax 之后）
  Overlay.onDraw(paintAll);

  // 波次日志
  battle.onWaveStart = function (n) {
    console.log('[battle] 第 ' + n + ' 波开始');
  };
  battle.onWaveEnd = function (n) {
    console.log('[battle] 第 ' + n + ' 波结束，回到布阵');
  };
  battle.onOver = function () {
    console.log('[battle] 耐久归零，本局结束');
  };

  console.log('[battle-view] 用原生 ctx 绘制；篝火 ' +
    Math.round(battle.campfire.x) + ',' + Math.round(battle.campfire.y) +
    '；按钮 ' + Math.round(leftX) + ',' + Math.round(by) +
    ' 尺寸 ' + Math.round(buttonW) + 'x' + Math.round(buttonH));

  return { handleTap: handleTap, refresh: function () {} };
}

module.exports = { create: create };
