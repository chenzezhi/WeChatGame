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
  coin: '#f5c542',
  coinDark: '#a1761a',
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

// 画一枚银币图标
// cx, cy - 圆心；r - 半径
function drawCoin(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.coin;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.28);
  ctx.strokeStyle = COLOR.coinDark;
  ctx.stroke();
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

// 按武器表里的 kind 分发
// def - 武器表里的一行（含 kind / color）
function drawWeapon(ctx, def, cx, cy, s) {
  const kind = def.kind || 'sword';
  const color = def.color || '#d8dee8';

  if (kind === 'axe') return drawAxeShape(ctx, color, cx, cy, s);
  if (kind === 'spear') return drawSpearShape(ctx, color, cx, cy, s);
  if (kind === 'staff') return drawStaffShape(ctx, color, cx, cy, s);
  return drawSwordShape(ctx, color, cx, cy, s);
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
  const monsterSize = board.cellW * 0.7;
  const campfireSize = board.cellW * (tpl.campfireSizeRatio == null ? 1 : tpl.campfireSizeRatio);
  const fontPx = Math.max(12, Math.round(board.cellW * 0.16));

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

  // 上一次操作的结果，HUD 最后一段显示
  let lastLine = '';

  /* ---------- 绘制 ---------- */
  // 把这一帧所有动态内容画出来
  // ctx - Canvas 2D 上下文，坐标是画布物理像素
  function paintAll(ctx) {
    // 1. 篝火
    drawCampfire(ctx, battle.campfire.x, battle.campfire.y, campfireSize);

    // 2. 人物位置，用来判断哪些格子的武器要让人物「压住」
    const p = battle.player ? battle.player.position() : null;
    const hideR = board.cellW * 0.55;

    // 3. 格子上的武器
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!cell.card || !cell.card.def) continue;

      const ccx = cell.x + cell.w / 2;
      const ccy = cell.y + cell.h / 2;

      // 人物站在这格上：武器不画，视觉上就是人物在上面
      if (p) {
        const dx = p.x + board.cellW / 2 - ccx;
        const dy = p.y + board.cellH / 2 - ccy;
        if (Math.sqrt(dx * dx + dy * dy) < hideR) continue;
      }

      drawWeapon(ctx, cell.card.def, ccx, ccy, cardSize);
    }

    // 4. 商店槽位里的武器（卖掉的槽位不画）
    if (shop && shop.slots && battle.state === 'build') {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (slot.sold || !slot.weapon) continue;
        drawWeapon(ctx, slot.weapon, slot.x + slot.w / 2, slot.y + slot.h / 2, slotIconSize);
      }
    }

    // 5. 怪物
    for (let i = 0; i < battle.monsters.length; i++) {
      const m = battle.monsters[i];
      drawMonster(ctx, m.x, m.y, monsterSize, m.maxHp ? m.hp / m.maxHp : 1, m.rec.kind);
    }

    // 6. 子弹：长得跟武器一样，只是小一号
    for (let i = 0; i < battle.bullets.length; i++) {
      const b = battle.bullets[i];
      drawWeapon(ctx, b.def, b.x, b.y, bulletSize);
    }

    // 7. 战斗时盖住商店
    if (shop && shop.shell && battle.state !== 'build') {
      ctx.fillStyle = COLOR.mask;
      ctx.fillRect(shop.shell.x, shop.shell.y, shop.shell.w, shop.shell.h);
    }

    // 8. 两个按钮
    if (battle.state === 'build') {
      drawButton(ctx, refreshButton, COLOR.refreshBtn, battle.coins >= refreshButton.cost);
      drawButton(ctx, fightButton, COLOR.fightBtn, true);
    }

    // 9. HUD
    drawHud(ctx);
  }

  // 画一个按钮：左边文字，右边「银币图标 + 价格」
  // btn - { x, y, w, h, label, cost }
  // bg - 底色
  // affordable - 钱够不够，不够就把价格画成红色
  function drawButton(ctx, btn, bg, affordable) {
    roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, btn.h * 0.25);
    ctx.fillStyle = bg;
    ctx.fill();

    const pad = btn.w * 0.08;
    const fontSize = Math.round(btn.h * 0.36);

    ctx.font = 'bold ' + fontSize + 'px sans-serif';
    ctx.textBaseline = 'middle';

    // 左边：按钮名字
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOR.btnText;
    ctx.fillText(btn.label, btn.x + pad, btn.y + btn.h / 2);

    // 右边：银币图标 + 数字
    if (btn.cost) {
      const numText = String(btn.cost);
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

  // 画 HUD：银币 / 耐久 / 波次 / 剩余怪
  function drawHud(ctxRef) {
    const s = battle.status();
    let text = '银币 ' + s.coins + '   耐久 ' + s.hp + '   第 ' + s.wave + ' 波   怪 ' + s.alive;
    if (lastLine) text += '   ' + lastLine;

    ctxRef.font = fontPx + 'px sans-serif';
    ctxRef.textAlign = 'left';
    ctxRef.textBaseline = 'top';

    const padX = fontPx * 0.6;
    const padY = fontPx * 0.4;
    const tw = ctxRef.measureText(text).width;

    ctxRef.fillStyle = COLOR.hudBg;
    roundRectPath(ctxRef, 12, 12, tw + padX * 2, fontPx + padY * 2, fontPx * 0.3);
    ctxRef.fill();

    ctxRef.fillStyle = COLOR.hud;
    ctxRef.fillText(text, 12 + padX, 12 + padY);
  }

  // HUD 的文字在 drawHud 里画，不需要额外的上下文变量

  /* ---------- 点击 ---------- */
  // 点是否落在矩形里
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 把一次点击派给按钮 / 槽位 / 格子
  function handleTap(x, y) {
    lastLine = '';

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

    // 商店槽位：选中这把武器
    if (shop && shop.slots) {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (!inside(x, y, slot)) continue;
        if (slot.sold || !slot.weapon) {
          lastLine = '槽位空了';
          return false;
        }
        battle.selectedWeapon = slot.weapon.name;
        lastLine = '选中 ' + slot.weapon.name;
        return true;
      }
    }

    // 棋盘格子：放武器 / 合成
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!inside(x, y, cell)) continue;

      const before = cell.card ? cell.card.level : 0;
      const ok = battle.placeWeapon(cell, battle.selectedWeapon);
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

  Overlay.onDraw(function (ctx) {
    paintAll(ctx);
  });

  // 波次日志（只留必要的，方便在手机上确认流程）
  battle.onWaveStart = function (n, count) {
    console.log('[battle] 第 ' + n + ' 波开始，怪物 ' + count + ' 只');
  };
  battle.onWaveEnd = function (n) {
    console.log('[battle] 第 ' + n + ' 波结束，回到布阵');
  };
  battle.onOver = function () {
    console.log('[battle] 篝火灭了，本局结束');
  };

  console.log('[battle-view] 按钮 ' + Math.round(leftX) + ',' + Math.round(by) +
    ' 尺寸 ' + Math.round(buttonW) + 'x' + Math.round(buttonH) +
    '；篝火 ' + Math.round(battle.campfire.x) + ',' + Math.round(battle.campfire.y));

  return { handleTap: handleTap };
}

module.exports = { create: create };
