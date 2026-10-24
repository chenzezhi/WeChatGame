// 射击本体参数：射速 / 一次几发 / 弹道夹角的基础值与下限
// 「每级加多少」放在 config/shop/upgrade.js。

// ---------------- 射击间隔（射速） ----------------
const PLAYER_FIRE_MS_START = 1000; // 初始射击间隔：1000 = 每秒 1 发
const PLAYER_FIRE_MS_MIN = 90;     // 间隔下限：再快也不会低于这个值
const BULLET_FIRE_MS = PLAYER_FIRE_MS_START; // 兼容旧名

// ---------------- 一次打几发（散射） ----------------
const PLAYER_MULTI_START = 1;  // 初始一次 1 发
const PLAYER_MULTI_MAX = 10;   // 子弹数量上限
const MULTI_SPREAD_DEG = 8;    // 相邻两发之间的基础夹角（度），围绕枪口对称展开

// ---------------- 弹道夹角 ----------------
// 主体与分身共用同一个夹角值：谁升级都作用在同一个数上
const SPREAD_MIN_DEG = 1;      // 夹角下限（度）

module.exports = {
  PLAYER_FIRE_MS_START: PLAYER_FIRE_MS_START,
  PLAYER_FIRE_MS_MIN: PLAYER_FIRE_MS_MIN,
  BULLET_FIRE_MS: BULLET_FIRE_MS,
  PLAYER_MULTI_START: PLAYER_MULTI_START,
  PLAYER_MULTI_MAX: PLAYER_MULTI_MAX,
  MULTI_SPREAD_DEG: MULTI_SPREAD_DEG,
  SPREAD_MIN_DEG: SPREAD_MIN_DEG,
};
