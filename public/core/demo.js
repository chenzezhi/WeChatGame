'use strict';

/* ==================== 功能 ====================
 * 唯一 demo —— 所有静态渲染都走同一张表格
 *
 * 三种渲染器（image / sprite / anim）共用一套数据格式，
 * 表格第一个字段就是 renderer，指定用哪个渲染器。
 *
 * 会动的东西（人物）不走表格，由 player-view 单独挂到舞台上。
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
const Board = require('./board.js');
const BoardText = require('./board-text.js');
const Shop = require('./shop.js');
const PlayerView = require('./player-view.js');
const Battle = require('./battle.js');
const BattleView = require('./battle-view.js');
const Touch = require('./touch.js');
const Sound = require('./sound.js');
const assets = require('./asset-manager.js');
const TEMPLATE = require('../config/render.js').template;
const SHEET = require('../config/assets.js');
const BOARD = require('../config/board.js');
const PLAYER = require('../config/player.js');
const SHOP = require('../config/shop.js');
const COMBAT = require('../config/combat.js');

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
      /* ---------- 2. 棋盘 + 商店：读文本 / 配置 → 建对象 ---------- */
      const board = createBoard(w, h, sm);
      const shop = createShop(w, h, sm);

      /* ---------- 3. 表格：第 0 行是字段头，下面是数据 ---------- */
      const table = buildTable(w, h, am, board, shop);

      /* ---------- 4. 表格 → 完整配置数组 ---------- */
      const list = TableMapper.fill(TEMPLATE, table);

      /* ---------- 5. 预热图片（预热后 render 就是同步的，顺序可控）---------- */
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
          /* ---------- 6. 按表格顺序逐行渲染 ---------- */
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

          /* ---------- 7. 棋盘与商店：自己建对象，留着引用好缩放 / 隐藏 ---------- */
          if (board && board.render) board.render(stage, sm);
          if (shop && shop.render) shop.render(stage, sm);

          /* ---------- 8. 人物：会动的东西不走表格，单独挂 ---------- */
          const playerView = board
            ? PlayerView.create({ stage: stage, am: am, board: board, config: PLAYER })
            : null;

          /* ---------- 8. 战斗：武器 + 怪物 + 点击 ---------- */
          if (board) {
            let battle = null;
            try {
              battle = Battle.create({
                board: board,
                shop: shop,
                player: playerView ? playerView.player : null,
                width: w,
                height: h,
                config: COMBAT,
              });
            } catch (e) {
              console.error('[demo] 战斗创建失败：' + ((e && e.stack) || e));
            }

            let view = null;
            try {
              view = BattleView.create({
                stage: stage,
                sm: sm,
                board: board,
                shop: shop,
                battle: battle,
                config: COMBAT,
              });
            } catch (e) {
              console.error('[demo] 战斗视图创建失败：' + ((e && e.stack) || e));
            }

            // 点一下：按钮 / 槽位 / 格子；拖拽：把武器拖到格子上
            // 走路音效：人物每踏进一个格子播一次
            if (battle) {
              battle.onStep = function () {
                Sound.play(PLAYER.stepSound, PLAYER.stepVolume);
              };
            }

            if (view && battle) {
              Touch.bind({
                stage: stage,
                tap: view.handleTap,
                drag: view.handleDrag,
                drop: view.handleDrop,
              });
            }
          }
        }
      );
    }
  );

  if (env.onReady) env.onReady();
}

// 建立棋盘对象
// w, h - 画布物理像素尺寸
// sm - 图集连接器，用来取格子原图尺寸
// 返回 Board 对象，读不到棋盘时返回 null
function createBoard(w, h, sm) {
  // 1. 读文本文件，拿到所有棋盘
  let list;
  try {
    list = BoardText.load(BOARD.file);
  } catch (err) {
    console.error('[demo] 棋盘数据读取失败：' + err.message);
    return null;
  }

  // 2. 按配置选一块
  const data = BoardText.pick(list, BOARD.current);
  if (!data) {
    console.warn('[demo] 找不到棋盘：' + BOARD.current + '（文件里共 ' + list.length + ' 块）');
    return null;
  }

  // 3. 模板补全：具体棋盘只写和模板不一样的部分
  const cfg = Object.assign({}, BOARD.template, data);

  // 4. 取格子原图尺寸；取不到就让 Board 用 scale 1
  let frame = null;
  try {
    frame = sm.size(cfg.cellAsset);
  } catch (err) {
    console.warn('[demo] 取格子尺寸失败：' + err.message);
  }

  const board = new Board(cfg, { width: w, height: h, frame: frame });

  // 打印棋盘规模，排查时一眼看出读的是哪一块、生成了几个格子
  console.log(
    '[demo] 棋盘「' + data.name + '」' + board.colCount + 'x' + board.rowCount +
      '，格子 ' + board.cells.length + ' 个'
  );

  return board;
}

// 建立商店对象
// w, h - 画布物理像素尺寸
// sm - 图集连接器，用来取两种素材的原始尺寸
// 返回 Shop 对象
function createShop(w, h, sm) {
  const cfg = Object.assign({}, SHOP.template);

  // 取外壳与槽位的原始尺寸，取不到就让 Shop 用 scale 1
  let shellFrame = null;
  let slotFrame = null;
  try {
    shellFrame = sm.size(cfg.shellAsset);
  } catch (err) {
    console.warn('[demo] 取外壳尺寸失败：' + err.message);
  }
  try {
    slotFrame = sm.size(cfg.slotAsset);
  } catch (err) {
    console.warn('[demo] 取槽位尺寸失败：' + err.message);
  }

  const shop = new Shop(cfg, { width: w, height: h, shellFrame: shellFrame, slotFrame: slotFrame });

  // 打印商店规模，排查时一眼看出外壳位置和槽位数量
  console.log(
    '[demo] 商店：外壳 ' + Math.round(shop.shell.w) + 'x' + Math.round(shop.shell.h) +
      '，y=' + Math.round(shop.shell.y) + '，槽位 ' + shop.slots.length + ' 个'
  );

  return shop;
}

// 构造表格：只有这里需要改画面内容
// w, h - 画布物理像素尺寸
// am - 动画连接器，用来取动画尺寸算 scale
// board - 棋盘对象，为 null 时不出格子
// shop - 商店对象，为 null 时不出商店
function buildTable(w, h, am, board, shop) {
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

    // 棋盘和商店**不走表格**：它们需要能缩小、能隐藏，
    // 所以由 board.render / shop.render 自己建对象并留着引用

    // 精灵动画 1：nf1，放在左侧
    // `anim nf1 ${w * 0.2} ${h * 0.2} ${scaleFor('nf1', h * 0.12)}`,

    // 精灵动画 2：nf2，放在右侧
    // `anim nf2 ${w * 0.6} ${h * 0.2} ${scaleFor('nf2', h * 0.12)}`,
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
