/**
 * 地图数据（features/floor/data）
 *
 * 职责：把「手写的地图文件」校验、归一化成可以直接渲染的二维索引表。
 * 纯函数，不碰状态、不碰渲染。
 *
 * 一个地图文件长这样：
 *   module.exports = {
 *     name: 'level-1',
 *     tileDisplaySize: 48,   // 可选
 *     rows: [
 *       [17, 20, 17],
 *       [2, 6, 7]
 *     ]
 *   };
 *
 * 也接受直接导出二维数组：
 *   module.exports = [[17, 20, 17], [2, 6, 7]];
 */
'use strict';

/** 空格子标记（渲染时跳过，露出背景） */
var EMPTY = -1;

function isArray(v) {
  return v instanceof Array;
}

/** 越界索引钳制到 [0, count) */
function clampToCount(i, count) {
  if (count > 0) return ((i % count) + count) % count;
  return i;
}

/**
 * 单个格子条目 → 索引
 * 支持：数字、{row,col}、[row,col]、'floor_0'、'#'、'.'、null、-1
 */
function toIndex(entry, atlas) {
  if (entry === null || typeof entry === 'undefined') return EMPTY;

  if (typeof entry === 'number') {
    if (isNaN(entry) || entry < 0) return EMPTY;
    return Math.floor(entry);
  }

  if (typeof entry === 'string') {
    if (entry === '' || entry === '#' || entry === '.' || entry === ' ' || entry === '0') {
      if (entry === '0') return 0;
      return EMPTY;
    }
    if (atlas && typeof atlas.indexOf === 'function') {
      return atlas.indexOf(entry);
    }
    var n = parseInt(entry, 10);
    return isNaN(n) || n < 0 ? EMPTY : n;
  }

  if (isArray(entry)) {
    if (atlas && typeof atlas.cellToIndex === 'function') {
      return atlas.cellToIndex(entry[0], entry[1]);
    }
    return EMPTY;
  }

  if (entry && typeof entry === 'object') {
    if (typeof entry.row === 'number' && typeof entry.col === 'number' &&
        atlas && typeof atlas.cellToIndex === 'function') {
      return atlas.cellToIndex(entry.row, entry.col);
    }
    if (typeof entry.index === 'number') {
      return entry.index < 0 ? EMPTY : Math.floor(entry.index);
    }
  }

  return EMPTY;
}

/**
 * 从清单里取出一张地图的原始数据
 * @param {String|Object} mapName  地图名，或直接传数据对象
 * @param {Object} registry        地图清单（assets/maps/index.js）
 */
function resolve(mapName, registry) {
  if (!mapName) return null;
  if (typeof mapName === 'object') return mapName;
  if (registry && registry[mapName]) return registry[mapName];
  return null;
}

/**
 * 归一化成 { name, columns, rows, map, tileDisplaySize }
 * map[row][col] = 索引（-1 表示空格子）
 *
 * @param {Object|Array} raw   地图原始数据
 * @param {Object} atlas       图集（用于 {row,col} 换算与越界钳制），可为 null
 */
function normalize(raw, atlas) {
  if (!raw) return null;

  var rowsIn = null;
  if (isArray(raw)) rowsIn = raw;
  else if (isArray(raw.rows)) rowsIn = raw.rows;
  else if (isArray(raw.map)) rowsIn = raw.map;
  else if (isArray(raw.tiles)) rowsIn = raw.tiles;

  if (!rowsIn || !rowsIn.length) return null;

  var count = (atlas && atlas.count) || 0;
  var maxColumns = 0;
  var r;

  // 第一遍：统计最大列数
  for (r = 0; r < rowsIn.length; r++) {
    var src = rowsIn[r];
    if (isArray(src) && src.length > maxColumns) maxColumns = src.length;
  }
  if (maxColumns <= 0) return null;

  // 第二遍：逐格转索引，短行补空格子
  var map = [];
  for (r = 0; r < rowsIn.length; r++) {
    var rowSrc = isArray(rowsIn[r]) ? rowsIn[r] : [rowsIn[r]];
    var line = [];

    for (var c = 0; c < maxColumns; c++) {
      var idx = toIndex(c < rowSrc.length ? rowSrc[c] : null, atlas);
      if (idx !== EMPTY) idx = clampToCount(idx, count);
      line.push(idx);
    }

    map.push(line);
  }

  return {
    name: (raw && raw.name) || 'custom',
    columns: maxColumns,
    rows: map.length,
    map: map,
    tileDisplaySize: (raw && raw.tileDisplaySize) || 0
  };
}

/**
 * 让 map 的尺寸和 columns/rows 完全对齐（多裁掉、少补空）
 * 正常情况下用不到，属于安全兜底。
 */
function fit(map, columns, rows) {
  if (!map) return null;

  var out = [];
  for (var r = 0; r < rows; r++) {
    var line = [];
    var src = r < map.length ? map[r] : null;
    for (var c = 0; c < columns; c++) {
      var v = (src && c < src.length) ? src[c] : EMPTY;
      line.push(typeof v === 'number' ? v : EMPTY);
    }
    out.push(line);
  }
  return out;
}

module.exports = {
  EMPTY: EMPTY,
  resolve: resolve,
  normalize: normalize,
  fit: fit,
  toIndex: toIndex
};
