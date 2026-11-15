'use strict';

/* ==================== 功能 ====================
 * cocos 图集 demo
 *
 * 链路：asset-manager 按名称加载 → 配置模板（config/render.js）
 *       → 表格 → sprite-map.render 统一渲染。
 * ==============================================*/

/* ==================== 用法 ====================
 * rows 里一行 = 一张小图，只写要改的值。
 * 字段顺序：name x y scale gap margin right bottom
 *
 * name 可以写名字，也可以写序号（最左上角是 1）。
 * ==============================================*/

/* ==================== 注意 ====================
 * 图集加载（无论成功或失败）都会调 env.onReady，
 * 方便调用方在背景挂完之后再挂上层内容。
 * ==============================================*/

const TableMapper = require('./table-mapper.js');
const SpriteMap = require('./sprite-map.js');
const assets = require('./asset-manager.js');
const Render = require('../config/render.js');

function start(env) {
  const stage = env.stage;
  // 传名称即可：自动加载 src/assets/gameMap.png + gameMap.json
  const gameMap = assets.atlas('gameMap');
  const sm = SpriteMap.of(gameMap);

  // 成功、失败都要交接，否则加载出错时后面的内容永远不出来
  const done = () => env.onReady && env.onReady();
  gameMap.onError(() => done());

  sm.ready(() => {
    const w = stage.canvas.width;   // 物理像素
    const h = stage.canvas.height;

    // 布局基准：先算出几个关键位置
    const bgScale = h / 298;

    // 默认配置模板（含字段顺序），只写一次，在 config/render.js 里
    const def = Render.sprite(stage);

    // 数据行：只写要改的值（name x y scale）
    const rows = [`30 ${w * 0.1} ${h * 0.1} ${bgScale * 0.1}`];

    // 表格 → 完整配置数组
    const list = TableMapper.fill(def.template, rows, def.fields);

    // 一行渲染
    for (const cfg of list) {
      sm.render(stage, cfg);
    }

    console.log('[cocos-demo] 已渲染 ' + list.length + ' 张图');
    done();
  });
}

module.exports = { start };
