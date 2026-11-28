'use strict';

/* ==================== 功能 ====================
 * 人物配置 —— 只放数据和「插槽」
 *
 * 人物怎么走写在 src/data/player.txt（纯文本），这里只放两样东西：
 *   1. 那个文件在哪
 *   2. 画人物要用的素材（★ 这里是你填的地方）
 * ==============================================*/

/* ==================== 用法 ====================
 * const PLAYER = require('../config/player.js');
 * PlayerView.create({ stage, am, board, config: PLAYER });
 * ==============================================*/

module.exports = {
  // 人物运动数据，路径相对包根
  file: 'src/data/player.txt',

  /* ★ 插槽 1：人物动画
   * 填 public/config/assets.js 里 clips 的 key（目前只有 nf1 / nf2）
   * 四个方向各填一个；四个都填同一个名字也能跑，只是四个方向长得一样
   */
  clips: {
    up: 'nf1',
    down: 'nf2',
    left: 'nf1',
    right: 'nf2',
  },

  /* ★ 插槽 2：人物大小与位置
   * sizeRatio - 人物高度占格子高度的比例，0.8 就是占八格高
   * offsetX / offsetY - 相对格子左上角的偏移，单位 px，用来调脚踩在格子中间
   */
  sizeRatio: 0.8,
  offsetX: 0,
  offsetY: 0,

  /* ★ 插槽 3：跳跃动画
   * jumpMs     - 一下跳多久，单位毫秒
   * jumpHeight - 跳多高，占人物高度的比例
   */
  jumpMs: 220,
  jumpHeight: 0,   // 设 0 = 不跳，直接走过去

  /* ★ 插槽 4：到格判定误差
   * arriveToleranceRatio - 离格子中心多近就算「到了」，占格子边长的比例
   * 0 = 必须到格心；0.3 = 走到离格心 30% 格子宽的地方就算到
   */
  arriveToleranceRatio: 0.3,
};
