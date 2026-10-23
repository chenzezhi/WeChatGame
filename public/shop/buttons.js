// 商店布局与命中检测。

const canvasKit = require('../core/canvas.js');

// 属性升级项（每级加成都固定）
const UPGRADES = [
  { id: 'hp', label: '生命上限', desc: '每级 +2 最大生命' },
  { id: 'fire', label: '攻击速度', desc: '每级 射击间隔 -8%' },
  { id: 'multi', label: '子弹数量', desc: '每级 +1 发子弹' },
];

// 道具购买项（价格固定，仅本局有效）
const ITEMS = [
  { id: 'heal', label: '生命药水', desc: '本局开局 +3 最大生命', price: 3 },
  { id: 'speed', label: '攻速道具', desc: '本局开局射击更快', price: 3 },
  { id: 'multi', label: '多发道具', desc: '本局开局 +1 发子弹', price: 4 },
  { id: 'clone', label: '分身道具', desc: '本局开局召唤一个分身', price: 8 },
];

// 升级费用：0 级 1 枚，之后 2 / 4 / 7 / 11 …
function upgradeCost(level) {
  const lv = level > 0 ? level : 0;
  return 1 + (lv * (lv + 1)) / 2;
}

function build(data) {
  const width = canvasKit.width;
  const height = canvasKit.height;

  const rows = [];
  const total = UPGRADES.length + ITEMS.length;

  const top = height * 0.27;
  const bottom = height * 0.95;
  const gap = 8;
  const rh = Math.max(38, (bottom - top - gap * (total - 1)) / total);
  const w = Math.min(width * 0.88, 460);
  const x = (width - w) / 2;

  let y = top;

  for (let i = 0; i < UPGRADES.length; i++) {
    const u = UPGRADES[i];
    const lv = (data && data.upgrades && data.upgrades[u.id]) || 0;

    rows.push({
      id: u.id,
      kind: 'upgrade',
      label: u.label,
      desc: u.desc,
      level: lv,
      cost: upgradeCost(lv),
      x: x,
      y: y,
      w: w,
      h: rh,
    });

    y += rh + gap;
  }

  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
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

    y += rh + gap;
  }

  const back = { id: 'back', kind: 'back', x: 14, y: 14, w: 68, h: 32 };

  return { rows: rows, back: back };
}

// 命中检测：返回按钮对象（含 back），没有则 null
function hit(built, x, y) {
  if (!built) return null;

  const back = built.back;
  if (back && x >= back.x && x <= back.x + back.w && y >= back.y && y <= back.y + back.h) return back;

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
  upgradeCost: upgradeCost,
};
