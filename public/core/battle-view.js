'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面接线
 *
 * 把 Battle 算出来的东西画到舞台上：槽位里的武器、格子上的武器卡、子弹、
 * 怪物、HUD、开始按钮、商店遮罩。并负责把一次点击派给按钮 / 槽位 / 格子。
 * 自己不算伤害、不管波次，只做「状态 → 画面」和「点击 → 状态」。
 * ==============================================*/

/* ==================== 用法 ====================
 * const view = BattleView.create({ stage, sm, board, shop, battle, config: COMBAT });
 * view.handleTap(x, y);   // x, y 是画布物理像素
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位 px。所有对象复用（visible 控制显隐），不增不删，
 * 因为这个版本的 cax 没有节点 remove。
 *
 * HUD / 按钮文字用 cax.Text，不同版本参数可能不一样，失败只打日志不中断画面。
 * ==============================================*/

const cax = require('../../libs/cax.js');
const Ticker = require('./ticker.js');

// 取素材原始尺寸，取不到返回 null
// sm - SpriteMap 实例
// asset - 图集序号或名字
function frameOf(sm, asset) {
  try {
    return sm.size(asset);
  } catch (e) {
    return null;
  }
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
  const cfg = o.config || {};
  const tpl = cfg.template || {};

  if (!stage || !sm || !board || !battle) {
    console.warn('[battle-view] 缺少 stage / sm / board / battle，战斗画面没有创建');
    return null;
  }

  // 各种对象的显示尺寸，单位 px
  const cardSize = board.cellW * 0.55;
  const monsterSize = board.cellW * 0.6;
  const bulletSize = board.cellW * 0.18;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.55;

  // 复用池
  const cards = {};             // 格子序号 → 武器卡对象
  const monsterSprites = [];    // 与 battle.monsters 对齐
  const bulletSprites = [];     // 与 battle.bullets 对齐
  const slotSprites = [];       // 商店槽位里的武器图标

  /* ---------- 1. 商店槽位里画武器图标（点它 = 选中这把武器） ---------- */
  if (shop && shop.slots) {
    const weapon = battle.weapons[0] || null;
    for (let i = 0; i < shop.slots.length; i++) {
      const slot = shop.slots[i];
      const asset = weapon ? weapon.asset || tpl.cardAsset : tpl.cardAsset;
      const f = frameOf(sm, asset);

      const sp = sm.add(stage, asset, 0, 0);
      if (f && f.w) sp.scale = slotIconSize / f.w;
      sp.x = slot.x + (slot.w - slotIconSize) / 2;
      sp.y = slot.y + (slot.h - slotIconSize) / 2;
      slotSprites.push(sp);

      // 槽位上记下它卖的是哪把武器
      slot.weaponName = weapon ? weapon.name : null;
    }
  }

  /* ---------- 2. 商店遮罩：战斗时盖住商店 ---------- */
  let mask = null;
  if (shop && shop.shell) {
    mask = new cax.Rect(shop.shell.w, shop.shell.h, { fillStyle: '#12121a' });
    mask.x = shop.shell.x;
    mask.y = shop.shell.y;
    mask.visible = false;
    stage.add(mask);
  }

  /* ---------- 3. 开始战斗按钮：放在卡牌槽下面 ---------- */
  const buttonW = board.cellW * 1.8;
  const buttonH = board.cellH * 0.55;
  const slotY = shop && shop.slots && shop.slots[0] ? shop.slots[0].y : battle.height * 0.8;
  const slotH = shop && shop.slots && shop.slots[0] ? shop.slots[0].h : 0;

  // 默认放槽位下方，超出屏幕就贴底
  let by = slotY + slotH + board.cellH * 0.15;
  by = Math.min(by, battle.height - buttonH - 10);

  const button = {
    x: (battle.width - buttonW) / 2,
    y: by,
    w: buttonW,
    h: buttonH,
    onTap: function () {
      if (battle.state === 'over') {
        console.log('[battle] 已结束，重建场景才能重来');
        return;
      }
      const ok = battle.startWave();
      console.log('[battle] 点开始战斗 → ' + (ok ? '进入第 ' + battle.wave + ' 波' : '没有开始（看上面的原因）'));
    },
  };

  let buttonRect = null;
  let buttonText = null;
  try {
    buttonRect = new cax.Rect(button.w, button.h, { fillStyle: '#8b2f2f' });
    buttonRect.x = button.x;
    buttonRect.y = button.y;
    stage.add(buttonRect);

    buttonText = new cax.Text('开始战斗', { font: '28px sans-serif', color: '#ffffff' });
    buttonText.x = button.x + button.w * 0.22;
    buttonText.y = button.y + button.h * 0.25;
    stage.add(buttonText);
  } catch (err) {
    console.warn('[battle-view] 按钮创建失败：' + err.message);
  }

  console.log('[battle-view] 按钮位置 ' + Math.round(button.x) + ',' + Math.round(button.y) +
    ' 尺寸 ' + Math.round(button.w) + 'x' + Math.round(button.h));

  /* ---------- 4. HUD 文字 ---------- */
  let hud = null;
  try {
    hud = new cax.Text('', { font: '24px sans-serif', color: '#ffffff' });
    hud.x = 24;
    hud.y = 24;
    stage.add(hud);
  } catch (err) {
    console.warn('[battle-view] HUD 创建失败，状态改用日志：' + err.message);
    hud = null;
  }

  // 更新 HUD
  function syncHud() {
    const s = battle.status();
    const text = '银币 ' + s.coins + '   耐久 ' + s.hp + '   第 ' + s.wave + ' 波';
    if (hud) {
      try {
        hud.text = text;
      } catch (e) {
        /* 字段名不兼容就算了 */
      }
    }
  }

  /* ---------- 5. 每帧同步各类对象 ---------- */
  // 格子上有武器就显示一张
  function syncCards() {
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      let sp = cards[i];

      if (!cell.card) {
        if (sp) sp.visible = false;
        continue;
      }

      if (!sp) {
        const asset = cell.card.asset || tpl.cardAsset;
        const f = frameOf(sm, asset);
        sp = sm.add(stage, asset, 0, 0);
        if (f && f.w) sp.scale = cardSize / f.w;
        sp.x = cell.x + (cell.w - cardSize) / 2;
        sp.y = cell.y + (cell.h - cardSize) / 2;
        cards[i] = sp;
      }
      sp.visible = true;
    }
  }

  // 怪物：按数量补池子
  function syncMonsters() {
    const list = battle.monsters;
    const monsterAsset = tpl.monsterAsset || 30;

    while (monsterSprites.length < list.length) {
      const f = frameOf(sm, monsterAsset);
      const sp = sm.add(stage, monsterAsset, 0, 0);
      if (f && f.w) sp.scale = monsterSize / f.w;
      sp.visible = false;
      monsterSprites.push(sp);
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
    const bulletAsset = tpl.bulletAsset || 30;

    while (bulletSprites.length < list.length) {
      const f = frameOf(sm, bulletAsset);
      const sp = sm.add(stage, bulletAsset, 0, 0);
      if (f && f.w) sp.scale = bulletSize / f.w;
      sp.visible = false;
      bulletSprites.push(sp);
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

  // 商店遮罩 + 按钮显隐
  function syncState() {
    const fighting = battle.state !== 'build';

    if (mask) mask.visible = fighting;
    if (buttonRect) buttonRect.visible = !fighting;
    if (buttonText) {
      buttonText.visible = !fighting;
      try {
        buttonText.text = '开始战斗';
      } catch (e) {
        /* 同上 */
      }
    }
  }

  /* ---------- 6. 点击派活：按钮 → 槽位 → 格子 ---------- */
  // 判断点是否落在矩形里
  // x, y - 点击坐标；r - { x, y, w, h }
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 把一次点击派出去
  // x, y - 画布物理像素坐标
  // 返回 true 表示有人接手了
  function handleTap(x, y) {
    // 1. 按钮
    if (battle.state === 'build' && inside(x, y, button)) {
      button.onTap();
      return true;
    }

    // 2. 商店槽位：选中这格卖的武器
    if (shop && shop.slots) {
      for (let i = 0; i < shop.slots.length; i++) {
        const slot = shop.slots[i];
        if (inside(x, y, slot)) {
          battle.selectedWeapon = slot.weaponName || null;
          console.log('[battle-view] 选中武器：' + (battle.selectedWeapon || '默认'));
          return true;
        }
      }
    }

    // 3. 棋盘格子：放武器
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (inside(x, y, cell)) {
        const ok = battle.placeWeapon(cell, battle.selectedWeapon);
        if (ok) console.log('[battle] 第 ' + cell.index + ' 格放了武器，剩 ' + battle.coins + ' 银币');
        return ok;
      }
    }

    console.log('[battle-view] 点击落空 (' + Math.round(x) + ',' + Math.round(y) + ')');
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

  // 波次与失败的日志，方便在手机上确认流程
  battle.onWaveStart = function (n) {
    console.log('[battle] 第 ' + n + ' 波开始');
  };
  battle.onWaveEnd = function (n) {
    console.log('[battle] 第 ' + n + ' 波结束，回到布阵');
  };
  battle.onOver = function () {
    console.log('[battle] 耐久归零，本局结束');
  };

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
