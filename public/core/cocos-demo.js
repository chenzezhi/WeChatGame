'use strict';

/* ==================== 功能 ====================
 * cocos 图集引擎调用 demo
 * 链路：asset-manager 传名称加载 → TableMapper 表格生成配置 → sprite-map 批量渲染。
 * ==============================================*/

/* ==================== 用法 ====================
 * 用「表格」描述布局：第 0 行是字段头，下面每行一张图。
 * 不再逐张手动 add + 设 x/y/scale。
 * ==============================================*/

/* ==================== 注意 ====================
 * 图集加载（无论成功或失败）都会调 env.onReady，
 * 方便调用方在背景挂完之后再挂上层内容。
 * ==============================================*/

const TableMapper = require('./table-mapper.js');
const SpriteMap = require('./sprite-map.js');
const assets = require('./asset-manager.js');

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

    // 布局基准：先算出几个关键位置（居中 / 对齐）
    const bgScale = (h * 1) / 298;
    const barScale = 2;
    const barBgX = (w - 156 * barScale) / 2;
    const barBgY = h * 0.62;

    // 默认值模板：没写到的字段用这里的默认值
    const template = { name: '', x: 0, y: 0, scale: 1 };

    // 表格：第 0 行是字段头，下面每行一张图
    const table = [
      'name x y scale',
      `30 ${w * 0.1} ${h * 0.1} ${bgScale * 0.5}`,
    ];

    // 表格 → 完整配置
    const full = TableMapper.fill(template, table);

    // 批量渲染（字符串解析出的值是字符串，这里转成数字）
    const num = (v) => Number(v);
    for (const cfg of full) {
      const bmp = sm.add(stage, cfg.name, num(cfg.x), num(cfg.y));
      bmp.scale = num(cfg.scale);
    }

    console.log('[cocos-demo] 已渲染 ' + full.length + ' 张图');
    done();
  });
}

module.exports = { start };
