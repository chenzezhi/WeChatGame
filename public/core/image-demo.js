'use strict';

/* ==================== 功能 ====================
 * 单张图片渲染 demo
 * 演示「独立的普通图片」怎么渲染：既不在图集里，也不是精灵图动画。
 * 布局同样用「表格」描述，和其他 demo 保持一致。
 * ==============================================*/

/* ==================== 用法 ====================
 * 第 0 行是字段头，下面每行一张图：
 *   url x y scale
 * scale 省略就用模板默认值 1。
 * ==============================================*/

const TableMapper = require('./table-mapper.js');
const ImageMap = require('./image-map.js');

// 默认值模板：没写到的字段用这里的默认值
const TEMPLATE = { url: '', x: 0, y: 0, scale: 1 };

function start(env) {
  const stage = env.stage;
  const h = stage.canvas.height;

  // 表格：第 0 行是字段头，下面每行一张图
  const table = [
    'url x y scale',
    `src/assets/mapBg/mb1.png 0 ${h * 0} 10`,
  ];

  // 表格 → 完整配置
  const full = TableMapper.fill(TEMPLATE, table);

  // 字符串解析出的值是字符串，这里转成数字
  const num = (v) => Number(v);

  // 批量渲染：一张图一行，加载完自动挂上
  for (const cfg of full) {
    ImageMap.add(stage, cfg.url, num(cfg.x), num(cfg.y), (bmp) => {
      bmp.scale = num(cfg.scale);
    });
  }

  console.log('[image-demo] 已渲染 ' + full.length + ' 张图');

  if (env.onReady) env.onReady();
}

module.exports = { start };
