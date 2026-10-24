// 道具：出现规律（间隔 / 首个位置 / 图标尺寸）

const screen = require('../screen.js');

const ITEM_FIRST_M = 160;    // 第一个道具大约在第 160 米
const ITEM_SIZE = Math.round(screen.PLAYER_W * 0.78); // 道具图标直径
const ITEM_GAP_MIN_START_M = 150; // 初始两个道具的间隔（下限）
const ITEM_GAP_MAX_START_M = 300; // 初始两个道具的间隔（上限），实际在上下限间随机
const ITEM_GAP_DECAY = 0.045;     // 每深入 1 米，间隔收窄 0.045 米（出现越来越勤）
const ITEM_GAP_MIN_MIN_M = 80;    // 间隔下限的下限（最勤时最短 80 米）
const ITEM_GAP_MAX_MIN_M = 160;   // 间隔上限的下限（最勤时最长 160 米）

module.exports = {
  ITEM_FIRST_M: ITEM_FIRST_M,
  ITEM_SIZE: ITEM_SIZE,
  ITEM_GAP_MIN_START_M: ITEM_GAP_MIN_START_M,
  ITEM_GAP_MAX_START_M: ITEM_GAP_MAX_START_M,
  ITEM_GAP_DECAY: ITEM_GAP_DECAY,
  ITEM_GAP_MIN_MIN_M: ITEM_GAP_MIN_MIN_M,
  ITEM_GAP_MAX_MIN_M: ITEM_GAP_MAX_MIN_M,
};
