// 商店：每级加成的数值 / 分身价格倍率

const SHOP_HP_GAIN = 4;         // 每级「生命上限」+4
const SHOP_FIRE_RATIO = 0.92;   // 每级「攻击速度」间隔 ×0.92（约快 8%）
const SHOP_MULTI_GAIN = 2;      // 每级「子弹数量」+2
const SHOP_DAMAGE_GAIN = 0.1;   // 每级「子弹伤害」+0.1

// 分身页所有升级价格 = 主体 × 2
const CLONE_COST_MULT = 2;

module.exports = {
  SHOP_HP_GAIN: SHOP_HP_GAIN,
  SHOP_FIRE_RATIO: SHOP_FIRE_RATIO,
  SHOP_MULTI_GAIN: SHOP_MULTI_GAIN,
  SHOP_DAMAGE_GAIN: SHOP_DAMAGE_GAIN,
  CLONE_COST_MULT: CLONE_COST_MULT,
};
