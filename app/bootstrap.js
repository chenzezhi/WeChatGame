/**
 * 应用启动流程（大模块：app）
 *
 * 只负责「装配」：把 platform / core / state / features 拼起来，
 * 不写任何具体玩法逻辑。
 *
 * 关键改动：
 *   1. 画布由 game.js 创建并传进来，这里绝不再调 wx.createCanvas()；
 *   2. 主循环等「地板贴图加载完」再启动，避免加载画面被立刻擦掉；
 *   3. 无论如何 8 秒后强制进游戏，绝不无限卡在加载画面。
 */
'use strict';

var platform = require('../platform/index.js');
var createAppStore = require('../state/index.js').createAppStore;
var createRenderer = require('../core/render/renderer.js');
var createGameLoop = require('../core/loop/game-loop.js');
var createAssetManager = require('../core/assets/asset-manager.js');
var createTouchManager = require('../core/input/touch-manager.js');
var viewportActions = require('../state/modules/viewport/actions.js');
var floorFeature = require('../features/floor/index.js');
var createFloorConfig = require('../features/floor/config/floor-config.js');

var LOOP_START_TIMEOUT = 8000;

function start(options) {
  options = options || {};

  var config = options.config || {};
  var screen = options.screen || null;

  function report(text, ratio) {
    console.log('[boot] ' + text);
    if (screen) screen.setStatus(text, ratio);
  }

  function warn(text) {
    console.warn('[boot] ' + text);
    if (screen) screen.push(text, 'error');
  }

  // ---------------------------------------------------------- 1. 视口与渲染器
  report('创建画布与渲染器…', 0.15);

  var viewport = platform.system.getViewportSize();

  // 优先用 game.js 传进来的上屏画布
  var canvas = options.canvas || platform.render.createCanvas();
  var renderer = createRenderer(canvas, viewport);

  // ---------------------------------------------------------- 2. 状态仓库
  report('初始化状态仓库…', 0.3);
  var store = createAppStore(viewport);

  // ---------------------------------------------------------- 3. 资源与输入
  report('初始化资源与输入…', 0.4);
  var assets = createAssetManager();
  var touch = createTouchManager();

  // ---------------------------------------------------------- 4. 地板模块
  report('准备地板模块…', 0.5);
  var floor = floorFeature.create({
    store: store,
    assets: assets,
    renderer: renderer,
    config: createFloorConfig(config.floor),
    report: report
  });

  // ---------------------------------------------------------- 5. 主循环（暂不启动）
  var loop = createGameLoop({
    update: function (dt) { floor.update(dt); },
    render: function (dt) { floor.render(dt); }
  });

  // ---------------------------------------------------------- 6. 交接
  var started = false;

  function startLoop(reason) {
    if (started) return;
    started = true;
    report('进入游戏（' + reason + '）', 1);
    loop.start();
  }

  report('加载地板贴图…', 0.6);

  floor.init().then(function (info) {
    if (info && info.count) {
      startLoop('贴图 ' + info.columns + 'x' + info.rows + ' = ' + info.count + ' 块');
    } else {
      startLoop('纯色兜底');
    }
  })['catch'](function (err) {
    warn('[警告] 地板贴图加载失败，改用纯色：' + ((err && err.message) || err));
    startLoop('纯色兜底');
  });

  // 兜底：绝不能因为一张图卡死在加载画面
  setTimeout(function () {
    if (!started) startLoop('超时兜底');
  }, LOOP_START_TIMEOUT);

  // ---------------------------------------------------------- 7. 屏幕旋转
  platform.system.onResize(function (size) {
    viewportActions.setViewport(store, size);
    renderer.resize(size);
    floor.relayout();
  });

  console.log('[app] 装配完成 ' + viewport.width + 'x' + viewport.height + ' @' + viewport.dpr + 'x');

  return {
    store: store,
    renderer: renderer,
    assets: assets,
    floor: floor,
    loop: loop,
    touch: touch,
    stop: function () {
      loop.stop();
      touch.destroy();
    }
  };
}

module.exports = { start: start };
