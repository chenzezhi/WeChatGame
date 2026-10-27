/**
 * 地板绘制（features/floor/render）
 * 只做「按状态把地板画出来」，不改状态、不做布局计算。
 *
 * 位置公式与 floor-layout.js 的 getTilePosition 保持一致（含 staggerX/staggerY）。
 *
 * 关键点：
 *   1. 逐格屏幕裁剪，超出视口直接跳过
 *   2. 索引 < 0 表示空格子，跳过
 *   3. 目标尺寸用 ceil，避免非整数缩放下留 1px 缝
 */
'use strict';

var FALLBACK_COLORS = ['#1f6feb', '#238636', '#9e6a03', '#8957e5', '#1b7c83', '#a40e26'];

function getTileScreenPos(layout, col, row, tileW, tileH, staggerX, staggerY) {
  if (layout === 'staggered') {
    return {
      x: col * tileW + (row % 2) * tileW * staggerX,
      y: row * tileH * staggerY
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

function getOriginShift(layout, tileW, rows) {
  if (layout === 'iso') return Math.max(0, rows - 1) * tileW * 0.5;
  return 0;
}

function createFloorRenderer(renderer) {
  function draw(floor, viewport, atlas) {
    if (!floor || !floor.map) return;

    var columns = floor.columns;
    var rows = floor.rows;
    var tileW = floor.tileWidth * floor.scale;
    var tileH = floor.tileHeight * floor.scale;
    if (columns <= 0 || rows <= 0 || tileW <= 0 || tileH <= 0) return;

    var layoutMode = floor.layout || 'grid';
    var staggerX = typeof floor.staggerX === 'number' ? floor.staggerX : 0.5;
    var staggerY = typeof floor.staggerY === 'number' ? floor.staggerY : 0.5;

    var shiftX = getOriginShift(layoutMode, tileW, rows);
    var ox = (floor.offsetX || 0) + shiftX;
    var oy = floor.offsetY || 0;

    var viewW = (viewport && viewport.width) || 0;
    var viewH = (viewport && viewport.height) || 0;

    var tileWi = Math.ceil(tileW);
    var tileHi = Math.ceil(tileH);

    for (var row = 0; row < rows; row++) {
      var line = floor.map[row];
      if (!line) continue;

      for (var col = 0; col < columns; col++) {
        var pos = getTileScreenPos(layoutMode, col, row, tileW, tileH, staggerX, staggerY);
        var x = Math.round(ox + pos.x);
        var y = Math.round(oy + pos.y);

        if (x + tileWi < -1 || x > viewW + 1) continue;
        if (y + tileHi < -1 || y > viewH + 1) continue;

        var index = line[col];
        if (typeof index !== 'number' || index < 0) continue;

        if (atlas && atlas.image) {
          renderer.drawTile(atlas.image, atlas.getTileRect(index), x, y, tileWi, tileHi);
        } else {
          renderer.fillRect(x, y, tileWi, tileHi, FALLBACK_COLORS[index % FALLBACK_COLORS.length]);
        }
      }
    }
  }

  return { draw: draw };
}

module.exports = { create: createFloorRenderer };
