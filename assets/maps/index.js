/**
 * 地图清单（assets/maps）
 *
 * 新增一张地图：
 *   1. 新建 assets/maps/level-2.js（module.exports = { name, rows }）
 *   2. 在下面加一行： 'level-2': require('./level-2.js')
 *   3. 把 floor-config.js 的 mapName 改成 'level-2'
 *
 * ⚠️ 必须在这里静态 require，否则小游戏编译期分析不到、运行时会找不到文件。
 */
'use strict';

module.exports = {
  'level-1': require('./level-1.js')
};
