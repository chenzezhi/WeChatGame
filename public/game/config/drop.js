// 小怪掉落：击败小怪时按概率掉一个道具
// 初始 10%，每前进 DROP_CHANCE_STEP_M 米（约等于每击败一个 Boss）+2%，封顶 80%。

const DROP_CHANCE_BASE = 0.10;  // 初始掉率 10%
const DROP_CHANCE_STEP = 0.02;  // 每 1km 提升 2%
const DROP_CHANCE_MAX = 0.80;   // 掉率上限 80%
const DROP_CHANCE_STEP_M = 1000; // 每多少米提升一次

module.exports = {
  DROP_CHANCE_BASE: DROP_CHANCE_BASE,
  DROP_CHANCE_STEP: DROP_CHANCE_STEP,
  DROP_CHANCE_MAX: DROP_CHANCE_MAX,
  DROP_CHANCE_STEP_M: DROP_CHANCE_STEP_M,
};
