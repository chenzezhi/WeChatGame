'use strict';

/* ==================== 功能 ====================
 * 战斗配置 —— 只放数据和「插槽」
 *
 * 三个数据文件在哪、开局给多少银币、放一把武器多少钱、法阵有几格耐久。
 * 武器 / 怪物 / 波次的数值不在这里，在 src/data/ 的三个 txt 里。
 * ==============================================*/

/* ==================== 用法 ====================
 * const COMBAT = require('../config/combat.js');
 * const battle = Battle.create({ board, shop, player, width: w, height: h, config: COMBAT });
 * ==============================================*/

module.exports = {
  // 三个数据文件的路径，相对包根
  files: {
    weapons: 'src/data/weapons.txt',
    monsters: 'src/data/monsters.txt',
    waves: 'src/data/waves.txt',
  },

  // 模板：战斗的默认参数
  template: {
    coins: 100,          // 开局银币
    weaponCost: 20,      // 往一个格子放武器花多少银币
    cellHp: 10,          // 法阵耐久：每只怪走到法阵扣多少血（见怪物表 damage）

    spawnMargin: 80,     // 怪物出生点离屏幕边缘的距离，单位 px（负数在外，正数在内）
    hitRadius: 30,       // 子弹命中判定半径，单位 px
    bulletLifeMs: 5000,  // 子弹最长存活时间，单位毫秒
    fireCooldownMs: 120, // 全局开火间隔，单位毫秒（防止一帧发多颗）

    /* ★ 插槽：篝火
     * campfireRadiusRatio - 篝火的到达判定半径，占格子宽度的比例
     * campfireSizeRatio   - 篝火画多大，占格子宽度的比例
     */
    campfireRadiusRatio: 0.45,
    campfireSizeRatio: 0.9,

    /* ★ 插槽：占位素材
     * 没有美术时，武器 / 子弹 / 怪物 / 按钮都用简单形状画
     * 换成真素材时改成：'图集名字' 或 'src/assets/xxx.png'
     */
    cardAsset: 30,
    bulletAsset: 30,
    buttonAsset: 30,
  },
};
