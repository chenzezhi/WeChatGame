// 吃经验升级的本体成长 + 经验需求
// （血量成长在 hp.js，商店加成在 shop/upgrade.js）

const LEVEL_FIRE_RATIO = 0.985;  // 每级射击间隔 ×0.985（约快 1.5%）
const LEVEL_MULTI_EVERY = 3;     // 每 3 级子弹数量 +1

const XP_BASE = 10;   // 1 级升 2 级需要 10 点
const XP_STEP = 5;    // 之后每级需求 +5（10 / 15 / 20 …）

module.exports = {
  LEVEL_FIRE_RATIO: LEVEL_FIRE_RATIO,
  LEVEL_MULTI_EVERY: LEVEL_MULTI_EVERY,
  XP_BASE: XP_BASE,
  XP_STEP: XP_STEP,
};
