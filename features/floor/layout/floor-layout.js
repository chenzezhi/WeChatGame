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
 * 缩放（scale）三档决策，顺序很重要：
 *
 *   ① tileDisplaySize > 0
 *        → scale = tileDisplaySize / tileWidth      你明确指定了每块多大
 *
 *   ② 有地图文件 或 grid.columns/rows 指定了
 *        → scale = 1                                 保持原始大小，超出屏幕就滚动
 *        （这一档是为了修「地图变大 → 每块变小」的 bug）
 *
 *   ③ 什么都没指定
 *        → 自适应铺满一屏（不能滚）                    旧行为，仅用于「随便铺满一屏」
 *
 * @param {Object} viewport      { width, height, dpr }
 * @param {Object} config        floor-config
 * @param {Object} atlas         图集，可为 null
 * @param {Object} sizeOverride  { columns, rows } 可选，地图文件给的尺寸
 */
function computeGrid(viewport, config, atlas, sizeOverride) {
  config = config || {};
  var grid = config.grid || {};

  viewport = viewport || { width: 375, height: 667 };

  var tileWidth = config.tileWidth || (atlas && atlas.tileWidth) || 32;
  var tileHeight = config.tileHeight || (atlas && atlas.tileHeight) || 32;
  var displaySize = config.tileDisplaySize > 0 ? config.tileDisplaySize : 0;

  var isMapMode = !!(sizeOverride && sizeOverride.columns > 0);

  var overrideColumns = isMapMode ? Math.floor(sizeOverride.columns) : 0;
  var overrideRows = (sizeOverride && sizeOverride.rows > 0) ? Math.floor(sizeOverride.rows) : 0;

  var wantedColumns = overrideColumns || (grid.columns > 0 ? Math.floor(grid.columns) : 0);
  var wantedRows = overrideRows || (grid.rows > 0 ? Math.floor(grid.rows) : 0);

  // ---------------------------------------------------------- ① 定缩放
  var scale;
  if (displaySize > 0) {
    // 用户明确指定了每块显示多大
    scale = displaySize / tileWidth;
  } else if (wantedColumns > 0 || wantedRows > 0) {
    // 地图模式 / 指定了格子数 → 保持原始大小，让内容超出屏幕去滚动
    scale = 1;
  } else {
    // 完全没指定 → 自适应铺满一屏
    var autoColumns = Math.max(1, Math.ceil(viewport.width / tileWidth));
    scale = autoColumns * tileWidth > 0 ? viewport.width / (autoColumns * tileWidth) : 1;
  }

  // ---------------------------------------------------------- ② 定格子数
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

/** 内容尺寸（像素，已含 scale） */
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
