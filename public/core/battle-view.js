'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面接线
 *
 * 把 Battle 算出来的东西画到舞台上：武器卡、子弹、怪物、HUD、开始按钮、商店遮罩。
 * 自己不算伤害、不管波次，只做「状态 → 画面」和「点击 → 状态」。
 * ==============================================*/

/* ==================== 用法 ====================
 * const view = BattleView.create({ stage, sm, board, shop, battle, config: COMBAT });
 * view.handleTap(x, y);   // 把触摸坐标交给它，它负责派活
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位 px。所有对象都复用（visible 控制显隐），不做增删，
 * 因为这个版本的 cax 没有节点 remove。
 *
 * HUD 用 cax.Text，字体参数在不同 cax 版本可能不一样，失败只打日志不中断画面。
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

  // 复用池：键 → cax 对象
  const cards = {};      // 格子序号 → 武器卡
  const monsterSprites = [];  // 与 battle.monsters 对齐（每次重建）
  const bulletSprites = [];

  /* ---------- 1. 商店遮罩：战斗时盖住商店，看不见也不必点 ---------- */
  let mask = null;
  if (shop && shop.shell) {
    mask = new cax.Rect(shop.shell.w, shop.shell.h, { fillStyle: '#12121a' });
    mask.x = shop.shell.x;
    mask.y = shop.shell.y;
    mask.visible = false;
    stage.add(mask);
  }

  /* ---------- 2. 开始战斗按钮 ---------- */
  const buttonW = board.cellW * 1.6;
  const buttonH = board.cellH * 0.6;
  const firstSlot = shop && shop.slots && shop.slots[0] ? shop.slots[0] : null;

  const button = {
    x: (battle.width - buttonW) / 2,
    y: firstSlot ? firstSlot.y - buttonH - 30 : battle.height * 0.72,
    w: buttonW,
    h: buttonH,
    onTap: function () {
      if (battle.state === 'build') battle.startWave();
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
    buttonText.x = button.x + button.w * 0.18;
    buttonText.y = button.y + button.h * 0.28;
    stage.add(buttonText);
  } catch (err) {
    console.warn('[battle-view] 按钮创建失败：' + err.message);
  }

  /* ---------- 3. HUD 文字：银币 / 耐久 / 波次 ---------- */
  let hud = null;
  try {
    hud = new cax.Text('', { font: '24px sans-serif', color: '#ffffff' });
    hud.x = 24;
    hud.y = 24;
    stage.add(hud);
  } catch (err) {
    console.warn('[battle-view] HUD 创建失败，状态改为打日志：' + err.message);
    hud = null;
  }

  // 更新 HUD 文字
  function refreshHud() {
    const s = battle.status();
    const text = '银币 ' + s.coins + '   耐久 ' + s.hp + '   第 ' + s.wave + ' 波';

    if (hud) {
      try {
        hud.text = text;
      } catch (e) {
        /* 某些版本用别的字段名，失败就算了 */
      }
    }
  }

  /* ---------- 4. 武器卡：格子上有武器就显示一张 ---------- */
  function syncCards() {
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      let sp = cards[i];

      // 没有武器就藏起来
      if (!cell.card) {
        if (sp) sp.visible = false;
        continue;
      }

      // 第一次见到才创建
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

  /* ---------- 5. 怪物与子弹：每帧跟着数据重建池 ---------- */
  function syncMonsters() {
    const list = battle.monsters;
    const monsterAsset = tpl.monsterAsset || 30;

    // 池子不够就补，尺寸只在创建时算一次
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

  function syncBullets() {
    const list = battle.bullets;

    while (bulletSprites.length < list.length) {
      const f = frameOf(sm, tpl.bulletAsset);
      const sp = sm.add(stage, tpl.bulletAsset || 30, 0, 0);
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

  /* ---------- 6. 状态联动：商店遮罩 + 按钮文字 ---------- */
  function syncState() {
    const fighting = battle.state !== 'build';

    // 战斗中盖住商店
    if (mask) mask.visible = fighting;

    // 按钮只在布阵阶段显示
    if (buttonRect) buttonRect.visible = !fighting;
    if (buttonText) {
      buttonText.visible = !fighting;
      try {
        buttonText.text = battle.state === 'over' ? '再试一次' : '开始战斗';
      } catch (e) {
        /* 同上，字段名不同就算了 */
      }
    }
  }

  /* ---------- 7. 点击派活 ---------- */
  // 把一次点击派给按钮或格子
  // x, y - 画布物理像素坐标
  function handleTap(x, y) {
    // 先看按钮
    if (
      battle.state === 'build' &&
      x >= button.x && x <= button.x + button.w &&
      y >= button.y && y <= button.y + button.h
    ) {
      button.onTap();
      return true;
    }

    // 再看棋盘格子
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (x >= cell.x && x <= cell.x + cell.w && y >= cell.y && y <= cell.y + cell.h) {
        const ok = battle.placeWeapon(cell);
        if (ok) console.log('[battle] 第 ' + cell.index + ' 格放了武器，剩 ' + battle.coins + ' 银币');
        return ok;
      }
    }
    return false;
  }

  // 每帧同步一次画面
  Ticker.onFrame(function () {
    syncCards();
    syncMonsters();
    syncBullets();
    syncState();
    refreshHud();
  });

  // 波次结束 / 失败时给一行日志，方便在手机上确认流程
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
      refreshHud();
    },
  };
}

module.exports = { create: create };
