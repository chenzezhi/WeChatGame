// 商店等级上限：由各个属性自身的天花板反推出来，供商店 UI 与属性计算共用。
// 达到上限后商店按钮显示「满级」并变灰，不能再买。

const player = require('../player/index.js');
const clone = require('../clone.js');
const active = require('../active.js');
const upgrade = require('./upgrade.js');

// 按比例收敛（攻速）：一直乘 ratio 直到低于 minMs
function levelsByRatio(startMs, minMs, ratio) {
  let ms = startMs;
  let n = 0;

  while (ms > minMs && n < 2000) {
    ms = Math.round(ms * ratio);
    if (ms < minMs) ms = minMs;
    n++;
  }

  return n;
}

// 按固定步长收敛（血量 / 弹夹 / 装填 / 夹角 / 分身时长 / 主动道具时长）
function levelsByStep(start, end, step) {
  if (!step) return 0;
  const diff = Math.abs((end - start) / step);
  const n = Math.ceil(diff - 1e-9);
  return n > 0 ? n : 0;
}

const SHOP_MAX_LEVEL = {
  hp: levelsByStep(player.PLAYER_MAX_HP, player.LEVEL_HP_MAX, upgrade.SHOP_HP_GAIN),
  fire: levelsByRatio(player.PLAYER_FIRE_MS_START, player.PLAYER_FIRE_MS_MIN, upgrade.SHOP_FIRE_RATIO),
  multi: levelsByStep(player.PLAYER_MULTI_START, player.PLAYER_MULTI_MAX, upgrade.SHOP_MULTI_GAIN),
  spread: levelsByStep(player.MULTI_SPREAD_DEG, player.SPREAD_MIN_DEG, -upgrade.SPREAD_SHOP_STEP_DEG),
  damage: levelsByStep(player.PLAYER_DAMAGE_START, player.PLAYER_DAMAGE_MAX, upgrade.SHOP_DAMAGE_GAIN),
  ammo: levelsByStep(player.PLAYER_AMMO_START, player.PLAYER_AMMO_MAX, upgrade.SHOP_AMMO_GAIN),
  reload: levelsByStep(player.RELOAD_M_START, player.RELOAD_M_MIN, -upgrade.RELOAD_SHOP_STEP_M),
  cloneLife: levelsByStep(clone.CLONE_LIFE_BASE_MS, clone.CLONE_LIFE_MAX_MS, upgrade.CLONE_LIFE_STEP_MS),

  // 主动道具：只能升级「持续时长」
  shield: levelsByStep(active.SHIELD_DURATION_MS, active.ACTIVE_DURATION_MAX_MS, active.SHIELD_STEP_MS),
  grow: levelsByStep(active.GROW_DURATION_MS, active.ACTIVE_DURATION_MAX_MS, active.GROW_STEP_MS),
};

module.exports = { SHOP_MAX_LEVEL: SHOP_MAX_LEVEL };
