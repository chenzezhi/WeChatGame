/**
 * 地板绘制（features/floor/render）
 * 只做「按状态把地板画出来」，不改状态、不做布局计算。
 *
 * 三个关键点：
 *   1. 只画屏幕内可见的格子（大地图时性能差几十倍）；
 *   2. 相邻格子用「共享边界取整」，不用 +1 多画，避免非整数缩放下像素错位；
 *   3. 索引为负（-1）表示空格子，直接跳过，露出背景色。
 */
'use strict';

var FALLBACK_COLORS = ['#1f6feb', '#238636', '#9e6a03', '#8957e5', '#1b7c83', '#a40e26'];

function createFloorRenderer(renderer) {
  function draw(floor, viewport, atlas) {
    if (!floor || !floor.map) return;

    var columns = floor.columns;
    var rows = floor.rows;
    var tileW = floor.tileWidth * floor.scale;
    var tileH = floor.tileHeight * floor.scale;
    if (columns <= 0 || rows <= 0 || tileW <= 0 || tileH <= 0) return;

    var offsetX = floor.offsetX || 0;
    var offsetY = floor.offsetY || 0;
    var viewW = (viewport && viewport.width) || 0;
    var viewH = (viewport && viewport.height) || 0;

    // 可见范围（含 1 格余量，防止滚动时边缘缺一块）
    var colStart = Math.max(0, Math.floor(-offsetX / tileW) - 1);
    var colEnd = Math.min(columns - 1, Math.floor((-offsetX + viewW) / tileW) + 1);
    var rowStart = Math.max(0, Math.floor(-offsetY / tileH) - 1);
    var rowEnd = Math.min(rows - 1, Math.floor((-offsetY + viewH) / tileH) + 1);

    if (colEnd < colStart || rowEnd < rowStart) return;

    for (var row = rowStart; row <= rowEnd; row++) {
      var y0 = Math.round(offsetY + row * tileH);
      var y1 = Math.round(offsetY + (row + 1) * tileH);
      var h = y1 - y0;
      if (h <= 0) continue;

      var line = floor.map[row];
      if (!line) continue;

      for (var col = colStart; col <= colEnd; col++) {
        var index = line[col];

        // 空格子：不画，露出背景
        if (typeof index !== 'number' || index < 0) continue;

        var x0 = Math.round(offsetX + col * tileW);
        var x1 = Math.round(offsetX + (col + 1) * tileW);
        var w = x1 - x0;
        if (w <= 0) continue;

        if (atlas && atlas.image) {
          renderer.drawTile(atlas.image, atlas.getTileRect(index), x0, y0, w, h);
        } else {
          // 大图没就位时的纯色兜底，保证项目随时能跑起来
          renderer.fillRect(x0, y0, w, h, FALLBACK_COLORS[index % FALLBACK_COLORS.length]);
        }
      }
    }
  }

  return { draw: draw };
}

module.exports = { create: createFloorRenderer };
