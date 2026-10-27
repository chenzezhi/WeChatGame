/**
 * 地板系统（features/floor）—— 业务编排层
 *
 * 地图数据有三条路，优先级从高到低：
 *   1. mapFile   纯文本地图（assets/maps/*.txt），运行时读进内存解析 ← 推荐
 *   2. mapName   JS 地图（assets/maps/index.js 注册）
 *   3. pattern   按 tilePool 随机生成
 *
 * 布局模式由 config.layout 决定（'grid' / 'staggered' / 'iso'）。
 *
 * 流程图：加载大图 → 注册图集 → 取地图数据 → 算布局 → 写入状态 → 每帧绘制
 *
 * 状态统一走 state/actions.js 与 state/selectors.js。
 *
 * ⚠️ 导出约定（踩过坑，务必看清）：
 *   ./config/floor-config.js   →  { create, DEFAULTS }
 *   ./render/floor-renderer.js →  { create }
 *   ./scroll/floor-scroll.js   →  { create }
 *   ./layout/floor-layout.js   →  { createRng, getTilePosition, getLayoutOrigin, computeContentSize, computeGrid, createMap }
 *   ./data/map-data.js         →  { EMPTY, resolve, normalize, fit, toIndex }
 *   ./data/map-text.js         →  { EMPTY, load, clearCache, parse, loadAndParse }
 *   以上都是「对象」，不是函数，必须 .create(...) / .parse(...) 调用。
 */
'use strict';

var stateActions = require('../../state/actions.js');
var stateSelectors = require('../../state/selectors.js');
var layout = require('./layout/floor-layout.js');

var floorConfigModule = require('./config/floor-config.js');
var floorRendererModule = require('./render/floor-renderer.js');
var floorScrollModule = require('./scroll/floor-scroll.js');
var mapDataModule = require('./data/map-data.js');
var mapTextModule = require('./data/map-text.js');

var ATLAS_KEY = 'floor-atlas';

function createFloorSystem(ctx) {
  var store = ctx.store;
  var assets = ctx.assets;
  var renderer = ctx.renderer;
  var config = ctx.config || floorConfigModule.create();
  var report = ctx.report || function () {};
  var painter = floorRendererModule.create(renderer);
  var scroll = null;
  var atlas = null;
  var activeMap = null;   // 归一化后的地图数据（null = 走随机生成）

  // 当前布局模式（取 config.layout，缺省 'grid'）
  var layoutMode = config.layout || 'grid';

  function getViewport() {
    return stateSelectors.getViewport(store);
  }

  function warnToScreen(text) {
    console.error('[floor] ' + text);
    if (ctx.screen && ctx.screen.push) ctx.screen.push(text, 'error');
  }

  /** 把配置里的地板池转成索引数组 */
  function resolvePool() {
    var pool = [];

    if (atlas && atlas.normalizePool) {
      pool = atlas.normalizePool(config.tilePool);
    } else if (config.tilePool instanceof Array) {
      for (var i = 0; i < config.tilePool.length; i++) {
        if (typeof config.tilePool[i] === 'number') pool.push(config.tilePool[i]);
      }
    }

    if (!pool.length) pool = [0];
    return pool;
  }

  /**
   * 取地图数据，返回归一化结果或 null
   * 顺序：文本地图 → JS 地图 → null（随机生成）
   */
  function loadMapData() {
    // ---------- ① 纯文本地图 ----------
    if (config.mapFile) {
      var result = mapTextModule.loadAndParse(config.mapFile, atlas);
      if (result.ok) {
        console.log('[floor] 已读取地图文件 ' + config.mapFile +
          '（' + result.data.columns + 'x' + result.data.rows + '）');
        return result.data;
      }
      warnToScreen('地图文件读取失败：' + config.mapFile + ' —— ' + result.error + '，已退回自动生成');
    }

    // ---------- ② JS 地图 ----------
    if (config.mapName) {
      var registry = config.maps || floorConfigModule.DEFAULTS.maps;
      var raw = mapDataModule.resolve(config.mapName, registry);

      if (!raw) {
        warnToScreen('找不到地图 ' + config.mapName + '，已退回自动生成');
        return null;
      }

      var normalized = mapDataModule.normalize(raw, atlas);
      if (!normalized) {
        warnToScreen('地图数据为空或格式不对：' + config.mapName);
        return null;
      }
      return normalized;
    }

    // ---------- ③ 随机生成 ----------
    return null;
  }

  /** 重新计算地板大小、每格贴图、滚动范围，并写入状态 */
  function relayout() {
    var view = getViewport();

    // 地图的尺寸优先；没有地图就按 grid / 屏幕推算
    activeMap = loadMapData();

    var sizeOverride = activeMap
      ? { columns: activeMap.columns, rows: activeMap.rows }
      : null;

    var grid = layout.computeGrid(view, config, atlas, sizeOverride);

    var map;
    if (activeMap) {
      map = mapDataModule.fit(activeMap.map, grid.columns, grid.rows);
    } else {
      map = layout.createMap({
        columns: grid.columns,
        rows: grid.rows,
        pattern: config.pattern,
        pool: resolvePool(),
        seed: config.seed,
        atlas: atlas
      });
    }

    // 内容尺寸按布局模式计算
    var content = layout.computeContentSize(grid, layoutMode);

    stateActions.applyLayout(store, {
      columns: grid.columns,
      rows: grid.rows,
      tileWidth: grid.tileWidth,
      tileHeight: grid.tileHeight,
      scale: grid.scale,
      layout: layoutMode,
      map: map,
      mapSource: activeMap ? 'file' : 'generated',
      mapName: activeMap ? activeMap.name : null,
      contentWidth: content.width,
      contentHeight: content.height,
      viewportWidth: view.width,
      viewportHeight: view.height
    });
  }

  /** 加载贴图并布局，返回 Promise<{columns, rows, count, width, height}> */
  function init() {
    stateActions.setFloorStatus(store, 'loading');
    stateActions.setAtlasLoading(store, ATLAS_KEY);

    var image = config.tileset && config.tileset.image;
    if (!image) {
      var missing = new Error('图集描述里缺少 image 字段（assets/atlas/floor-tileset.js）');
      stateActions.setAtlasError(store, missing.message);
      stateActions.setFloorError(store, missing.message);
      relayout();
      return Promise.reject(missing);
    }

    report('加载贴图 ' + image, 0.65);

    return assets.loadImage(ATLAS_KEY, image, { timeout: config.loadTimeout || 8000 })
      .then(function (img) {
        atlas = assets.registerAtlas(ATLAS_KEY, config.tileset, img);
        stateActions.setAtlasReady(store, ATLAS_KEY, img.width, img.height, atlas.count);
        relayout();

        var floorState = stateSelectors.getFloor(store);
        var source;
        if (floorState.mapSource === 'file') {
          source = '地图 ' + floorState.mapName + '（' + floorState.columns + 'x' + floorState.rows + '）';
        } else {
          var pool = resolvePool();
          source = '自动生成，地板池 ' + pool.length + ' 块 [' + pool.join(',') + ']';
        }

        console.log('[floor] 贴图就绪：' + img.width + 'x' + img.height +
          '，切出 ' + atlas.columns + 'x' + atlas.rows + ' = ' + atlas.count + ' 块' +
          '，布局 ' + layoutMode +
          '，' + source);

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

        stateActions.setAtlasError(store, msg);
        stateActions.setFloorError(store, msg);
        relayout();

        throw err;
      });
  }

  /** 建立滑动控制器（需要 touch 管理器；没有就退化成一个空壳） */
  function createScroll() {
    try {
      scroll = floorScrollModule.create({
        store: store,
        touch: ctx.touch || null,
        config: config.scroll
      });
    } catch (e) {
      console.error('[floor] 滑动模块初始化失败：' + ((e && e.message) || e));
      scroll = null;
    }
  }

  function update(dt) {
    if (scroll) scroll.update(dt);
  }

  function render() {
    var floor = stateSelectors.getFloor(store);
    renderer.beginFrame();
    renderer.fillBackground(floor.background || config.background);
    painter.draw(floor, getViewport(), atlas || assets.getAtlas(ATLAS_KEY));
  }

  /** 重新读取地图文件并重排（改完地图想热重载时调这个） */
  function reloadMap() {
    if (config.mapFile) mapTextModule.clearCache(config.mapFile);
    relayout();
  }

  /** 运行时切换布局（例如从 grid 切到 staggered） */
  function setLayoutMode(mode) {
    layoutMode = mode || 'grid';
    config.layout = layoutMode;
    relayout();
  }

  createScroll();

  return {
    init: init,
    update: update,
    render: render,
    relayout: relayout,
    reloadMap: reloadMap,
    setLayoutMode: setLayoutMode,
    getAtlas: function () { return atlas; },
    getScroll: function () { return scroll; },
    getMap: function () { return activeMap; }
  };
}

module.exports = { create: createFloorSystem, ATLAS_KEY: ATLAS_KEY };
