'use strict';

/* ==================== 功能 ====================
 * 单张图片渲染 demo（背景平铺）
 *
 * 把一张图平铺铺满整个屏幕，当最底层的背景。
 * 写法：默认配置 + 表格只写差异（和 cocos 图集 demo 完全一样的套路）。
 * ==============================================*/

/* ==================== 用法 ====================
 * 1) TEMPLATE 是默认配置，写一次；
 * 2) table 第 0 行是字段头，下面是数据行；
 * 3) 数据行里「不想改的列写 n」，表示保持默认值。
 *
 * 想换图片 → 改 table 里那个 url
 * 想铺得更密 → 把 scale 改小（例如 0.1）
 * 想有缝隙 → 把 gap 改大
 * ==============================================*/

const TableMapper = require('./table-mapper.js');
const ImageMap = require('./image-map.js');

function start(env) {
  const stage = env.stage;
  const W = stage.canvas.width;    // 屏幕物理像素宽
  const H = stage.canvas.height;   // 屏幕物理像素高

  /* ---------- 1. 默认配置：所有字段的默认值只写这一次 ---------- */
  const TEMPLATE = {
    url: '',
    x: 0,
    y: 0,
    right: W,          // 默认铺到屏幕右边
    bottom: H,         // 默认铺到屏幕底部
    scale: 1,          // 每个格子 = 原图 × scale
    gap: 0,            // 格子间距
    margin: 0,         // 区域四周留白
    bottomLayer: true, // 当背景，压到最底层
  };

  /* ---------- 2. 表格：只写和默认值不同的部分 ---------- */
  const table = [
    'url x y right bottom scale gap margin',
    // 这张图只改了 scale（0.25），其它全是 n = 用默认值
    'src/assets/mapBg/mb1.jpg n n n n 0.25 n n',
  ];

  /* ---------- 3. 表格 + 默认配置 → 完整配置 ---------- */
  const full = TableMapper.fill(TEMPLATE, table);
  const num = (v) => Number(v);

  /* ---------- 4. 一行渲染 ---------- */
  for (const cfg of full) {
    ImageMap.tile(
      stage,
      cfg.url,
      {
        x: num(cfg.x),
        y: num(cfg.y),
        right: num(cfg.right),
        bottom: num(cfg.bottom),
        scale: num(cfg.scale),
        gap: num(cfg.gap),
        margin: num(cfg.margin),
        bottomLayer: cfg.bottomLayer,
      },
      null,
      (err) => console.error('[image-demo] ' + err.message)
    );
  }

  console.log('[image-demo] 背景平铺 ' + full.length + ' 张');

  if (env.onReady) env.onReady();
}

module.exports = { start };
