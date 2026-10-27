/**
 * 地板系统（features/floor）—— 业务编排层
 *
 * 关键原则：
 *   · 贴图原样使用，**绝不做任何裁剪/遮罩/变形**
 *   · 地图整体形状（rect/diamond）只决定「画不画某格」
 *   · 背景先铺（纯色或背景图），菱形缺口自然露出背景
 *
 * 地图数据三条路（优先级从高到低）：
 *   1. mapFile   纯文本地图（assets/maps/*.txt）
 *   2. mapName   JS 地图（assets/maps/index.js 注册）
 *   3. pattern   按 tilePool 随机生成
 *
 * 状态统一走 state/actions.js 与 state/selectors.js。
 *
 * ⚠️ 导出约定：以下都是「对象」，必须 .create(...) / .parse(...) 调用
 *   ./config/floor-config.js   →  { create, DEFAULTS }
 *   ./render/floor-renderer.js →  { create, isInsideShape }
 *   ./scroll/floor-scroll.js   →  { create }
 *   ./data/map-data.js         →  { resolve, normalize, fit, toIndex }
 *   ./data/map-text.js         →  { load, clearCache, parse, loadAndParse }
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
var BG_KEY = 'floor-background';

function createFloorSystem(ctx) {
  var store = ctx.store;
  var assets = ctx.assets;
  var renderer = ctx.renderer;
  var config = ctx.config || floorConfigModule.create();
  var report = ctx.report || function () {};
  var painter = floorRendererModule.create(renderer);
  var scroll = null;
  var atlas = null;
  var backgroundImage = null;
  var activeMap = null;

  var layoutMode = config.layout || 'grid';
  var mapShape = config.mapShape || 'rect';
  var shapeTolerance = typeof config.shapeTolerance === 'number' ? config.shapeTolerance : 0;
  var staggerX = (config.stagger && typeof config.stagger.x === 'number') ? config.stagger.x : 0.5;
  var staggerY = (config.stagger && typeof config.stagger.y === 'number') ? config.stagger.y : 0.5;

  function getViewport() {
    return stateSelectors.getViewport(store);
  }

  function warnToScreen(text) {
    console.error('[floor] ' + text);
    if (ctx.screen && ctx.screen.push) ctx.screen.push(text, 'error');
  }

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

  function loadMapData() {
    if (config.mapFile) {
      var result = mapTextModule.loadAndParse(config.mapFile, atlas);
      if (result.ok) {
        console.log('[floor] 已读取地图文件 ' + config.mapFile +
          '（' + result.data.columns + 'x' + result.data.rows + '）');
        return result.data;
      }
      warnToScreen('地图文件读取失败：' + config.mapFile + ' —— ' + result.error + '，已退回自动生成');
    }

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

    return null;
  }

  function relayout() {
    var view = getViewport();

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

    var content = layout.computeContentSize(grid, layoutMode, staggerX, staggerY);

    stateActions.applyLayout(store, {
      columns: grid.columns,
      rows: grid.rows,
      tileWidth: grid.tileWidth,
      tileHeight: grid.tileHeight,
      scale: grid.scale,
      layout: layoutMode,
      staggerX: staggerX,
      staggerY: staggerY,
      mapShape: mapShape,
      map: map,
      mapSource: activeMap ? 'file' : 'generated',
      mapName: activeMap ? activeMap.name : null,
      contentWidth: content.width,
      contentHeight: content.height,
      viewportWidth: view.width,
      viewportHeight: view.height
    });
  }

  /** 加载背景图（可选，失败不影响） */
  function loadBackground() {
    if (!config.backgroundImage) {
      return Promise.resolve(null);
    }

    return assets.loadImage(BG_KEY, config.backgroundImage, { timeout: config.loadTimeout || 8000 })
      .then(function (img) {
        backgroundImage = img;
        stateActions.setBackgroundReady(store, img.width, img.height);
        console.log('[floor] 背景图就绪：' + img.width + 'x' + img.height);
        return img;
      })
      ['catch'](function (err) {
        var msg = (err && err.message) || String(err);
        stateActions.setBackgroundError(store, msg);
        console.warn('[floor] 背景图加载失败（用纯色代替）：' + msg);
        return null;
      });
  }

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

        // 贴图原样使用，不做任何遮罩/变形
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

        var visible = layout.countVisibleTiles(mapShape, floorState.columns, floorState.rows, shapeTolerance);

        console.log('[floor] 贴图就绪：' + img.width + 'x' + img.height +
          '，切出 ' + atlas.columns + 'x' + atlas.rows + ' = ' + atlas.count + ' 块' +
          '，布局 ' + layoutMode + '(' + staggerX + ',' + staggerY + ')' +
          '，形状 ' + mapShape + (mapShape === 'diamond' ? '（可见 ' + visible + ' 格）' : '') +
          '，' + source);

        // 背景图与地板并行加载，不阻塞
        loadBackground();

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

  /** 背景图按 cover 方式铺满屏幕 */
  function drawBackground(view) {
    if (!backgroundImage) return;

    var iw = backgroundImage.width;
    var ih = backgroundImage.height;
    if (!iw || !ih) return;

    var vw = view.width;
    var vh = view.height;
    var s = Math.max(vw / iw, vh / ih);
    var dw = iw * s;
    var dh = ih * s;
    var dx = (vw - dw) / 2;
    var dy = (vh - dh) / 2;

    renderer.drawTile(backgroundImage, { sx: 0, sy: 0, sw: iw, sh: ih }, dx, dy, dw, dh);
  }

  function render() {
    var floor = stateSelectors.getFloor(store);
    var view = getViewport();

    renderer.beginFrame();

    // ① 背景：有背景图就铺图，否则纯色
    if (backgroundImage) {
      renderer.fillBackground(floor.background || config.background);
      drawBackground(view);
    } else {
      renderer.fillBackground(floor.background || config.background);
    }

    // ② 地板：原样贴图，菱形外的格子跳过
    painter.draw(floor, view, atlas || assets.getAtlas(ATLAS_KEY), {
      shapeTolerance: shapeTolerance
    });
  }

  function reloadMap() {
    if (config.mapFile) mapTextModule.clearCache(config.mapFile);
    relayout();
  }

  /** 运行时切换布局 */
  function setLayoutMode(mode) {
    layoutMode = mode || 'grid';
    config.layout = layoutMode;
    relayout();
  }

  /** 运行时调整交错比例（调菱形对齐最常用） */
  function setStagger(sx, sy) {
    if (typeof sx === 'number') staggerX = sx;
    if (typeof sy === 'number') staggerY = sy;
    config.stagger = { x: staggerX, y: staggerY };
    relayout();
  }

  /** 运行时切换地图形状：'rect' | 'diamond' */
  function setMapShape(shape) {
    mapShape = shape || 'rect';
    config.mapShape = mapShape;
    relayout();
  }

  /** 运行时调整菱形容差（0 = 标准菱形，越大越胖） */
  function setShapeTolerance(value) {
    shapeTolerance = typeof value === 'number' ? value : 0;
    config.shapeTolerance = shapeTolerance;
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
    setStagger: setStagger,
    setMapShape: setMapShape,
    setShapeTolerance: setShapeTolerance,
    getAtlas: function () { return atlas; },
    getScroll: function () { return scroll; },
    getMap: function () { return activeMap; }
  };
}

module.exports = { create: createFloorSystem, ATLAS_KEY: ATLAS_KEY };
