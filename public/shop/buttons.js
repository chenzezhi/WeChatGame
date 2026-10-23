// 商店布局与命中检测。
// 两个页签：主体 / 分身。分身只有属性升级（没有道具），价格是主体的两倍。

const canvasKit = require('../core/canvas.js');
const cfg = require('../game/config.js');

// 属性升级项（每级加成都固定）
const UPGRADES = [
  { id: 'hp', label: '生命上限', desc: '每级 +' + cfg.SHOP_HP_GAIN + ' 生命' },
  { id: 'fire', label: '攻击速度', desc: '每级 射击间隔 -8%' },
  { id: 'multi', label: '子弹数量', desc: '每级 +' + cfg.SHOP_MULTI_GAIN + ' 发子弹' },
  { id: 'damage', label: '子弹伤害', desc: '每级 +' + cfg.SHOP_DAMAGE_GAIN + ' 伤害' },
];

// 道具购买项（价格固定，仅本局有效；只在主体页签出现）
const ITEMS = [
  { id: 'heal', label: '生命药水', desc: '本局开局 +3 最大生命', price: 3 },
  { id: 'speed', label: '攻速道具', desc: '本局开局射击更快', price: 3 },
  { id: 'multi', label: '多发道具', desc: '本局开局 +1 发子弹', price: 4 },
  { id: 'damage', label: '伤害道具', desc: '本局开局 +0.1 伤害', price: 5 },
  { id: 'clone', label: '分身道具', desc: '本局开局召唤一个分身', price: 8 },
];

// 通用升级费用：0 级 1 枚，之后 2 / 4 / 7 / 11 …
function baseCost(level) {
  const lv = level > 0 ? level : 0;
  return 1 + (lv * (lv + 1)) / 2;
}

// 子弹数量：费用更高（3 / 7 / 15 / 27 / 43 …）
function multiCost(level) {
  const lv = level > 0 ? level : 0;
  return 3 + lv * (lv + 1) * 2;
}

// 按条目取费用（不含分身倍率）
function baseCostOf(id, level) {
  if (id === 'multi') return multiCost(level);
  return baseCost(level);
}

// 最终费用：分身页所有条目 ×2
function costOf(id, level, isClone) {
  const c = baseCostOf(id, level);
  return isClone ? c * cfg.CLONE_COST_MULT : c;
}

// 兼容旧接口
function upgradeCost(level) {
  return baseCost(level);
}

function build(data, tab) {
  const width = canvasKit.width;
  const height = canvasKit.height;
  const isClone = tab === 'clone';

  // 页签
  const w = Math.min(width * 0.88, 460);
  const x = (width - w) / 2;

  const tabH = 38;
  const tabW = (w - 10) / 2;
  const tabY = height * 0.175;

  const tabs = [
    { id: 'player', label: '主体', x: x, y: tabY, w: tabW, h: tabH },
    { id: 'clone', label: '分身', x: x + tabW + 10, y: tabY, w: tabW, h: tabH },
  ];

  // 列表
  const rows = [];
  const list = isClone ? UPGRADES.slice() : UPGRADES.concat(ITEMS);
  const total = list.length;

  const top = tabY + tabH + 14;
  const bottom = height * 0.95;
  const gap = 7;
  const rh = Math.max(34, (bottom - top - gap * (total - 1)) / total);

  let y = top;

  for (let i = 0; i < list.length; i++) {
    const it = list[i];

    if (it.price) {
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

  const back = { id: 'back', kind: 'back', x: 14, y: 14, w: 68, h: 32 };

  return { rows: rows, back: back, tabs: tabs, tab: isClone ? 'clone' : 'player' };
}

// 命中检测：返回按钮对象（含 back / 页签），没有则 null
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
  upgradeCost: upgradeCost,
};
