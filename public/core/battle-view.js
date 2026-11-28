'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面接线
 *
 * 每帧：推进 Battle 逻辑 → 把结果画出来。
 * 负责武器图标、子弹、怪物、HUD、开始按钮、商店遮罩，
 * 并把一次点击派给按钮 / 槽位 / 格子。
 *
 * 现在所有图形都是画布直接画的简单形状（箭、圆点、圆块），不依赖素材。
 * 有美术后把这些 makeXxx 换成 sm.add(...) 即可，坐标一行都不用改。
 * ==============================================*/

/* ==================== 用法 ====================
 * const view = BattleView.create({ stage, sm, board, shop, battle, config: COMBAT });
 * view.handleTap(x, y);   // x, y 是画布物理像素
 * ==============================================*/

/* ==================== 注意 ====================
 * **每帧必须先调用 battle.update(dt)**，否则怪物不生成、人物不开火。
 *
 * 坐标单位 px。对象都复用（visible 控制显隐），因为这个版本的 cax 没有节点 remove。
 * 点击有没有被收到、落在哪，显示在左上角 HUD 上，不开控制台也能判断。
 * ==============================================*/

const cax = require('../../libs/cax.js');
const Ticker = require('./ticker.js');

// 占位色板
const COLOR = {
  card: '#e8e0c0',      // 武器图标底色
  arrow: '#38404f',     // 武器图标的箭头
  bullet: '#f0c040',    // 子弹
  monster: '#a03a3a',   // 怪物
  button: '#8b2f2f',    // 按钮
  mask: '#12121a',      // 商店遮罩
  mark: '#ffffff',      // 点击标记
};

// 画一块纯色方块
// w, h - 尺寸，单位 px
// color - 填充色
// 返回 cax.Rect
function makeRect(w, h, color) {
  return new cax.Rect(w, h, { fillStyle: color });
}

// 画一个向上的箭头，当武器图标用
// size - 箭头边长，单位 px
// color - 填充色
// 返回 cax.Polygon，取不到 Polygon 时退回方块
function makeArrow(size, color) {
  const s = size;
  const points = [
    [s * 0.5, 0],
    [s, s * 0.42],
    [s * 0.68, s * 0.42],
    [s * 0.68, s],
    [s * 0.32, s],
    [s * 0.32, s * 0.42],
    [0, s * 0.42],
  ];

  try {
    return new cax.Polygon(points, { fillStyle: color });
  } catch (err) {
    console.warn('[battle-view] Polygon 不可用，退回方块：' + err.message);
    return makeRect(size, size, color);
  }
}

// 画一个圆点（子弹、怪物都用它）
// r - 半径，单位 px
// color - 填充色
// 返回 cax.Circle，取不到时退回方块
function makeDot(r, color) {
  try {
    return new cax.Circle(r, { fillStyle: color });
  } catch (err) {
    console.warn('[battle-view] Circle 不可用，退回方块：' + err.message);
    return makeRect(r * 2, r * 2, color);
  }
}

// 创建战斗视图
// options - { stage, sm, board, shop, battle, config }
// 返回 { handleTap(x, y), refresh() }
function create(options) {
  const o = options || {};
  const stage = o.stage;
  const board = o.board;
  const shop = o.shop;
  const battle = o.battle;

  if (!stage || !board || !battle) {
    console.warn('[battle-view] 缺少 stage / board / battle，战斗画面没有创建');
    return null;
  }

  // 尺寸，单位 px
  const cardSize = board.cellW * 0.42;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.42;
  const bulletR = board.cellW * 0.06;
  const monsterR = board.cellW * 0.22;

  // 复用池
  const cards = {};            // 格子序号 → 武器图标
  const monsterSprites = [];
  const bulletSprites = [];
  const slotSprites = [];

  /* ---------- 1. 商店槽位里的武器图标 ---------- */
  if (shop && shop.slots) {
    const weapon = battle.weapons[0] || null;
    for (let i = 0; i < shop.slots.length; i++) {
      const slot = shop.slots[i];

      // 图标底下垫一块浅色底，让箭头看得清
      const bg = makeRect(slotIconSize * 1.3, slotIconSize * 1.3, COLOR.card);
      bg.x = slot.x + (slot.w - slotIconSize * 1.3) / 2;
      bg.y = slot.y + (slot.h - slotIconSize * 1.3) / 2;
      stage.add(bg);

      const icon = makeArrow(slotIconSize, COLOR.arrow);
      icon.x = slot.x + (slot.w - slotIconSize) / 2;
      icon.y = slot.y + (slot.h - slotIconSize) / 2;
      stage.add(icon);

      slotSprites.push(icon);
      slot.weaponName = weapon ? weapon.name : null;
    }
  }

  /* ---------- 2. 商店遮罩：战斗时盖住商店 ---------- */
  let mask = null;
  if (shop && shop.shell) {
    mask = makeRect(shop.shell.w, shop.shell.h, COLOR.mask);
    mask.x = shop.shell.x;
    mask.y = shop.shell.y;
    mask.visible = false;
    stage.add(mask);
  }

  /* ---------- 3. 开始战斗按钮：卡牌槽下面 ---------- */
  const buttonW = board.cellW * 1.8;
  const buttonH = board.cellH * 0.5;
  const slot0 = shop && shop.slots && shop.slots[0] ? shop.slots[0] : null;
  const slotY = slot0 ? slot0.y : battle.height * 0.82;
  const slotH = slot0 ? slot0.h : 0;

  let by = slotY + slotH + board.cellH * 0.12;
  by = Math.min(by, battle.height - buttonH - 8);

  const button = {
    x: (battle.width - buttonW) / 2,
    y: by,
    w: buttonW,
    h: buttonH,
    onTap: function () {
      if (battle.state === 'over') {
        lastLine = '本局已结束';
        return;
      }
      const ok = battle.startWave();
      lastLine = ok ? '开打：第 ' + battle.wave + ' 波' : '开不了（看控制台）';
    },
  };

  const buttonRect = makeRect(button.w, button.h, COLOR.button);
  buttonRect.x = button.x;
  buttonRect.y = button.y;
  stage.add(buttonRect);

  /* ---------- 4. HUD + 点击标记 ---------- */
  let hud = null;
  let lastLine = '等待点击';
  let lastTap = null;

  try {
    hud = new cax.Text('', { font: '22px sans-serif', color: '#ffffff' });
    hud.x = 20;
    hud.y = 20;
    stage.add(hud);
  } catch (err) {
    console.warn('[battle-view] HUD 创建失败：' + err.message);
  }

  const mark = makeRect(24, 24, COLOR.mark);
  mark.visible = false;
  stage.add(mark);

  // 更新 HUD
  function syncHud() {
    const s = battle.status();
    let text = '银币 ' + s.coins + ' 耐久 ' + s.hp + ' 第 ' + s.wave + ' 波  怪 ' + s.alive;

    if (lastTap) text += '  |  点击 ' + Math.round(lastTap.x) + ',' + Math.round(lastTap.y);
    text += '  |  ' + lastLine;

    if (hud) {
      try {
        hud.text = text;
      } catch (e) {
        /* 字段名不兼容就算了 */
      }
    }

    if (lastTap && Date.now() - lastTap.at < 400) {
      mark.visible = true;
      mark.x = lastTap.x - 12;
      mark.y = lastTap.y - 12;
    } else {
      mark.visible = false;
    }
  }

  /* ---------- 5. 每帧同步 ---------- */
  // 格子上的武器图标
  function syncCards() {
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      let sp = cards[i];

      if (!cell.card) {
        if (sp) sp.visible = false;
        continue;
      }

      if (!sp) {
        sp = makeArrow(cardSize, COLOR.arrow);
        sp.x = cell.x + (cell.w - cardSize) / 2;
        sp.y = cell.y + (cell.h - cardSize) / 2;
        cards[i] = sp;
        stage.add(sp);
      }
      sp.visible = true;
    }
  }

  // 怪物
  function syncMonsters() {
    const list = battle.monsters;

    while (monsterSprites.length < list.length) {
      const sp = makeDot(monsterR, COLOR.monster);
      sp.visible = false;
      monsterSprites.push(sp);
      stage.add(sp);
    }

    for (let i = 0; i < monsterSprites.length; i++) {
      const sp = monsterSprites[i];
      const m = list[i];
      if (!m) {
        sp.visible = false;
        continue;
      }
      sp.visible = true;
      sp.x = m.x - monsterR;
      sp.y = m.y - monsterR;
    }
  }

  // 子弹
  function syncBullets() {
    const list = battle.bullets;

    while (bulletSprites.length < list.length) {
      const sp = makeDot(bulletR, COLOR.bullet);
      sp.visible = false;
      bulletSprites.push(sp);
      stage.add(sp);
    }

    for (let i = 0; i < bulletSprites.length; i++) {
      const sp = bulletSprites[i];
      const b = list[i];
      if (!b) {
        sp.visible = false;
        continue;
      }
      sp.visible = true;
      sp.x = b.x - bulletR;
      sp.y = b.y - bulletR;
    }
  }

  // 遮罩与按钮显隐
  function syncState() {
    const fighting = battle.state !== 'build';
    if (mask) mask.visible = fighting;
    if (buttonRect) buttonRect.visible = !fighting;
  }

  /* ---------- 6. 点击派活 ---------- */
  // 点是否落在矩形里
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 把一次点击派给按钮 / 槽位 / 格子
  // x, y - 画布物理像素坐标
  // 返回 true 表示有人接手了
  function handleTap(x, y) {
    lastTap = { x: x, y: y, at: Date.now() };
    lastLine = '未命中';

    // 1. 按钮
    if (battle.state === 'build' && inside(x, y, button)) {
      button.onTap();
      return true;
    }

    // 2. 商店槽位
    if (shop && shop.slots) {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (inside(x, y, slot)) {
          battle.selectedWeapon = slot.weaponName || null;
          lastLine = '选中 ' + (battle.selectedWeapon || '默认');
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

  /* ---------- 7. 每帧：先推进逻辑，再同步画面 ---------- */
  Ticker.onFrame(function (dt) {
    battle.update(dt);      // ← 没有这一行，怪物永远不生成、人物永远不开火
    syncCards();
    syncMonsters();
    syncBullets();
    syncState();
    syncHud();
  });

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

  console.log('[battle-view] 按钮 ' + Math.round(button.x) + ',' + Math.round(button.y) +
    ' 尺寸 ' + Math.round(button.w) + 'x' + Math.round(button.h));

  return {
    handleTap: handleTap,
    refresh: function () {
      syncCards();
      syncMonsters();
      syncBullets();
      syncState();
      syncHud();
    },
  };
}

module.exports = { create: create };
