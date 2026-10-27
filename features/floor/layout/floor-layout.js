/**
 * 地板布局（features/floor/layout）
 * 纯函数：输入屏幕尺寸 + 配置 + 图集，输出格子数与每格索引，不碰渲染、不碰状态。
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

/** 计算地板格数与单块原始尺寸 */
function computeGrid(viewport, config, atlas) {
  config = config || {};
  var grid = config.grid || {};
  var tileWidth = config.tileWidth || (atlas && atlas.tileWidth) || 32;
  var tileHeight = config.tileHeight || (atlas && atlas.tileHeight) || 32;

  var columns = grid.columns > 0 ? grid.columns : Math.max(1, Math.ceil(viewport.width / tileWidth));
  var rows = grid.rows > 0 ? grid.rows : Math.max(1, Math.ceil(viewport.height / tileHeight));

  return { columns: columns, rows: rows, tileWidth: tileWidth, tileHeight: tileHeight };
}

function pickIndex(pattern, pool, rnd, atlas, col, row) {
  var count = (atlas && atlas.count) || 0;
  function safe(i) { return count > 0 ? ((i % count) + count) % count : i; }

  if (pattern === 'checker') return safe(pool[(col + row) % pool.length]);
  if (pattern === 'single') return safe(pool[0]);
  return safe(pool[Math.floor(rnd() * pool.length)]);
}

/** 生成 map[row][col] = 图集索引 */
function createMap(options) {
  options = options || {};
  var columns = options.columns || 0;
  var rows = options.rows || 0;
  var pool = (options.pool && options.pool.length) ? options.pool : [0];
  var pattern = options.pattern || 'random';
  var rnd = createRng(options.seed);

  var map = [];
  for (var row = 0; row < rows; row++) {
    var line = [];
    for (var col = 0; col < columns; col++) {
      line.push(pickIndex(pattern, pool, rnd, options.atlas, col, row));
    }
    map.push(line);
  }
  return map;
}

module.exports = {
  createRng: createRng,
  computeGrid: computeGrid,
  createMap: createMap
};
