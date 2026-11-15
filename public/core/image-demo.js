'use strict';

/* ==================== 功能 ====================
 * 单张图片渲染 demo
 * 演示「独立的普通图片」怎么渲染：既不在图集里，也不是精灵图动画。
 * 布局同样用「表格」描述，和其他 demo 保持一致。
 * ==============================================*/

/* ==================== 用法 ====================
 * 第 0 行是字段头，下面每行一张图：
 *   url x y scale height
 *
 * 尺寸两种写法，二选一（另一个写 n 占位）：
 *   scale   倍数：显示尺寸 = 原图 × scale（跨分辨率不稳，慎用）
 *   height  目标高度：工具自动反算 scale（推荐，任何屏幕都合适）
 * ==============================================*/

const TableMapper = require('./table-mapper.js');
const ImageMap = require('./image-map.js');

// 默认值模板：没写到的字段用这里的默认值
const TEMPLATE = { url: '', x: 0, y: 0, scale: 1, height: 0 };

function start(env) {
  const stage = env.stage;
  const h = stage.canvas.height;

  // 表格：第 0 行是字段头，下面每行一张图
  // scale 列写 n（占位，不改默认值），尺寸交给 height
  const table = [
    'url x y scale height',
    `src/assets/mapBg/mb1.jpg 0 ${h * 0} n ${h * 1.1}`,
  ];

  // 表格 → 完整配置
  const full = TableMapper.fill(TEMPLATE, table);

  // 字符串解析出的值是字符串，这里转成数字
  const num = (v) => Number(v);

  // 逐行渲染：一张图一行
  for (const cfg of full) {
    renderRow(stage, cfg, num);
  }

  console.log('[image-demo] 已渲染 ' + full.length + ' 张图');

  if (env.onReady) env.onReady();
}

// 渲染一行：先取原图高度，再把「目标高度」换算成 scale
function renderRow(stage, cfg, num) {
  const url = cfg.url;
  const targetH = num(cfg.height);

  ImageMap.size(
    url,
    (w, imgH) => {
      ImageMap.add(
        stage,
        url,
        num(cfg.x),
        num(cfg.y),
        (bmp) => {
          // 给了目标高度就按高度算，否则用配置里的倍数
          bmp.scale = targetH ? targetH / imgH : num(cfg.scale);
          console.log(
            '[image-demo] ' + url + ' 原图 ' + w + 'x' + imgH + ' → scale ' + bmp.scale.toFixed(3)
          );
        },
        (err) => console.error('[image-demo] ' + err.message)
      );
    },
    (err) => console.error('[image-demo] ' + err.message)
  );
}

module.exports = { start };
