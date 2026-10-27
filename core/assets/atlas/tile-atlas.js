/**
 * 图集 / 位图大图（core/assets/atlas）
 *
 * 把「一张包含很多位图的大图」交给本模块，按 tileWidth / tileHeight /
 * margin / spacing / columns 自动切块。
 *
 * 取块有三种方式：
 *   getTileRect(index)              用扁平索引（0 = 左上角第一块）
 *   getTileRectByCell(row, col)     用「第几行第几列」（从 0 开始）
 *   normalizePool(pool)             把各种写法统一成索引数组
 */
'use strict';

function create(descriptor, image) {
  descriptor = descriptor || {};

  var tileWidth = descriptor.tileWidth || 32;
  var tileHeight = descriptor.tileHeight || 32;
  var margin = descriptor.margin || 0;
  var spacing = descriptor.spacing || 0;

  // columns / rows 填 0 时按图片尺寸自动推算
  var columns = descriptor.columns > 0
    ? descriptor.columns
    : Math.max(1, Math.floor((image.width - margin * 2 + spacing) / (tileWidth + spacing)));

  var rows = descriptor.rows > 0
    ? descriptor.rows
    : Math.max(1, Math.floor((image.height - margin * 2 + spacing) / (tileHeight + spacing)));

  var count = columns * rows;
  var named = descriptor.tiles || {};

  function clampIndex(i) {
    if (typeof i !== 'number' || isNaN(i)) return 0;
    if (i < 0) return 0;
    if (i >= count) return count - 1;
    return Math.floor(i);
  }

  /** 「第几行第几列」→ 扁平索引（越界返回 0） */
  function cellToIndex(row, col) {
    if (typeof row !== 'number' || typeof col !== 'number') return 0;
    if (row < 0 || col < 0 || row >= rows || col >= columns) return 0;
    return Math.floor(row) * columns + Math.floor(col);
  }

  /** 扁平索引 → { row, col } */
  function indexToCell(index) {
    var i = clampIndex(index);
    return { row: Math.floor(i / columns), col: i % columns };
  }

  function getTileRect(index) {
    var i = clampIndex(index);
    var col = i % columns;
    var row = Math.floor(i / columns);
    return {
      sx: margin + col * (tileWidth + spacing),
      sy: margin + row * (tileHeight + spacing),
      sw: tileWidth,
      sh: tileHeight
    };
  }

  function getTileRectByCell(row, col) {
    return getTileRect(cellToIndex(row, col));
  }

  /** 支持用名字取块，例如 tiles: { "grass": 0, "stone": 3 } */
  function indexOf(name) {
    return typeof named[name] === 'number' ? clampIndex(named[name]) : 0;
  }

  /**
   * 把「地板池」的各种写法统一成索引数组。
   *
   * 支持：
   *   0                     扁平索引
   *   [2, 1]                [行, 列]
   *   { row: 2, col: 1 }    行/列对象
   *   { index: 9 }          显式索引
   *   'floor_0'             tileset.tiles 里的名字
   */
  function normalizePool(pool) {
    var out = [];
    if (!pool) return out;
    if (!(pool instanceof Array)) pool = [pool];

    for (var i = 0; i < pool.length; i++) {
      var item = pool[i];
      var idx = null;

      if (typeof item === 'number') {
        idx = item;
      } else if (typeof item === 'string') {
        idx = typeof named[item] === 'number' ? named[item] : null;
      } else if (item instanceof Array) {
        idx = cellToIndex(item[0], item[1]);
      } else if (item && typeof item === 'object') {
        if (typeof item.row === 'number' && typeof item.col === 'number') {
          idx = cellToIndex(item.row, item.col);
        } else if (typeof item.index === 'number') {
          idx = item.index;
        } else if (typeof item.name === 'string' && typeof named[item.name] === 'number') {
          idx = named[item.name];
        }
      }

      if (typeof idx === 'number' && !isNaN(idx)) out.push(clampIndex(idx));
    }

    return out;
  }

  return {
    image: image,
    tileWidth: tileWidth,
    tileHeight: tileHeight,
    margin: margin,
    spacing: spacing,
    columns: columns,
    rows: rows,
    count: count,

    getTileRect: getTileRect,
    getTileRectByCell: getTileRectByCell,
    cellToIndex: cellToIndex,
    indexToCell: indexToCell,
    indexOf: indexOf,
    normalizePool: normalizePool
  };
}

module.exports = { create: create };
