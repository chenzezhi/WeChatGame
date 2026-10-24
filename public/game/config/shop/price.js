// 商店：价格规则

// 弹道夹角：第 1 级 10 金币，之后套用「子弹数量」的成长倍率
//   子弹数量：3 / 7 / 15 / 27 / 43 …（每级增量 4 / 8 / 12 / 16 …）
//   弹道夹角：10 / 14 / 22 / 34 / 50 …（增量相同，只是起点换成 10）
const SPREAD_COST_BASE = 10;   // 夹角第 1 级价格
const SPREAD_COST_GROWTH = 2;  // 每级增量 = SPREAD_COST_GROWTH × lv（与子弹数量一致）

module.exports = {
  SPREAD_COST_BASE: SPREAD_COST_BASE,
  SPREAD_COST_GROWTH: SPREAD_COST_GROWTH,
};
