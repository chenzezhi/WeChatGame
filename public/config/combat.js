'use strict';

/* ==================== 功能 ====================
 * 战斗配置 —— 只放数据和「插槽」
 *
 * 三张表在哪、开局给多少银币、武器最高几级、波次怎么自动长。
 * 武器 / 怪物的具体数值在 src/data/ 的两个 txt 里。
 * ==============================================*/

/* ==================== 用法 ====================
 * const COMBAT = require('../config/combat.js');
 * const battle = Battle.create({ board, shop, player, width: w, height: h, config: COMBAT });
 * ==============================================*/

module.exports = {
  // 数据文件路径，相对包根
  files: {
    weapons: 'src/data/weapons.txt',
    monsters: 'src/data/monsters.txt',
  },

  // 模板：战斗的默认参数
  template: {
    coins: 80,           // 开局银币
    cellHp: 100,          // 篝火耐久（怪物走到篝火扣它的 damage）
    maxLevel: 5,         // 武器最高等级，到顶就不能再合成

    refreshCost: 15,     // 刷新商店的价格，单位银币
    refreshCostBase: 15, // 第一次刷新多少钱
    refreshCostStep: 1,  // 每刷一次加多少钱

    /* ★ 商店随机规则（名字对应 src/data/weapons.txt）
     * weaponWeights - 每种卡被刷出来的权重
     * levelWeights  - 1~4 级被刷出来的权重（自动归一化）
     * buyMarkup     - 直接买 2 级以上时相对合成价的倍率
     */
    weaponWeights: { arrow: 26, axe: 20, spear: 16, staff: 12, blade: 8, heart: 10, boost: 8 },
    levelWeights: [58, 27, 11, 3, 1],
    buyMarkup: 1.2,

    spawnMargin: 220,    // 怪物出生点离屏幕边缘的距离，单位 px（大于 0 就在屏幕外）（负数在外，正数在内）
    hitRadius: 30,       // 子弹命中判定半径，单位 px
    bulletLifeMs: 12000,  // 子弹最长存活时间，单位毫秒

    /* ★ 波次机制：全部自动算，不用手写每一波
     * waveBase   - 第 1 波几只
     * waveAdd    - 每多一波，数量增加多少（累加）
     * hpGrowth   - 每多一波，血量乘以多少
     * speedGrowth- 每多一波，速度乘以多少
     * eliteFrom  - 从第几波开始少量出精英怪
     * bossEvery  - 每几波来一个首领
     */
    waveClearBase: 10,   // 通关奖励基数：第 1 波给 10，第 2 波 11，第 3 波 12……
    waveBase: 3,
    waveAdd: 1.4,
    hpGrowth: 1.18,
    speedGrowth: 1.02,
    eliteFrom: 3,
    bossEvery: 5,

    /* ★ 插槽：篝火
     * campfireRadiusRatio - 到达判定半径，占格子宽度的比例
     * campfireSizeRatio   - 篝火画多大，占格子宽度的比例
     */
    campfireRadiusRatio: 0.45,
    campfireSizeRatio: 1,

    // 子弹相对武器的缩小倍数（1 = 和武器图标一样大）
    bulletScale: 0.42,

    /* 旋刃对同一只怪的再次受伤冷却，单位毫秒
     * 600 = 0.6 秒内同一只怪只挨一次，之后还碰得到就继续挨
     */
    spinHitCdMs: 600,

    // 卖卡返还比例（0.8 = 原价八成）
    sellRatio: 0.8,

    // 调试：给商店外壳画框（洋红=盒子范围，黄=图片实际范围）
    debugShell: false,

    /* ★ 抽奖奖池：三个宝箱，从左到右
     * label   - 宝箱名字
     * price   - 开一次要多少银币
     * weights - 1~4 级的权重，决定抽到高等级的概率
     */
    chests: [
      { label: '初级', price: 30, weights: [66, 24, 8, 2, 0] },
      { label: '中级', price: 60, weights: [38, 34, 20, 6, 2] },
      { label: '高级', price: 100, weights: [10, 28, 34, 20, 8] },
    ],
    gachaRollMs: 1400,

    // 加耐久卡的触发冷却，单位毫秒（可重复触发，但不能每帧都加）
    healCdMs: 1500,

    // 加速卡的触发冷却，单位毫秒（每张卡各自计时）
    speedCdMs: 2000,

    // 怪物画多大，占格子宽度的比例
    monsterSizeRatio: 0.5,

    /* ★ 战斗表现
     * shotGapMs  - 多发之间的间隔，单位毫秒（8 发就是分 8 次发出）
     * battleZoom - 战斗时画面缩小到多少（1 = 不缩，0.62 = 缩到 62%）
     */
    shotGapMs: 70,
    battleZoom: 0.5,
  },
};
