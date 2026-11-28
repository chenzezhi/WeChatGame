'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面接线
 *
 * 每帧：推进 Battle 逻辑 → 把结果画出来。
 * 负责篝火、武器图标、子弹、怪物、HUD、开始按钮、商店遮罩，
 * 并把一次点击派给按钮 / 槽位 / 格子。
 *
 * 所有图形都用 Rect / Circle 拼出来，不依赖素材，也不用 Polygon
 * （这个版本的 cax 里 Polygon 构造不报错但画不出来，已验证）。
 * 有美术后把 makeXxx 换成 sm.add(...) 即可，坐标一行都不用改。
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
  blade: '#dfe6ef',      // 剑身
  guard: '#b08a45',      // 剑格
  hilt: '#6b4a2a',       // 剑柄
  bullet: '#f0c040',     // 子弹
  monster: '#a03a3a',    // 怪物身体
  monsterEye: '#ffe9a8', // 怪物眼睛
  campStone: '#4a4a52',  // 篝火石圈
  campFlame: '#e8622a',  // 火焰外圈
  campInner: '#f6c33a',  // 火焰内芯
  campLog: '#7a5a34',    // 柴火
  button: '#8b2f2f',     // 按钮
  mask: '#12121a',       // 商店遮罩
  mark: '#ffffff',       // 点击标记
};

// 画一块纯色方块
function makeRect(w, h, color) {
  return new cax.Rect(w, h, { fillStyle: color });
}

// 画一个圆
// r - 半径，单位 px
function makeCircle(r, color) {
  return new cax.Circle(r, { fillStyle: color });
}

// 把多个图形合成一个整体，方便一起移动、一起显隐
// parts - [{ node, ox, oy }]，ox/oy 是相对整体左上角的偏移
function group(parts) {
  return {
    parts: parts,
    // 整体左上角摆到 x, y
    setPos: function (x, y) {
      for (let i = 0; i < parts.length; i++) {
        parts[i].node.x = x + parts[i].ox;
        parts[i].node.y = y + parts[i].oy;
      }
    },
    // 整体显示 / 隐藏
    setVisible: function (v) {
      for (let i = 0; i < parts.length; i++) parts[i].node.visible = v;
    },
  };
}

// 画一把剑，当武器图标：剑身 + 剑格 + 剑柄，全用矩形
// size - 整体高度，单位 px
// 返回 cax.Rect（只有剑身主体，够认出是武器）
function makeSword(size) {
  const s = size;
  const parts = [];

  // 剑身：竖着的细长条
  const bladeW = Math.max(3, s * 0.22);
  const blade = makeRect(bladeW, s * 0.62, COLOR.blade);
  parts.push({ node: blade, ox: (s - bladeW) / 2, oy: 0 });

  // 剑格：横着的短条
  const guardW = s * 0.6;
  const guardH = Math.max(2, s * 0.1);
  const guard = makeRect(guardW, guardH, COLOR.guard);
  parts.push({ node: guard, ox: (s - guardW) / 2, oy: s * 0.62 });

  // 剑柄：短条
  const hiltW = Math.max(2, s * 0.16);
  const hilt = makeRect(hiltW, s * 0.22, COLOR.hilt);
  parts.push({ node: hilt, ox: (s - hiltW) / 2, oy: s * 0.72 });

  return group(parts);
}

// 画一个小怪：圆身子 + 两只眼睛 + 两只耳朵
// size - 整体尺寸，单位 px
function makeMonster(size) {
  const s = size;
  const parts = [];

  // 身子：深红圆
  const bodyR = s * 0.4;
  const body = makeCircle(bodyR, COLOR.monster);
  parts.push({ node: body, ox: s * 0.5 - bodyR, oy: s * 0.55 - bodyR });

  // 耳朵：两个小方块，让它不像纯圆
  const ear = Math.max(2, s * 0.14);
  const l = makeRect(ear, ear, COLOR.monster);
  const r = makeRect(ear, ear, COLOR.monster);
  parts.push({ node: l, ox: s * 0.3 - ear / 2, oy: s * 0.18 });
  parts.push({ node: r, ox: s * 0.7 - ear / 2, oy: s * 0.18 });

  // 眼睛：两个浅黄小圆
  const eyeR = Math.max(2, s * 0.08);
  const el = makeCircle(eyeR, COLOR.monsterEye);
  const er = makeCircle(eyeR, COLOR.monsterEye);
  parts.push({ node: el, ox: s * 0.38 - eyeR, oy: s * 0.5 - eyeR });
  parts.push({ node: er, ox: s * 0.62 - eyeR, oy: s * 0.5 - eyeR });

  return group(parts);
}

// 画一个篝火：柴火 + 石圈 + 两层火
// size - 整体尺寸，单位 px
function makeCampfire(size) {
  const s = size;
  const parts = [];

  // 柴火：底下两根棕色短条
  const logW = s * 0.7;
  const logH = Math.max(3, s * 0.12);
  const log = makeRect(logW, logH, COLOR.campLog);
  parts.push({ node: log, ox: (s - logW) / 2, oy: s * 0.78 });

  // 石圈：深灰圆当底座
  const stoneR = s * 0.3;
  const stone = makeCircle(stoneR, COLOR.campStone);
  parts.push({ node: stone, ox: s * 0.5 - stoneR, oy: s * 0.78 - stoneR * 0.6 });

  // 外焰：橙色圆
  const flameR = s * 0.28;
  const flame = makeCircle(flameR, COLOR.campFlame);
  parts.push({ node: flame, ox: s * 0.5 - flameR, oy: s * 0.42 - flameR });

  // 内焰：黄色小圆
  const innerR = s * 0.16;
  const inner = makeCircle(innerR, COLOR.campInner);
  parts.push({ node: inner, ox: s * 0.5 - innerR, oy: s * 0.46 - innerR });

  return group(parts);
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
  const cfg = o.config || {};
  const tpl = cfg.template || {};

  if (!stage || !board || !battle) {
    console.warn('[battle-view] 缺少 stage / board / battle，战斗画面没有创建');
    return null;
  }

  // 尺寸，单位 px
  const cardSize = board.cellW * 0.5;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.5;
  const bulletR = board.cellW * 0.06;
  const monsterSize = board.cellW * 0.6;
  const campfireSize = board.cellW * (tpl.campfireSizeRatio == null ? 0.9 : tpl.campfireSizeRatio);

  /* ---------- 1. 篝火：摆在棋盘中间，是怪物的目标 ---------- */
  const fire = makeCampfire(campfireSize);
  fire.setPos(battle.campfire.x - campfireSize / 2, battle.campfire.y - campfireSize / 2);
  for (let i = 0; i < fire.parts.length; i++) stage.add(fire.parts[i].node);

  /* ---------- 2. 商店槽位里的武器图标 ---------- */
  const slotSprites = [];
  if (shop && shop.slots) {
    const weapon = battle.weapons[0] || null;

    for (let i = 0; i < shop.slots.length; i++) {
      const slot = shop.slots[i];

      const sword = makeSword(slotIconSize);
      const ox = slot.x + (slot.w - slotIconSize) / 2;
      const oy = slot.y + (slot.h - slotIconSize) / 2;
      for (let j = 0; j < sword.parts.length; j++) stage.add(sword.parts[j].node);
      sword.setPos(ox, oy);

      slotSprites.push(sword);
      slot.weaponName = weapon ? weapon.name : null;
    }
  }

  /* ---------- 3. 商店遮罩：战斗时盖住商店 ---------- */
  let mask = null;
  if (shop && shop.shell) {
    mask = makeRect(shop.shell.w, shop.shell.h, COLOR.mask);
    mask.x = shop.shell.x;
    mask.y = shop.shell.y;
    mask.visible = false;
    stage.add(mask);
  }

  /* ---------- 4. 开始战斗按钮：卡牌槽下面 ---------- */
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
      lastLine = ok ? '开打：第 ' + battle.wave + ' 波' : '没有下一波了（加数据）';
    },
  };

  const buttonRect = makeRect(button.w, button.h, COLOR.button);
  buttonRect.x = button.x;
  buttonRect.y = button.y;
  stage.add(buttonRect);

  /* ---------- 5. HUD + 点击标记 ---------- */
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

  /* ---------- 6. 每帧同步 ---------- */
  // 格子上的武器图标
  const cards = {};
  function syncCards() {
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      let v = cards[i];

      if (!cell.card) {
        if (v) v.setVisible(false);
        continue;
      }

      if (!v) {
        v = makeSword(cardSize);
        for (let j = 0; j < v.parts.length; j++) stage.add(v.parts[j].node);
        v.setPos(cell.x + (cell.w - cardSize) / 2, cell.y + (cell.h - cardSize) / 2);
        cards[i] = v;
      }
      v.setVisible(true);
    }
  }

  // 怪物
  const monsterSprites = [];
  function syncMonsters() {
    const list = battle.monsters;

    while (monsterSprites.length < list.length) {
      const v = makeMonster(monsterSize);
      for (let i = 0; i < v.parts.length; i++) stage.add(v.parts[i].node);
      v.setVisible(false);
      monsterSprites.push(v);
    }

    for (let i = 0; i < monsterSprites.length; i++) {
      const v = monsterSprites[i];
      const m = list[i];
      if (!m) {
        v.setVisible(false);
        continue;
      }
      v.setVisible(true);
      v.setPos(m.x - monsterSize / 2, m.y - monsterSize / 2);
    }
  }

  // 子弹
  const bulletSprites = [];
  function syncBullets() {
    const list = battle.bullets;

    while (bulletSprites.length < list.length) {
      const sp = makeCircle(bulletR, COLOR.bullet);
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

  /* ---------- 7. 点击派活 ---------- */
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function handleTap(x, y) {
    lastTap = { x: x, y: y, at: Date.now() };
    lastLine = '未命中';

    if (battle.state === 'build' && inside(x, y, button)) {
      button.onTap();
      return true;
    }

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

  /* ---------- 8. 每帧：先推进逻辑，再同步画面 ---------- */
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

  console.log('[battle-view] 图形：矩形+圆形（这个 cax 的 Polygon 画不出来）');
  console.log('[battle-view] 篝火 ' + Math.round(battle.campfire.x) + ',' + Math.round(battle.campfire.y) +
    ' 判定半径 ' + Math.round(battle.campfire.r) +
    '；按钮 ' + Math.round(button.x) + ',' + Math.round(button.y));

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
