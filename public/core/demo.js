'use strict';

/* ==================== 功能 ====================
 * 唯一 demo —— 所有渲染都走同一张表格
 *
 * 三种渲染器（image / sprite / anim）共用一套数据格式，
 * 表格第一个字段就是 renderer，指定用哪个渲染器。
 * ==============================================*/

/* ==================== 用法 ====================
 * 表格第 0 行是字段头，下面是数据行：
 *
 *   renderer name x y scale gap margin right bottom
 *
 * - renderer : image | sprite | anim（用哪个渲染器）
 * - name     : 图片路径 / 图集小图名字或序号 / 动画名
 * - scale    : 大小倍数
 * - right/bottom : 平铺区域右下角，写 0 就不平铺，只放一张
 * - 行尾字段可以不写，不写 = 用 config/render.js 的默认值
 *
 * 表格顺序 = 渲染顺序（cax 没有 zIndex，后加的盖前面）。
 * ==============================================*/

/* ==================== 注意 ====================
 * 图片、图集、精灵图都是异步加载的，这里先等它们全部就绪，
 * 再按表格顺序一次性渲染，保证层级和表格顺序一致。
 *
 * 动画名必须和 config/assets.js 里 clips 的 key 一致（现在是 nf1 / nf2）。
 * ==============================================*/

const TableMapper = require('./table-mapper.js');
const SpriteMap = require('./sprite-map.js');
const AnimMap = require('./anim-map.js');
const ImageMap = require('./image-map.js');
const assets = require('./asset-manager.js');
const TEMPLATE = require('../config/render.js').template;
const SHEET = require('../config/assets.js');

function start(env) {
  const stage = env.stage;
  const w = stage.canvas.width;    // 物理像素
  const h = stage.canvas.height;

  const sm = SpriteMap.of(assets.atlas('gameMap'));
  let am = null;

  /* ---------- 1. 先等图集和精灵图就绪（要知道尺寸才能算 scale）---------- */
  whenReady(
    [
      (next) => sm.ready(next),
      (next) =>
        AnimMap.load(
          SHEET,
          (m) => {
            am = m;
            next();
          },
          (err) => {
            console.error('[demo] 精灵图加载失败：' + err.message);
            next();
          }
        ),
    ],
    () => {
      /* ---------- 2. 表格：第 0 行是字段头，下面是数据 ---------- */
      const table = buildTable(w, h, am);

      /* ---------- 3. 表格 → 完整配置数组 ---------- */
      const list = TableMapper.fill(TEMPLATE, table);

      /* ---------- 4. 预热图片（预热后 render 就是同步的，顺序可控）---------- */
      const imageUrls = list.filter((c) => c.renderer === 'image').map((c) => c.name);

      whenReady(
        imageUrls.map(
          (url) => (next) =>
            ImageMap.size(
              url,
              () => next(),
              (err) => {
                console.error('[demo] 图片加载失败：' + err.message);
                next();
              }
            )
        ),
        () => {
          /* ---------- 5. 按表格顺序逐行渲染 ---------- */
          const renderers = {
            image: (cfg) => ImageMap.render(stage, cfg),
            sprite: (cfg) => sm.render(stage, cfg),
            anim: (cfg) => (am ? am.render(stage, cfg) : null),
          };

          for (const cfg of list) {
            const render = renderers[cfg.renderer];
            if (!render) {
              console.warn('[demo] 不认识的渲染器："' + cfg.renderer + '"');
              continue;
            }
            try {
              render(cfg);
            } catch (err) {
              // 某一行出错不影响其它行
              console.error('[demo] 渲染 "' + cfg.name + '" 失败：' + err.message);
            }
          }

          console.log('[demo] 已渲染 ' + list.length + ' 项');
        }
      );
    }
  );

  if (env.onReady) env.onReady();
}

// 构造表格：只有这里需要改画面内容
function buildTable(w, h, am) {
  // 按「目标高度」反算 scale，素材尺寸未知时退回 1
  const scaleFor = (name, targetH) => {
    if (!am) return 1;
    try {
      return (targetH / am.size(name).h).toFixed(3);
    } catch (err) {
      console.error('[demo] 取动画尺寸失败：' + err.message);
      return 1;
    }
  };
 
  return [
    'renderer name x y scale gap margin right bottom',

    // 背景：整屏平铺一张图
    `image src/assets/mapBg/mb1.jpg 0 0 0.25 n n ${w} ${h}`,

    // 图集小图：序号 30，放在左上角
    `sprite 30 ${w * 0.1} ${h * 0.1} ${(h / 298) * 0.1}`,

    // 精灵动画 1：nf1，放在左侧
    `anim nf1 ${w * 0.2} ${h * 0.2} ${scaleFor('nf1', h * 0.12)}`,

    // 精灵动画 2：nf2，放在右侧
    `anim nf2 ${w * 0.6} ${h * 0.2} ${scaleFor('nf2', h * 0.12)}`,
  ];
}

// 等所有任务完成后再执行（任务 = 一个接收 next 回调的函数）
function whenReady(tasks, onReady) {
  let left = tasks.length;
  if (left === 0) {
    onReady();
    return;
  }
  const tick = () => {
    left -= 1;
    if (left === 0) onReady();
  };
  for (const task of tasks) task(tick);
}

module.exports = { start };
