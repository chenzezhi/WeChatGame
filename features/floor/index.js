/**
 * 地板系统（features/floor）—— 业务编排层
 *
 * 流程：加载大图 → 注册图集 → 算布局 → 写入状态 → 每帧按状态绘制
 * init() 返回 Promise，方便启动流程知道「贴图到底好没好」，
 * 失败也会先退回纯色地板，保证能进游戏。
 */
'use strict';

var floorActions = require('../../state/modules/floor/actions.js');
var floorSelectors = require('../../state/modules/floor/selectors.js');
var assetsActions = require('../../state/modules/assets/actions.js');
var layout = require('./layout/floor-layout.js');
var createFloorRenderer = require('./render/floor-renderer.js');

// ⚠️ floor-config.js 导出的是 { create, DEFAULTS }，不是函数
var floorConfigModule = require('./config/floor-config.js');

var ATLAS_KEY = 'floor-atlas';

function createFloorSystem(ctx) {
  var store = ctx.store;
  var assets = ctx.assets;
  var renderer = ctx.renderer;
  var config = ctx.config || floorConfigModule.create();
  var report = ctx.report || function () {};
  var painter = createFloorRenderer(renderer);
  var atlas = null;

  function getViewport() {
    return store.getState().viewport;
  }

  /** 重新计算地板大小与每格贴图，并写入状态 */
  function relayout() {
    var view = getViewport();
    var grid = layout.computeGrid(view, config, atlas);
    var map = layout.createMap({
      columns: grid.columns,
      rows: grid.rows,
      pattern: config.pattern,
      pool: config.tilePool,
      seed: config.seed,
      atlas: atlas
    });

    var boardWidth = grid.columns * grid.tileWidth;
    var scale = boardWidth > 0 ? view.width / boardWidth : 1;

    floorActions.applyLayout(store, {
      columns: grid.columns,
      rows: grid.rows,
      tileWidth: grid.tileWidth,
      tileHeight: grid.tileHeight,
      originX: config.originX,
      originY: config.originY,
      scale: scale,
      map: map
    });
  }

  /** 加载贴图并布局，返回 Promise<{columns, rows, count, width, height}> */
  function init() {
    floorActions.setStatus(store, 'loading');
    assetsActions.setAtlasLoading(store, ATLAS_KEY);

    var image = config.tileset && config.tileset.image;
    if (!image) {
      var missing = new Error('图集描述里缺少 image 字段（assets/atlas/floor-tileset.js）');
      assetsActions.setAtlasError(store, missing.message);
      floorActions.setError(store, missing.message);
      relayout();
      return Promise.reject(missing);
    }

    report('加载贴图 ' + image, 0.65);

    return assets.loadImage(ATLAS_KEY, image, { timeout: config.loadTimeout || 8000 })
      .then(function (img) {
        atlas = assets.registerAtlas(ATLAS_KEY, config.tileset, img);
        assetsActions.setAtlasReady(store, ATLAS_KEY, img.width, img.height, atlas.count);
        relayout();

        console.log('[floor] 贴图就绪：' + img.width + 'x' + img.height +
          '，切出 ' + atlas.columns + 'x' + atlas.rows + ' = ' + atlas.count + ' 块');

        return {
          columns: atlas.columns,
          rows: atlas.rows,
          count: atlas.count,
          width: img.width,
          height: img.height
        };
      })
      ['catch'](function (err) {
        var msg = (err && err.message) || String(err);
        console.error('[floor] 贴图加载失败，改用纯色地板：' + msg);

        assetsActions.setAtlasError(store, msg);
        floorActions.setError(store, msg);
        relayout();

        throw err;
      });
  }

  function update(dt) {
    // 地板目前是静态的；后续滚动 / 动画在这里扩展（只改状态）
  }

  function render() {
    var floor = floorSelectors.getFloor(store);
    renderer.beginFrame();
    renderer.fillBackground(floor.background || config.background);
    painter.draw(floor, getViewport(), atlas || assets.getAtlas(ATLAS_KEY));
  }

  return {
    init: init,
    update: update,
    render: render,
    relayout: relayout,
    getAtlas: function () { return atlas; }
  };
}

module.exports = { create: createFloorSystem, ATLAS_KEY: ATLAS_KEY };
