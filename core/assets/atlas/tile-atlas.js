/**
 * 图集 / 位图大图（core/assets/atlas）
 *
 * 你把「一张包含很多位图的大图」交给本模块，它会按 JSON 描述里的
 * tileWidth / tileHeight / margin / spacing / columns 自动切块，
 * 用索引（0 表示左上角第一块）就能取到任意一块的源区域。
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

  function getTileRect(index) {
    var i = index;
    if (typeof i !== 'number' || isNaN(i) || i < 0 || i >= count) i = 0; // 越界兜底
    var col = i % columns;
    var row = Math.floor(i / columns);
    return {
      sx: margin + col * (tileWidth + spacing),
      sy: margin + row * (tileHeight + spacing),
      sw: tileWidth,
      sh: tileHeight
    };
  }

  /** 支持用名字取块，例如 tiles: { "grass": 0, "stone": 3 } */
  function indexOf(name) {
    return typeof named[name] === 'number' ? named[name] : 0;
  }

  return {
    image: image,
    tileWidth: tileWidth,
    tileHeight: tileHeight,
    columns: columns,
    rows: rows,
    count: count,
    getTileRect: getTileRect,
    indexOf: indexOf
  };
}

module.exports = { create: create };
