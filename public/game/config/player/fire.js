// 射击：射速 / 一次几发 / 弹道夹角

// ---------------- 射击间隔（射速） ----------------
const PLAYER_FIRE_MS_START = 1000; // 初始射击间隔：1000 = 每秒 1 发
const PLAYER_FIRE_MS_MIN = 90;     // 间隔下限：再快也不会低于这个值
const BULLET_FIRE_MS = PLAYER_FIRE_MS_START; // 兼容旧名
const SPEED_ITEM_RATIO = 0.80;     // 吃「攻速」道具：间隔 ×0.8（越小越快）

// ---------------- 一次打几发（散射） ----------------
const PLAYER_MULTI_START = 1;  // 初始一次 1 发
const PLAYER_MULTI_MAX = 10;   // 子弹数量上限
const MULTI_SPREAD_DEG = 8;    // 相邻两发之间的基础夹角（度），围绕枪口对称展开

// ---------------- 弹道夹角（相邻子弹的夹角，主体与分身共用同一份） ----------------
// 每升 1 级（或吃 1 个夹角道具）把夹角乘以 0.995，即 -0.5%；越小越集中
const SPREAD_SHOP_RATIO = 0.995; // 商店每级「弹道夹角」×0.995
const SPREAD_ITEM_RATIO = 0.995; // 每个「夹角」道具 ×0.995
const SPREAD_MIN_DEG = 1;        // 夹角下限（度）

module.exports = {
  PLAYER_FIRE_MS_START: PLAYER_FIRE_MS_START,
  PLAYER_FIRE_MS_MIN: PLAYER_FIRE_MS_MIN,
  BULLET_FIRE_MS: BULLET_FIRE_MS,
  SPEED_ITEM_RATIO: SPEED_ITEM_RATIO,
  PLAYER_MULTI_START: PLAYER_MULTI_START,
  PLAYER_MULTI_MAX: PLAYER_MULTI_MAX,
  MULTI_SPREAD_DEG: MULTI_SPREAD_DEG,
  SPREAD_SHOP_RATIO: SPREAD_SHOP_RATIO,
  SPREAD_ITEM_RATIO: SPREAD_ITEM_RATIO,
  SPREAD_MIN_DEG: SPREAD_MIN_DEG,
};
