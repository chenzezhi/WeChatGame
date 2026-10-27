/**
 * 地板布局（features/floor/layout）
 * 纯函数：输入屏幕尺寸 + 配置 + 图集，输出格子数、缩放、每格位置。
 * 不碰渲染、不碰状态。
 *
 * 三种布局：
 *   'grid'       正方形平铺
 *   'staggered'  菱形交错（每行错开 staggerX 格宽，纵向前进 staggerY 格高）
 *   'iso'        等距投影（col-row, col+row）
 */
'use strict';

/** 可复现的伪随机（xorshift32） */
function createRng(seed) {
  var s = (seed || 1) >>> 0;
  if (s === 0) s = 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* ============================================================
 * 格子位置（不含布局原点偏移）
 * ============================================================ */
/**
 * @param {String} layout   'grid' | 'staggered' | 'iso'
 * @param {Number} col
 * @param {Number} row
 * @param {Number} tileW    单块显示宽
 * @param {Number} tileH    单块显示高
 * @param {Number} staggerX 横向错开比例（默认 0.5）
 * @param {Number} staggerY 纵向前进比例（默认 0.5）
 */
function getTilePosition(layout, col, row, tileW, tileH, staggerX, staggerY) {
  var sx = typeof staggerX === 'number' ? staggerX : 0.5;
  var sy = typeof staggerY === 'number' ? staggerY : 0.5;

  if (layout === 'staggered') {
    return {
      x: col * tileW + (row % 2) * tileW * sx,
      y: row * tileH * sy
    };
  }

  if (layout === 'iso') {
    return {
      x: (col - row) * tileW * 0.5,
      y: (col + row) * tileH * 0.5
    };
  }

  return { x: col * tileW, y: row * tileH };
}

/** 布局原点偏移（iso 需要整体右移，避免格子跑到屏幕外） */
function getLayoutOrigin(layout, tileW, tileH, rows) {
  if (layout === 'iso') {
    return { x: Math.max(0, rows - 1) * tileW * 0.5, y: 0 };
  }
  return { x: 0, y: 0 };
}

/**
 * 整体内容尺寸（像素，已含 scale）
 *
 *   grid      C×W, R×H
 *   staggered C×W + (R>1 ? W×staggerX : 0),  (R−1)×H×staggerY + H
 *   iso       (C+R)×W/2, (C+R)×H/2
 */
function computeContentSize(grid, layout, staggerX, staggerY) {
  layout = layout || 'grid';
  var sx = typeof staggerX === 'number' ? staggerX : 0.5;
  var sy = typeof staggerY === 'number' ? staggerY : 0.5;

  var W = grid.tileWidth * grid.scale;
  var H = grid.tileHeight * grid.scale;
  var C = grid.columns || 0;
  var R = grid.rows || 0;

  if (C <= 0 || R <= 0) return { width: 0, height: 0 };

  if (layout === 'staggered') {
    return {
      width: C * W + (R > 1 ? W * sx : 0),
      height: (R - 1) * H * sy + H
    };
  }

  if (layout === 'iso') {
    return {
      width: (C + R) * W * 0.5,
      height: (C + R) * H * 0.5
    };
  }

  return { width: C * W, height: R * H };
}

/* ============================================================
 * 格子数 / 缩放
 * ============================================================ */
function computeGrid(viewport, config, atlas, sizeOverride) {
  config = config || {};
  var grid = config.grid || {};
  viewport = viewport || { width: 375, height: 667 };

  var tileWidth = config.tileWidth || (atlas && atlas.tileWidth) || 32;
  var tileHeight = config.tileHeight || (atlas && atlas.tileHeight) || 32;
  var displaySize = config.tileDisplaySize > 0 ? config.tileDisplaySize : 0;

  var overrideColumns = (sizeOverride && sizeOverride.columns > 0) ? Math.floor(sizeOverride.columns) : 0;
  var overrideRows = (sizeOverride && sizeOverride.rows > 0) ? Math.floor(sizeOverride.rows) : 0;

  var wantedColumns = overrideColumns || (grid.columns > 0 ? Math.floor(grid.columns) : 0);
  var wantedRows = overrideRows || (grid.rows > 0 ? Math.floor(grid.rows) : 0);

  var scale;
  if (displaySize > 0) {
    scale = displaySize / tileWidth;
  } else if (wantedColumns > 0 || wantedRows > 0) {
    scale = 1;
  } else {
    var autoColumns = Math.max(1, Math.ceil(viewport.width / tileWidth));
    scale = autoColumns * tileWidth > 0 ? viewport.width / (autoColumns * tileWidth) : 1;
  }

  var displayTileW = tileWidth * scale;
  var displayTileH = tileHeight * scale;

  var columns = wantedColumns > 0
    ? wantedColumns
    : Math.max(1, Math.ceil(viewport.width / displayTileW));

  var rows = wantedRows > 0
    ? wantedRows
    : Math.max(1, Math.ceil(viewport.height / displayTileH));

  return {
    columns: columns,
    rows: rows,
    tileWidth: tileWidth,
    tileHeight: tileHeight,
    scale: scale,
    displayTileWidth: displayTileW,
    displayTileHeight: displayTileH
  };
}

/* ============================================================
 * 生成 map
 * ============================================================ */
function createMap(options) {
  options = options || {};

  var columns = options.columns || 0;
  var rows = options.rows || 0;
  var pool = (options.pool && options.pool.length) ? options.pool.slice() : [0];
  var pattern = options.pattern || 'random';
  var limit = (options.atlas && options.atlas.count) || 0;
  var rnd = createRng(options.seed);
  var cursor = 0;

  function safe(i) {
    if (typeof i !== 'number' || isNaN(i)) i = 0;
    if (limit > 0) return ((i % limit) + limit) % limit;
    return Math.max(0, Math.floor(i));
  }

  function pick(col, row) {
    if (pattern === 'single') return safe(pool[0]);
    if (pattern === 'checker') return safe(pool[(col + row) % pool.length]);
    if (pattern === 'sequence') {
      var value = safe(pool[cursor % pool.length]);
      cursor++;
      return value;
    }
    return safe(pool[Math.floor(rnd() * pool.length)]);
  }

  var map = [];
  for (var row = 0; row < rows; row++) {
    var line = [];
    for (var col = 0; col < columns; col++) {
      line.push(pick(col, row));
    }
    map.push(line);
  }
  return map;
}

module.exports = {
  createRng: createRng,
  getTilePosition: getTilePosition,
  getLayoutOrigin: getLayoutOrigin,
  computeContentSize: computeContentSize,
  computeGrid: computeGrid,
  createMap: createMap
};
