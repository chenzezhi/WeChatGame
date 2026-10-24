// 玩家血量：初始值 / 吃经验升级的成长 / 上限

const PLAYER_MAX_HP = 10;   // 初始最大生命（商店 / 升级可提升）
const LEVEL_HP_GAIN = 1;    // 每升 1 级最大生命 +1（升级瞬间回满）
const LEVEL_HP_MAX = 60;    // 最大生命上限

module.exports = {
  PLAYER_MAX_HP: PLAYER_MAX_HP,
  LEVEL_HP_GAIN: LEVEL_HP_GAIN,
  LEVEL_HP_MAX: LEVEL_HP_MAX,
};
