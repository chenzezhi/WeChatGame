// 商店布局与命中检测。三个页签：主体 / 分身 / 道具。
// 价格与数值全部来自 config/shop/，这里不硬编码。
//
// 行数据（row）字段：
//   kind        upgrade | clone-upgrade | item | perm-clone | back | tab
//   level       当前等级
//   maxLevel    满级等级
//   maxed       是否已满级（满级后变灰、显示「满级」）
//   desc        小字提示：未满级 = 「当前值 · 每级 +X」，满级 = 只有当前值
//   slider      弹道夹角行专属：滑块矩形
//   sliderRange 滑块可调范围（度）
//   sliderRatio 滑块位置 0(顶=最大夹角) ~ 1(底=已购买的最小夹角)

const canvasKit = require('../core/canvas.js');
const cfg = require('../game/config.js');

const PRICES = cfg.SHOP_ITEM_PRICES || {};
const MAXLV = cfg.SHOP_MAX_LEVEL || {};

function itemPrice(id) {
  const v = PRICES[id];
  return typeof v === 'number' ? v : 1;
}

// ---------------- 数值换算（与 game/index.js 的算法保持一致） ----------------
function fireMsAt(startMs, level, ratio, minMs) {
  let ms = startMs;
  const lv = level > 0 ? level : 0;

  for (let i = 0; i < lv; i++) {
    ms = Math.round(ms * ratio);
    if (ms < minMs) ms = minMs;
  }

  return ms;
}

function spreadBaseAt(level) {
  const lv = level > 0 ? level : 0;
  let v = cfg.MULTI_SPREAD_DEG - cfg.SPREAD_SHOP_STEP_DEG * lv;
  if (v < cfg.SPREAD_MIN_DEG) v = cfg.SPREAD_MIN_DEG;
  if (v > cfg.MULTI_SPREAD_DEG) v = cfg.MULTI_SPREAD_DEG;
  return Math.round(v * 100) / 100;
}

function fixed1(v) {
  return (Math.round(v * 10) / 10).toFixed(1);
}

// 返回 { v: 当前值文本, step: 每级变化文本 }
function statOf(id, level, isClone, adj) {
  const lv = level > 0 ? level : 0;

  if (id === 'hp') {
    const base = isClone ? cfg.CLONE_HP_BASE : cfg.PLAYER_MAX_HP;
    const v = Math.min(cfg.LEVEL_HP_MAX, base + cfg.SHOP_HP_GAIN * lv);
    return { v: String(v), step: '每级 +' + cfg.SHOP_HP_GAIN };
  }

  if (id === 'fire') {
    const ms = fireMsAt(cfg.PLAYER_FIRE_MS_START, lv, cfg.SHOP_FIRE_RATIO, cfg.PLAYER_FIRE_MS_MIN);
    return { v: ms + 'ms', step: '每级 ×' + cfg.SHOP_FIRE_RATIO };
  }

  if (id === 'multi') {
    const v = Math.min(cfg.PLAYER_MULTI_MAX, cfg.PLAYER_MULTI_START + cfg.SHOP_MULTI_GAIN * lv);
    return { v: v + ' 发', step: '每级 +' + cfg.SHOP_MULTI_GAIN };
  }

  if (id === 'spread') {
    const base = spreadBaseAt(lv);
    const range = cfg.MULTI_SPREAD_DEG - base;
    let a = adj > 0 ? adj : 0;
    if (a > range) a = range;
    const eff = base + a;
    return { v: fixed1(eff) + '°', step: '每级 -' + cfg.SPREAD_SHOP_STEP_DEG + '°' };
  }

  if (id === 'damage') {
    const v = Math.min(cfg.PLAYER_DAMAGE_MAX, cfg.PLAYER_DAMAGE_START + cfg.SHOP_DAMAGE_GAIN * lv);
    return { v: fixed1(v), step: '每级 +' + cfg.SHOP_DAMAGE_GAIN };
  }

  if (id === 'ammo') {
    const v = Math.min(cfg.PLAYER_AMMO_MAX, cfg.PLAYER_AMMO_START + cfg.SHOP_AMMO_GAIN * lv);
    return { v: v + ' 发', step: '每级 +' + cfg.SHOP_AMMO_GAIN };
  }

  if (id === 'reload') {
    const v = Math.max(cfg.RELOAD_M_MIN, cfg.RELOAD_M_START - cfg.RELOAD_SHOP_STEP_M * lv);
    return { v: v + 'm', step: '每级 -' + cfg.RELOAD_SHOP_STEP_M + 'm' };
  }

  if (id === 'cloneLife') {
    const ms = Math.min(cfg.CLONE_LIFE_MAX_MS, cfg.CLONE_LIFE_BASE_MS + cfg.CLONE_LIFE_STEP_MS * lv);
    return { v: fixed1(ms / 1000) + 's', step: '每级 +' + fixed1(cfg.CLONE_LIFE_STEP_MS / 1000) + 's' };
  }

  return { v: '', step: '' };
}

function maxLevelOf(id) {
  const v = MAXLV[id];
  return typeof v === 'number' ? v : 0;
}

function isMaxLevel(id, level) {
  const max = maxLevelOf(id);
  if (max <= 0) return false;
  return (level > 0 ? level : 0) >= max;
}

// ---------------- 商品列表 ----------------
const PLAYER_UPGRADES = [
  { id: 'hp', label: '生命上限' },
  { id: 'fire', label: '攻击速度' },
  { id: 'multi', label: '子弹数量' },
  { id: 'spread', label: '弹道夹角' },
  { id: 'damage', label: '子弹伤害' },
  { id: 'ammo', label: '弹夹容量' },
  { id: 'reload', label: '装填速度' },
  { id: 'cloneLife', label: '分身时长' },
];

const CLONE_UPGRADES = [
  { id: 'hp', label: '生命上限' },
  { id: 'fire', label: '攻击速度' },
  { id: 'multi', label: '子弹数量' },
  { id: 'spread', label: '弹道夹角' },
  { id: 'damage', label: '子弹伤害' },
];

const ITEMS = [
  { id: 'heal', label: '生命药水', desc: '本局开局 +' + cfg.SHOP_ITEM_HEAL_HP + ' 最大生命', price: itemPrice('heal') },
  { id: 'speed', label: '攻速道具', desc: '本局开局射击更快', price: itemPrice('speed') },
  { id: 'multi', label: '多发道具', desc: '本局开局 +' + cfg.SHOP_ITEM_MULTI_GAIN + ' 发子弹', price: itemPrice('multi') },
  { id: 'spread', label: '夹角道具', desc: '本局开局相邻夹角 -' + cfg.SHOP_ITEM_SPREAD_STEP_DEG + '°', price: itemPrice('spread') },
  { id: 'damage', label: '伤害道具', desc: '本局开局 +' + cfg.SHOP_ITEM_DAMAGE_GAIN + ' 伤害', price: itemPrice('damage') },
  { id: 'ammo', label: '弹药包', desc: '本局开局补满弹夹', price: itemPrice('ammo') },
  { id: 'reload', label: '快速装填', desc: '本局装填距离 ×' + cfg.SHOP_ITEM_RELOAD_RATIO, price: itemPrice('reload') },
  { id: 'clone', label: '分身道具（本局）', desc: '本局开局召唤 1 个永久分身', price: itemPrice('clone') },
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

// 弹道夹角：10 / 14 / 22 / 34 / 50 …（套用子弹数量的成长倍率，起点 10）
function spreadCost(level) {
  const lv = level > 0 ? level : 0;
  return cfg.SPREAD_COST_BASE + cfg.SPREAD_COST_GROWTH * lv * (lv + 1);
}

function baseCostOf(id, level) {
  if (id === 'multi') return multiCost(level);
  if (id === 'spread') return spreadCost(level);
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
        desc: it.desc + (own > 0 ? ' · 已有 ' + own : ''),
        own: own,
        cost: it.price,
        maxed: false,
        textX: x + 13,
        x: x,
        y: y,
        w: w,
        h: rh,
      });
    } else {
      const store = isClone ? (data && data.cloneUpgrades) : (data && data.upgrades);
      const lv = (store && store[it.id]) || 0;
      const adj = (store && store.spreadAdj) || 0;

      const maxed = isMaxLevel(it.id, lv);
      const stat = statOf(it.id, lv, isClone, adj);

      const row = {
        id: it.id,
        kind: isClone ? 'clone-upgrade' : 'upgrade',
        label: it.label,
        desc: maxed ? stat.v : (stat.v + ' · ' + stat.step),
        level: lv,
        maxLevel: maxLevelOf(it.id),
        maxed: maxed,
        cost: maxed ? 0 : costOf(it.id, lv, isClone),
        textX: x + 13,
        x: x,
        y: y,
        w: w,
        h: rh,
      };

      // 弹道夹角行：左侧加一条可拖动滑块（范围 = 已购买的最小夹角 ~ 初始夹角）
      if (it.id === 'spread') {
        const base = spreadBaseAt(lv);
        const range = cfg.MULTI_SPREAD_DEG - base;

        if (range > 0.01) {
          let a = adj > 0 ? adj : 0;
          if (a > range) a = range;

          row.slider = { x: x + 6, y: y + 6, w: 30, h: Math.max(16, rh - 12) };
          row.sliderRange = range;
          row.sliderRatio = 1 - a / range;
          row.textX = x + 44;
        }
      }

      rows.push(row);
    }

    y += rh + gap;
  }

  if (mode === 'items') {
    const owned = (data && data.permClones) || 0;

    rows.push({
      id: 'permClone',
      kind: 'perm-clone',
      label: '永久分身',
      desc: '每局开局 +1 个永久分身' + (owned > 0 ? ' · 已有 ' + owned : ''),
      own: owned,
      cost: permCloneCost(owned),
      maxed: false,
      textX: x + 13,
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

// 命中哪一行的夹角滑块（留一点外扩，方便手指按住）
function hitSlider(built, x, y) {
  const rows = (built && built.rows) || [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.slider) continue;

    const s = r.slider;
    if (x >= s.x - 8 && x <= s.x + s.w + 8 && y >= s.y - 6 && y <= s.y + s.h + 6) return r;
  }

  return null;
}

module.exports = {
  build: build,
  hit: hit,
  hitSlider: hitSlider,
  costOf: costOf,
  baseCostOf: baseCostOf,
  spreadCost: spreadCost,
  permCloneCost: permCloneCost,
  upgradeCost: upgradeCost,
  isMaxLevel: isMaxLevel,
  maxLevelOf: maxLevelOf,
  spreadBaseAt: spreadBaseAt,
};
