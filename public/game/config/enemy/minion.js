// 小怪：生成节奏 / 数量 / 血量成长

const ENEMY_GAP_START_M = 100;  // 初始每 100 米刷一波
const ENEMY_GAP_MIN_M = 40;     // 波间隔下限（最快 40 米一波）
const ENEMY_GAP_DECAY = 0.02;   // 每深入 1 米，间隔缩短 0.02 米
const ENEMY_COUNT_STEP_M = 400; // 每 400 米，一波敌人数量 +1
const ENEMY_MAX_COUNT = 5;      // 一波最多几个敌人
const ENEMY_HP_STEP_M = 400;    // 每 400 米，敌人血量 +1

module.exports = {
  ENEMY_GAP_START_M: ENEMY_GAP_START_M,
  ENEMY_GAP_MIN_M: ENEMY_GAP_MIN_M,
  ENEMY_GAP_DECAY: ENEMY_GAP_DECAY,
  ENEMY_COUNT_STEP_M: ENEMY_COUNT_STEP_M,
  ENEMY_MAX_COUNT: ENEMY_MAX_COUNT,
  ENEMY_HP_STEP_M: ENEMY_HP_STEP_M,
};
