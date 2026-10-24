// 商店：所有价格 + 价格成长规律
// 升级价：0 级 1 枚 → 2 / 4 / 7 / 11 …（公式在 shop/buttons.js 的 baseCost）
// 子弹数量：3 / 7 / 15 / 27 / 43 …
// 弹道夹角：10 / 14 / 22 / 34 / 50 …（套用子弹数量的成长，只是起点换成 10）

// 分身页所有升级价格 = 主体 × 该倍率
const CLONE_COST_MULT = 2;

// 永久分身：第 1 个 1000，之后每个 +1000
const PERM_CLONE_BASE_COST = 1000;
const PERM_CLONE_COST_STEP = 1000;

// 弹道夹角升级价：第 lv 级（从 0 起）= BASE + GROWTH × lv × (lv + 1)
const SPREAD_COST_BASE = 10;   // 第 1 级 10 金币
const SPREAD_COST_GROWTH = 2;  // 与「子弹数量」相同的成长倍率

// 道具购买价（本局有效）
const SHOP_ITEM_PRICES = {
  heal: 3,
  speed: 3,
  multi: 4,
  spread: 6,
  damage: 5,
  ammo: 3,
  reload: 4,
  clone: 8,
};

module.exports = {
  CLONE_COST_MULT: CLONE_COST_MULT,
  PERM_CLONE_BASE_COST: PERM_CLONE_BASE_COST,
  PERM_CLONE_COST_STEP: PERM_CLONE_COST_STEP,
  SPREAD_COST_BASE: SPREAD_COST_BASE,
  SPREAD_COST_GROWTH: SPREAD_COST_GROWTH,
  SHOP_ITEM_PRICES: SHOP_ITEM_PRICES,
};
