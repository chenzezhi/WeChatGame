/**
 * 地板布局（features/floor/layout）
 * 纯函数：输入屏幕尺寸 + 配置 + 图集，输出格子数、缩放、每格索引。
 * 不碰渲染、不碰状态。
 */
'use strict';

/** 可复现的伪随机（xorshift32），保证地板每次进入都一样 */
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

/**
 * 计算格子数、单块原始尺寸、渲染缩放。
 *
 * 优先顺序：
 *   格子数    sizeOverride（地图文件给的）> grid.columns/rows > 按屏幕推算
 *   单块缩放  tileDisplaySize > 0 就用它，否则按「铺满屏幕宽度」推算
 *
 * @param {Object} viewport     { width, height, dpr }
 * @param {Object} config       floor-config
 * @param {Object} atlas        图集，可为 null
 * @param {Object} sizeOverride { columns, rows } 可选，地图文件尺寸
 */
function computeGrid(viewport, config, atlas, sizeOverride) {
  config = config || {};
  var grid = config.grid || {};

  var tileWidth = config.tileWidth || (atlas && atlas.tileWidth) || 32;
  var tileHeight = config.tileHeight || (atlas && atlas.tileHeight) || 32;
  var displaySize = config.tileDisplaySize > 0 ? config.tileDisplaySize : 0;

  var overrideColumns = (sizeOverride && sizeOverride.columns > 0) ? Math.floor(sizeOverride.columns) : 0;
  var overrideRows = (sizeOverride && sizeOverride.rows > 0) ? Math.floor(sizeOverride.rows) : 0;

  var wantedColumns = overrideColumns || (grid.columns > 0 ? Math.floor(grid.columns) : 0);
  var wantedRows = overrideRows || (grid.rows > 0 ? Math.floor(grid.rows) : 0);

  // 1. 先定每块显示多大（scale）
  var scale;
  if (displaySize > 0) {
    scale = displaySize / tileWidth;
  } else {
    var refColumns = wantedColumns > 0 ? wantedColumns : Math.max(1, Math.ceil(viewport.width / tileWidth));
    scale = refColumns * tileWidth > 0 ? viewport.width / (refColumns * tileWidth) : 1;
  }

  // 2. 再定格子数
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

/**
 * 生成 map[row][col] = 图集索引（靠 pattern + pool 生成，不用地图文件时走这里）
 *
 * options:
 *   columns, rows   格子数
 *   pool            索引数组（已归一化）
 *   pattern         'random' | 'sequence' | 'checker' | 'single'
 *   seed            随机种子
 *   atlas           图集（用于 count 越界兜底，可为 null）
 */
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

/** 内容尺寸（像素） */
function computeContentSize(grid) {
  return {
    width: grid.columns * grid.tileWidth * grid.scale,
    height: grid.rows * grid.tileHeight * grid.scale
  };
}

module.exports = {
  createRng: createRng,
  computeGrid: computeGrid,
  createMap: createMap,
  computeContentSize: computeContentSize
};
