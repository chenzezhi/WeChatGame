/**
 * 应用启动流程（大模块：app）
 *
 * 只负责「装配」：把 platform / core / state / features 拼起来，
 * 不写任何具体玩法逻辑。
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

function start(options) {
  options = options || {};
  var config = options.config || {};
  var viewport = platform.system.getViewportSize();

  // 1. 渲染器（内部持有上屏画布）
  var renderer = createRenderer(options.canvas || platform.render.createCanvas(), viewport);

  // 2. 全局状态仓库
  var store = createAppStore(viewport, config);

  // 3. 资源管理器 / 输入管理器
  var assets = createAssetManager();
  var touch = createTouchManager();

  // 4. 业务模块：地板
  var floor = floorFeature.create({
    store: store,
    assets: assets,
    renderer: renderer,
    config: createFloorConfig(config.floor)
  });

  // 5. 主循环
  var loop = createGameLoop({
    update: function (dt) { floor.update(dt); },
    render: function (dt) { floor.render(dt); }
  });

  floor.init();
  loop.start();

  // 6. 窗口尺寸变化
  platform.system.onResize(function (size) {
    viewportActions.setViewport(store, size);
    renderer.resize(size);
    floor.relayout();
  });

  console.log('[app] 运行中 ' + viewport.width + 'x' + viewport.height + ' @' + viewport.dpr + 'x');

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
