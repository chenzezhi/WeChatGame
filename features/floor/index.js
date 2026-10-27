/**
 * 地板系统（features/floor）—— 业务编排层
 *
 * 流程：加载大图 → 注册图集 → 算布局 → 写入状态 → 每帧按状态绘制
 * 任何一步失败都会退回纯色地板，不会白屏。
 */
'use strict';

var floorActions = require('../../state/modules/floor/actions.js');
var floorSelectors = require('../../state/modules/floor/selectors.js');
var assetsActions = require('../../state/modules/assets/actions.js');
var layout = require('./layout/floor-layout.js');
var createFloorRenderer = require('./render/floor-renderer.js');
var createFloorConfig = require('./config/floor-config.js');

var ATLAS_KEY = 'floor-atlas';

function createFloorSystem(ctx) {
  var store = ctx.store;
  var assets = ctx.assets;
  var renderer = ctx.renderer;
  var config = ctx.config || createFloorConfig();
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

    floorActions.applyLayout(store, {
      columns: grid.columns,
      rows: grid.rows,
      tileWidth: grid.tileWidth,
      tileHeight: grid.tileHeight,
      originX: config.originX,
      originY: config.originY,
      scale: grid.columns * grid.tileWidth > 0 ? view.width / (grid.columns * grid.tileWidth) : 1,
      map: map
    });
  }

  function init() {
    floorActions.setStatus(store, 'loading');
    assetsActions.setAtlasLoading(store, ATLAS_KEY);

    assets.loadImage(ATLAS_KEY, config.tileset.image)
      .then(function (image) {
        atlas = assets.registerAtlas(ATLAS_KEY, config.tileset, image);
        assetsActions.setAtlasReady(store, ATLAS_KEY, image.width, image.height, atlas.count);
        relayout();
        console.log('[floor] 贴图就绪：' + image.width + 'x' + image.height +
          '，切出 ' + atlas.columns + 'x' + atlas.rows + ' = ' + atlas.count + ' 块');
      })
      ['catch'](function (err) {
        var msg = (err && err.message) || String(err);
        console.error('[floor] 贴图加载失败，改用纯色地板：' + msg);
        assetsActions.setAtlasError(store, msg);
        floorActions.setError(store, msg);
        relayout();
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
