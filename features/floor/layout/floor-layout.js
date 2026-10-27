/**
 * 地板布局（features/floor/layout）
 * 纯函数：布局位置、地图形状裁剪、格子数/缩放、地图生成。
 * 不碰渲染、不碰状态、**不碰贴图**。
 *
 * 布局模式（只影响格子摆在哪）：
 *   'grid'       正方形平铺
 *   'staggered'  菱形交错（每行错开 staggerX 格宽，纵向前进 staggerY 格高）
 *   'iso'        等距投影（col-row, col+row）
 *
 * 地图形状（只影响画不画某个格子）：
 *   'rect'       矩形，全部画
 *   'diamond'    菱形，边界外整块不画 → 四边留缺口
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

/* ============================================================
 * 地图整体形状（决定「画不画这一格」，不修改贴图）
 * ============================================================ */
/**
 * 某个格子是否在地图形状内部
 *
 *   'rect'     全部返回 true
 *   'diamond'  菱形：|Δcol| / 半宽 + |Δrow| / 半高 <= 1
 *              形状外部整块不画，于是四边自然留出缺口（菱形边界呈锯齿状）
 *
 * @param {String} shape    'rect' | 'diamond'
 * @param {Number} col
 * @param {Number} row
 * @param {Number} columns  总列数
 * @param {Number} rows     总行数
 * @param {Number} tolerance 可放宽的容差（默认 0，越大菱形越胖）
 */
function isInsideShape(shape, col, row, columns, rows, tolerance) {
  if (shape !== 'diamond') return true;
  if (columns <= 0 || rows <= 0) return false;

  var tol = typeof tolerance === 'number' ? tolerance : 0;

  // 单行或单列时退化为中心线，不做菱形裁剪
  if (columns <= 2 || rows <= 2) return true;

  var cx = (columns - 1) / 2;
  var cy = (rows - 1) / 2;

  var nx = Math.abs(col - cx) / cx;   // 0 = 中心列，1 = 最左/右列
  var ny = Math.abs(row - cy) / cy;   // 0 = 中心行，1 = 最上/下行

  return nx + ny <= 1 + tol;
}

/**
 * 统计某个形状里实际会画多少格（调试 / 日志用）
 */
function countVisibleTiles(shape, columns, rows, tolerance) {
  var count = 0;
  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < columns; col++) {
      if (isInsideShape(shape, col, row, columns, rows, tolerance)) count++;
    }
  }
  return count;
}

/* ============================================================
 * 内容尺寸
 * ============================================================ */
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
  isInsideShape: isInsideShape,
  countVisibleTiles: countVisibleTiles,
  computeContentSize: computeContentSize,
  computeGrid: computeGrid,
  createMap: createMap
};
