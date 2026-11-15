'use strict';

/* ==================== 功能 ====================
 * 单张图片渲染 demo（当背景用）
 * 把一张图平铺铺满整个屏幕，作为最底层的背景。
 * 走 ImageMap.tile()，不经过图集、也不做动画。
 * ==============================================*/

/* ==================== 用法 ====================
 * 第 0 行是字段头，下面每行一张背景图：
 *   url x y scale width height
 *
 *   scale   每张小图的倍数（调小 → 铺得更密）
 *   width   平铺区域宽（写 0 = 铺满整屏）
 *   height  平铺区域高（写 0 = 铺满整屏）
 * ==============================================*/

const TableMapper = require('./table-mapper.js');
const ImageMap = require('./image-map.js');

// 默认值模板：没写到的字段用这里的默认值
const TEMPLATE = { url: '', x: 0, y: 0, scale: 1, width: 0, height: 0 };

function start(env) {
  const stage = env.stage;
  const W = stage.canvas.width;   // 物理像素
  const H = stage.canvas.height;

  // 表格：第 0 行是字段头，下面每行一张图
  // width / height 写 0 → 铺满整屏
  const table = [
    'url x y scale width height',
    'src/assets/mapBg/mb1.png 0 0 1 0 0',
  ];

  // 表格 → 完整配置
  const full = TableMapper.fill(TEMPLATE, table);
  const num = (v) => Number(v);

  for (const cfg of full) {
    ImageMap.tile(
      stage,
      cfg.url,
      {
        x: num(cfg.x),
        y: num(cfg.y),
        scale: num(cfg.scale) || 1,
        width: num(cfg.width) || W,
        height: num(cfg.height) || H,
        bottom: true,   // 背景，压到最底层
      },
      null,
      (err) => console.error('[image-demo] ' + err.message)
    );
  }

  console.log('[image-demo] 背景平铺 ' + full.length + ' 张');

  if (env.onReady) env.onReady();
}

module.exports = { start };
