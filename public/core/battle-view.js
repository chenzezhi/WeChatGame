'use strict';

/* ==================== 功能 ====================
 * BattleView —— 战斗的画面接线
 *
 * 每帧：推进 Battle 逻辑 → 把结果画出来。
 * 负责篝火、武器图标、子弹、怪物、HUD、开始按钮、商店遮罩，
 * 并把一次点击派给按钮 / 槽位 / 格子。
 *
 * 所有图形都是画布直接画的（Polygon / Circle / Rect），不依赖素材。
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
  arrow: '#38404f',      // 武器箭头
  arrowBg: '#e8e0c0',    // 武器图标底
  bullet: '#f0c040',     // 子弹
  monster: '#a03a3a',    // 怪物身体
  monsterEye: '#ffe9a8', // 怪物眼睛
  campStone: '#4a4a52',  // 篝火石圈
  campFlame: '#e8622a',  // 火焰外圈
  campInner: '#f6c33a',  // 火焰内芯
  button: '#8b2f2f',     // 按钮
  mask: '#12121a',       // 商店遮罩
  mark: '#ffffff',       // 点击标记
};

// 把多个图形合成一个整体，方便一起移动、一起显隐
// parts - [{ node, ox, oy }]，ox/oy 是相对整体左上角的偏移
// 返回 { parts, setPos(x, y), setVisible(v) }
function group(parts) {
  return {
    parts: parts,
    // 把整体左上角摆到 x, y
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

// 画一块纯色方块
function makeRect(w, h, color) {
  return new cax.Rect(w, h, { fillStyle: color });
}

// 画一个向上的箭头，当武器图标
// size - 边长，单位 px
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

// 画一个小怪：三角身子 + 两只眼睛
// size - 整体尺寸，单位 px
// 返回 group(...)，setPos 传中心点
function makeMonster(size) {
  const s = size;
  const parts = [];

  // 身体：下宽上尖的三角，像个小怪
  try {
    const body = new cax.Polygon(
      [
        [s * 0.5, 0],
        [s, s * 0.55],
        [s * 0.82, s],
        [s * 0.18, s],
        [0, s * 0.55],
      ],
      { fillStyle: COLOR.monster }
    );
    parts.push({ node: body, ox: 0, oy: 0 });
  } catch (err) {
    parts.push({ node: makeRect(s, s, COLOR.monster), ox: 0, oy: 0 });
  }

  // 眼睛：两个小圆
  const eyeR = Math.max(2, s * 0.09);
  try {
    const l = new cax.Circle(eyeR, { fillStyle: COLOR.monsterEye });
    const r = new cax.Circle(eyeR, { fillStyle: COLOR.monsterEye });
    parts.push({ node: l, ox: s * 0.3 - eyeR, oy: s * 0.3 - eyeR });
    parts.push({ node: r, ox: s * 0.56 - eyeR, oy: s * 0.3 - eyeR });
  } catch (err) {
    /* 眼睛画不出来就算了，身子还在 */
  }

  return group(parts);
}

// 画一个篝火：石圈 + 两层火苗
// size - 整体尺寸，单位 px
// 返回 group(...)，setPos 传左上角
function makeCampfire(size) {
  const s = size;
  const parts = [];

  // 石圈：一个深色圆当底座
  try {
    const stone = new cax.Circle(s * 0.42, { fillStyle: COLOR.campStone });
    parts.push({ node: stone, ox: s * 0.08, oy: s * 0.42 });
  } catch (err) {
    parts.push({ node: makeRect(s * 0.84, s * 0.4, COLOR.campStone), ox: s * 0.08, oy: s * 0.42 });
  }

  // 外圈火苗：一个竖三角
  try {
    const flame = new cax.Polygon(
      [
        [s * 0.5, 0],
        [s * 0.86, s * 0.68],
        [s * 0.14, s * 0.68],
      ],
      { fillStyle: COLOR.campFlame }
    );
    parts.push({ node: flame, ox: 0, oy: s * 0.06 });
  } catch (err) {
    parts.push({ node: makeRect(s * 0.7, s * 0.6, COLOR.campFlame), ox: s * 0.15, oy: s * 0.1 });
  }

  // 内芯：小一点的黄三角
  try {
    const inner = new cax.Polygon(
      [
        [s * 0.5, s * 0.28],
        [s * 0.68, s * 0.66],
        [s * 0.32, s * 0.66],
      ],
      { fillStyle: COLOR.campInner }
    );
    parts.push({ node: inner, ox: 0, oy: s * 0.06 });
  } catch (err) {
    /* 内芯画不出来就用单层火 */
  }

  return group(parts);
}

// 画一个圆点（子弹用）
// r - 半径，单位 px
function makeDot(r, color) {
  try {
    return new cax.Circle(r, { fillStyle: color });
  } catch (err) {
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
  const cfg = o.config || {};
  const tpl = cfg.template || {};

  if (!stage || !board || !battle) {
    console.warn('[battle-view] 缺少 stage / board / battle，战斗画面没有创建');
    return null;
  }

  // 尺寸，单位 px
  const cardSize = board.cellW * 0.42;
  const slotIconSize = (shop && shop.slotSize ? shop.slotSize : board.cellW) * 0.42;
  const bulletR = board.cellW * 0.06;
  const monsterSize = board.cellW * 0.5;
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

      const bg = makeRect(slotIconSize * 1.4, slotIconSize * 1.4, COLOR.arrowBg);
      bg.x = slot.x + (slot.w - slotIconSize * 1.4) / 2;
      bg.y = slot.y + (slot.h - slotIconSize * 1.4) / 2;
      stage.add(bg);

      const icon = makeArrow(slotIconSize, COLOR.arrow);
      icon.x = slot.x + (slot.w - slotIconSize) / 2;
      icon.y = slot.y + (slot.h - slotIconSize) / 2;
      stage.add(icon);

      slotSprites.push(icon);
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

  /* ---------- 7. 点击派活 ---------- */
  // 点是否落在矩形里
  function inside(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // 把一次点击派给按钮 / 槽位 / 格子
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
