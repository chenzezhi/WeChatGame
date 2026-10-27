/**
 * 地板绘制（features/floor/render）
 * 只做「按状态把地板画出来」，不改状态、不做布局计算。
 *
 * 用整数边界 + 多画 1px 消除相邻贴图之间的缝隙。
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

    for (var row = 0; row < rows; row++) {
      var y0 = Math.floor(floor.originY + row * tileH);
      var y1 = Math.floor(floor.originY + (row + 1) * tileH);
      var line = floor.map[row];
      if (!line) continue;

      for (var col = 0; col < columns; col++) {
        var x0 = Math.floor(floor.originX + col * tileW);
        var x1 = Math.floor(floor.originX + (col + 1) * tileW);

        var w = x1 - x0 + 1;
        var h = y1 - y0 + 1;
        var index = line[col] || 0;

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
