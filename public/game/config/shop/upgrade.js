// 商店：每一项「每级 / 每个加多少」都在这里
// 包括：主体属性、分身属性、道具（花钱买的那些）的效果数值

// ------------- 主体属性升级：每级加多少 -------------
const SHOP_HP_GAIN = 4;         // 每级「生命上限」+4
const SHOP_FIRE_RATIO = 0.92;   // 每级「攻击速度」间隔 ×0.92（约快 8%）
const SHOP_MULTI_GAIN = 1;      // 每级「子弹数量」+1（1 发 → 上限 10 发，共 9 级）
const SHOP_DAMAGE_GAIN = 0.1;   // 每级「子弹伤害」+0.1
const SHOP_AMMO_GAIN = 2;       // 每级「弹夹容量」+2
const RELOAD_SHOP_STEP_M = 1;   // 每级「装填速度」-1 米
const CLONE_LIFE_STEP_MS = 2000; // 每级「分身时长」+2 秒存活

// ------------- 弹道夹角：每级直接减「度数」（加法） -------------
// 相邻两发之间的夹角，每级减 SPREAD_SHOP_STEP_DEG 度。
// 主体与分身各自独立：主体吃 upgrades.spread，分身吃 cloneUpgrades.spread。
// 初始 8°，减到 SPREAD_MIN_DEG(0) 需要 8 / 0.4 = 20 级。
const SPREAD_SHOP_STEP_DEG = 0.4;

// ------------- 道具（花钱买的）：本局开局的加成 -------------
const SHOP_ITEM_HEAL_HP = 3;          // 生命药水：+3 最大生命
const SHOP_ITEM_SPEED_RATIO = 0.80;   // 攻速道具：射击间隔 ×0.8
const SHOP_ITEM_MULTI_GAIN = 1;       // 多发道具：+1 发子弹
const SHOP_ITEM_DAMAGE_GAIN = 0.1;    // 伤害道具：+0.1 伤害
const SHOP_ITEM_SPREAD_STEP_DEG = 0.4; // 夹角道具：相邻夹角 -0.4 度
const SHOP_ITEM_RELOAD_RATIO = 0.80;  // 快速装填：装填距离 ×0.8

// 旧名保留（已不再参与计算，仅防外部引用报错）
const SPREAD_SHOP_RATIO = 0.995;
const SHOP_ITEM_SPREAD_RATIO = 0.995;

module.exports = {
  SHOP_HP_GAIN: SHOP_HP_GAIN,
  SHOP_FIRE_RATIO: SHOP_FIRE_RATIO,
  SHOP_MULTI_GAIN: SHOP_MULTI_GAIN,
  SHOP_DAMAGE_GAIN: SHOP_DAMAGE_GAIN,
  SHOP_AMMO_GAIN: SHOP_AMMO_GAIN,
  RELOAD_SHOP_STEP_M: RELOAD_SHOP_STEP_M,
  CLONE_LIFE_STEP_MS: CLONE_LIFE_STEP_MS,
  SPREAD_SHOP_STEP_DEG: SPREAD_SHOP_STEP_DEG,
  SHOP_ITEM_HEAL_HP: SHOP_ITEM_HEAL_HP,
  SHOP_ITEM_SPEED_RATIO: SHOP_ITEM_SPEED_RATIO,
  SHOP_ITEM_MULTI_GAIN: SHOP_ITEM_MULTI_GAIN,
  SHOP_ITEM_DAMAGE_GAIN: SHOP_ITEM_DAMAGE_GAIN,
  SHOP_ITEM_SPREAD_STEP_DEG: SHOP_ITEM_SPREAD_STEP_DEG,
  SHOP_ITEM_RELOAD_RATIO: SHOP_ITEM_RELOAD_RATIO,
  SPREAD_SHOP_RATIO: SPREAD_SHOP_RATIO,
  SHOP_ITEM_SPREAD_RATIO: SHOP_ITEM_SPREAD_RATIO,
};
