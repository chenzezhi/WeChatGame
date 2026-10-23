// 商店布局与命中检测。三个页签：主体 / 分身 / 道具。

const canvasKit = require('../core/canvas.js');
const cfg = require('../game/config.js');

// 主体属性升级
const PLAYER_UPGRADES = [
  { id: 'hp', label: '生命上限', desc: '每级 +' + cfg.SHOP_HP_GAIN + ' 生命' },
  { id: 'fire', label: '攻击速度', desc: '每级 射击间隔 -8%' },
  { id: 'multi', label: '子弹数量', desc: '每级 +' + cfg.SHOP_MULTI_GAIN + ' 发子弹' },
  { id: 'damage', label: '子弹伤害', desc: '每级 +' + cfg.SHOP_DAMAGE_GAIN + ' 伤害' },
  { id: 'ammo', label: '弹夹容量', desc: '每级 +' + cfg.SHOP_AMMO_GAIN + ' 发（上限 ' + cfg.PLAYER_AMMO_MAX + '）' },
  { id: 'reload', label: '装填速度', desc: '每级 -' + cfg.RELOAD_SHOP_STEP_M + ' 米（最快 ' + cfg.RELOAD_M_MIN + ' 米）' },
  { id: 'cloneLife', label: '分身时长', desc: '每级 +' + Math.round(cfg.CLONE_LIFE_STEP_MS / 1000) + ' 秒存活' },
];

// 分身属性升级
const CLONE_UPGRADES = [
  { id: 'hp', label: '生命上限', desc: '每级 +' + cfg.SHOP_HP_GAIN + ' 生命' },
  { id: 'fire', label: '攻击速度', desc: '每级 射击间隔 -8%' },
  { id: 'multi', label: '子弹数量', desc: '每级 +' + cfg.SHOP_MULTI_GAIN + ' 发子弹' },
  { id: 'damage', label: '子弹伤害', desc: '每级 +' + cfg.SHOP_DAMAGE_GAIN + ' 伤害' },
];

// 道具购买项（价格固定，仅本局有效）
const ITEMS = [
  { id: 'heal', label: '生命药水', desc: '本局开局 +3 最大生命', price: 3 },
  { id: 'speed', label: '攻速道具', desc: '本局开局射击更快', price: 3 },
  { id: 'multi', label: '多发道具', desc: '本局开局 +1 发子弹', price: 4 },
  { id: 'damage', label: '伤害道具', desc: '本局开局 +0.1 伤害', price: 5 },
  { id: 'ammo', label: '弹药包', desc: '本局开局补满弹夹', price: 3 },
  { id: 'reload', label: '快速装填', desc: '本局装填距离 ×0.8', price: 4 },
  { id: 'clone', label: '分身道具（本局）', desc: '本局开局召唤 1 个永久分身', price: 8 },
];

// 通用升级费用：0 级 1 枚，之后 2 / 4 / 7 / 11 …
function baseCost(level) {
  const lv = level > 0 ? level : 0;
  return 1 + (lv * (lv + 1)) / 2;
}

// 子弹数量：3 / 7 / 15 / 27 / 43 …
function multiCost(level) {
  const lv = level > 0 ? level : 0;
  return 3 + lv * (lv + 1) * 2;
}

function baseCostOf(id, level) {
  if (id === 'multi') return multiCost(level);
  return baseCost(level);
}

function costOf(id, level, isClone) {
  const c = baseCostOf(id, level);
  return isClone ? c * cfg.CLONE_COST_MULT : c;
}

function permCloneCost(owned) {
  const n = owned > 0 ? owned : 0;
  return cfg.PERM_CLONE_BASE_COST + n * cfg.PERM_CLONE_COST_STEP;
}

function upgradeCost(level) {
  return baseCost(level);
}

function build(data, tab) {
  const width = canvasKit.width;
  const height = canvasKit.height;

  const mode = (tab === 'clone' || tab === 'items') ? tab : 'player';
  const isClone = mode === 'clone';

  const w = Math.min(width * 0.88, 460);
  const x = (width - w) / 2;

  const tabH = 34;
  const tabGap = 6;
  const tabW = (w - tabGap * 2) / 3;
  const tabY = height * 0.155;

  const tabs = [
    { id: 'player', label: '主体', x: x, y: tabY, w: tabW, h: tabH },
    { id: 'clone', label: '分身', x: x + tabW + tabGap, y: tabY, w: tabW, h: tabH },
    { id: 'items', label: '道具', x: x + (tabW + tabGap) * 2, y: tabY, w: tabW, h: tabH },
  ];

  const rows = [];

  let list;
  if (isClone) list = CLONE_UPGRADES;
  else if (mode === 'items') list = ITEMS;
  else list = PLAYER_UPGRADES;

  const total = list.length + (mode === 'items' ? 1 : 0);

  const top = tabY + tabH + 10;
  const bottom = height * 0.95;
  const gap = 5;
  const rh = Math.max(30, (bottom - top - gap * (total - 1)) / total);

  let y = top;

  for (let i = 0; i < list.length; i++) {
    const it = list[i];

    if (mode === 'items') {
      const own = (data && data.items && data.items[it.id]) || 0;

      rows.push({
        id: it.id,
        kind: 'item',
        label: it.label,
        desc: it.desc,
        own: own,
        cost: it.price,
        x: x,
        y: y,
        w: w,
        h: rh,
      });
    } else {
      const store = isClone ? (data && data.cloneUpgrades) : (data && data.upgrades);
      const lv = (store && store[it.id]) || 0;

      rows.push({
        id: it.id,
        kind: isClone ? 'clone-upgrade' : 'upgrade',
        label: it.label,
        desc: it.desc,
        level: lv,
        cost: costOf(it.id, lv, isClone),
        x: x,
        y: y,
        w: w,
        h: rh,
      });
    }

    y += rh + gap;
  }

  if (mode === 'items') {
    const owned = (data && data.permClones) || 0;

    rows.push({
      id: 'permClone',
      kind: 'perm-clone',
      label: '永久分身',
      desc: '每局开局 +1 个永久分身',
      own: owned,
      cost: permCloneCost(owned),
      x: x,
      y: y,
      w: w,
      h: rh,
    });
  }

  const back = { id: 'back', kind: 'back', x: 14, y: 14, w: 68, h: 32 };

  return { rows: rows, back: back, tabs: tabs, tab: mode };
}

function hit(built, x, y) {
  if (!built) return null;

  const back = built.back;
  if (back && x >= back.x && x <= back.x + back.w && y >= back.y && y <= back.y + back.h) return back;

  const tabs = built.tabs || [];
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) {
      return { id: t.id, kind: 'tab' };
    }
  }

  const rows = built.rows || [];
  for (let i = 0; i < rows.length; i++) {
    const b = rows[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }

  return null;
}

module.exports = {
  build: build,
  hit: hit,
  costOf: costOf,
  baseCostOf: baseCostOf,
  permCloneCost: permCloneCost,
  upgradeCost: upgradeCost,
};
