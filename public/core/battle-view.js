'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面接线
 *
 * 把 Battle 算出来的东西画到舞台上：槽位武器、格子武器卡、子弹、怪物、
 * HUD、开始按钮、商店遮罩，并把一次点击派给按钮 / 槽位 / 格子。
 *
 * 所有占位图都用画布方块画，不依赖任何素材；有美术后把 makeRect 换成
 * sm.add(...) 即可，坐标一行都不用改。
 * ==============================================*/

/* ==================== 用法 ====================
 * const view = BattleView.create({ stage, sm, board, shop, battle, config: COMBAT });
 * view.handleTap(x, y);   // x, y 是画布物理像素
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位 px。对象都复用（visible 控制显隐），不增不删，
 * 因为这个版本的 cax 没有节点 remove。
 *
 * 点击有没有被收到、落在哪里，全部显示在屏幕左上角的 HUD 上，
 * 手机上不开控制台也能判断问题出在「没收到」还是「没命中」。
 * ==============================================*/

const cax = require('../../libs/cax.js');
const Ticker = require('./ticker.js');

// 占位色板：没有美术时用颜色区分东西
const COLOR = {
  card: '#4a7ebb',      // 格子上的武器卡
  slot: '#3f8a5a',      // 商店槽位里的武器
  bullet: '#f0c040',    // 子弹
  monster: '#a03a3a',   // 怪物
  button: '#8b2f2f',    // 按钮
  mask: '#12121a',      // 商店遮罩
  mark: '#ffffff',      // 点击标记
};

// 创建一块纯色方块
// w, h - 尺寸，单位 px
// color - 填充色
// 返回 cax.Rect
function makeRect(w, h, color) {
  return new cax.Rect(w, h, { fillStyle: color });
}

// 创建战斗视图
// options - { stage, sm, board, shop, battle, config }
// 返回 { handleTap(x, y), refresh() }
function create(options) {
  const o = options || {};
  const stage = o.stage;
  const sm = o.sm;
  const board = o.board;
  const shop = o.shop;
  const battle = o.battle;

  if (!stage || !board || !battle) {
    console.warn('[battle-view] 缺少 stage / board / battle，战斗画面没有创建');
    return null;
  }

  // 各种占位的尺寸，单位 px
  const cardSize = board.cellW * 0.5;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.5;
  const bulletSize = board.cellW * 0.16;
  const monsterSize = board.cellW * 0.55;

  // 复用池
  const cards = {};            // 格子序号 → 方块
  const monsterSprites = [];
  const bulletSprites = [];
  const slotSprites = [];

  /* ---------- 1. 商店槽位里画武器（方块占位） ---------- */
  if (shop && shop.slots) {
    const weapon = battle.weapons[0] || null;
    for (let i = 0; i < shop.slots.length; i++) {
      const slot = shop.slots[i];
      const sp = makeRect(slotIconSize, slotIconSize, COLOR.slot);
      sp.x = slot.x + (slot.w - slotIconSize) / 2;
      sp.y = slot.y + (slot.h - slotIconSize) / 2;
      stage.add(sp);
      slotSprites.push(sp);

      // 槽位上记下它卖的是哪把武器
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

  /* ---------- 3. 开始战斗按钮：放在卡牌槽下面 ---------- */
  const buttonW = board.cellW * 1.8;
  const buttonH = board.cellH * 0.5;
  const slot0 = shop && shop.slots && shop.slots[0] ? shop.slots[0] : null;
  const slotY = slot0 ? slot0.y : battle.height * 0.82;
  const slotH = slot0 ? slot0.h : 0;

  // 默认在槽位下方，超出屏幕就贴底
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

  /* ---------- 4. HUD：状态 + 最近一次点击 ---------- */
  let hud = null;
  let lastLine = '等待点击';
  let lastTap = null;      // { x, y, at }

  try {
    hud = new cax.Text('', { font: '22px sans-serif', color: '#ffffff' });
    hud.x = 20;
    hud.y = 20;
    stage.add(hud);
  } catch (err) {
    console.warn('[battle-view] HUD 创建失败：' + err.message);
    hud = null;
  }

  // 点击标记：一个小白块，跟着最后一次点击闪一下
  const mark = makeRect(24, 24, COLOR.mark);
  mark.visible = false;
  stage.add(mark);

  // 更新 HUD 文字
  function syncHud() {
    const s = battle.status();
    let text = '银币 ' + s.coins + ' 耐久 ' + s.hp + ' 第 ' + s.wave + ' 波';

    if (lastTap) text += '  |  点击 ' + Math.round(lastTap.x) + ',' + Math.round(lastTap.y);
    text += '  |  ' + lastLine;

    if (hud) {
      try {
        hud.text = text;
      } catch (e) {
        /* 字段名不兼容就算了 */
      }
    }

    // 标记显示 400ms
    if (lastTap && Date.now() - lastTap.at < 400) {
      mark.visible = true;
      mark.x = lastTap.x - 12;
      mark.y = lastTap.y - 12;
    } else {
      mark.visible = false;
    }
  }

  /* ---------- 5. 每帧同步 ---------- */
  // 格子上有武器就显示一块
  function syncCards() {
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      let sp = cards[i];

      if (!cell.card) {
        if (sp) sp.visible = false;
        continue;
      }

      if (!sp) {
        sp = makeRect(cardSize, cardSize, COLOR.card);
        sp.x = cell.x + (cell.w - cardSize) / 2;
        sp.y = cell.y + (cell.h - cardSize) / 2;
        cards[i] = sp;
        stage.add(sp);
      }
      sp.visible = true;
    }
  }

  // 怪物：按数量补池子
  function syncMonsters() {
    const list = battle.monsters;

    while (monsterSprites.length < list.length) {
      const sp = makeRect(monsterSize, monsterSize, COLOR.monster);
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
      sp.x = m.x - monsterSize / 2;
      sp.y = m.y - monsterSize / 2;
    }
  }

  // 子弹：按数量补池子
  function syncBullets() {
    const list = battle.bullets;

    while (bulletSprites.length < list.length) {
      const sp = makeRect(bulletSize, bulletSize, COLOR.bullet);
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
      sp.x = b.x - bulletSize / 2;
      sp.y = b.y - bulletSize / 2;
    }
  }

  // 遮罩 + 按钮显隐
  function syncState() {
    const fighting = battle.state !== 'build';
    if (mask) mask.visible = fighting;
    if (buttonRect) buttonRect.visible = !fighting;
  }

  /* ---------- 6. 点击派活：按钮 → 槽位 → 格子 ---------- */
  // 点是否落在矩形里
  // x, y - 点击坐标；r - { x, y, w, h }
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 把一次点击派出去
  // x, y - 画布物理像素坐标
  // 返回 true 表示有人接手了
  function handleTap(x, y) {
    // 记下这一下，HUD 会显示出来
    lastTap = { x: x, y: y, at: Date.now() };
    lastLine = '未命中';

    // 1. 按钮
    if (battle.state === 'build' && inside(x, y, button)) {
      button.onTap();
      return true;
    }

    // 2. 商店槽位：选中这把武器
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

    // 3. 棋盘格子：放武器
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

  // 每帧同步
  Ticker.onFrame(function () {
    syncCards();
    syncMonsters();
    syncBullets();
    syncState();
    syncHud();
  });

  // 波次与失败的日志
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
