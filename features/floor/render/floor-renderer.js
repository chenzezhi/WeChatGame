/**
 * 地板绘制（features/floor/render）
 *
 * 铁律：**绝不修改贴图**。每块贴图原样绘制，透明度、边缘全部保留。
 * 地图形状（矩形/菱形）只决定「这一格画不画」，不改图。
 *
 * 三个要点：
 *   1. 形状裁剪：菱形边界外的格子整块跳过 → 四边留缺口
 *   2. 相邻格子共享取整边界（x1 = round(x0 + W)），无缝且不拉伸
 *   3. 逐格屏幕裁剪，超出视口直接跳过
 */
'use strict';

var FALLBACK_COLORS = ['#1f6feb', '#238636', '#9e6a03', '#8957e5', '#1b7c83', '#a40e26'];

/* ---------------- 位置（与 floor-layout 保持一致） ---------------- */
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

/* ---------------- 形状判定（与 floor-layout 保持一致） ---------------- */
function isInsideShape(shape, col, row, columns, rows, tolerance) {
  if (shape !== 'diamond') return true;
  if (columns <= 0 || rows <= 0) return false;
  if (columns <= 2 || rows <= 2) return true;

  var tol = typeof tolerance === 'number' ? tolerance : 0;
  var cx = (columns - 1) / 2;
  var cy = (rows - 1) / 2;
  var nx = Math.abs(col - cx) / cx;
  var ny = Math.abs(row - cy) / cy;

  return nx + ny <= 1 + tol;
}

function createFloorRenderer(renderer) {
  /**
   * @param {Object} floor     地板状态
   * @param {Object} viewport  { width, height }
   * @param {Object} atlas     图集（image 为原始大图，未被修改）
   * @param {Object} options   { shapeTolerance }
   */
  function draw(floor, viewport, atlas, options) {
    if (!floor || !floor.map) return;

    options = options || {};
    var tolerance = typeof options.shapeTolerance === 'number' ? options.shapeTolerance : 0;

    var columns = floor.columns;
    var rows = floor.rows;
    var tileW = floor.tileWidth * floor.scale;
    var tileH = floor.tileHeight * floor.scale;
    if (columns <= 0 || rows <= 0 || tileW <= 0 || tileH <= 0) return;

    var layoutMode = floor.layout || 'grid';
    var shape = floor.mapShape || 'rect';
    var staggerX = typeof floor.staggerX === 'number' ? floor.staggerX : 0.5;
    var staggerY = typeof floor.staggerY === 'number' ? floor.staggerY : 0.5;

    var shiftX = getOriginShift(layoutMode, tileW, rows);
    var ox = (floor.offsetX || 0) + shiftX;
    var oy = floor.offsetY || 0;

    var viewW = (viewport && viewport.width) || 0;
    var viewH = (viewport && viewport.height) || 0;

    for (var row = 0; row < rows; row++) {
      var line = floor.map[row];
      if (!line) continue;

      for (var col = 0; col < columns; col++) {
        // ① 形状裁剪：菱形外的格子整块不画（不修改贴图）
        if (!isInsideShape(shape, col, row, columns, rows, tolerance)) continue;

        var index = line[col];
        if (typeof index !== 'number' || index < 0) continue;

        var pos = getTileScreenPos(layoutMode, col, row, tileW, tileH, staggerX, staggerY);

        // ② 共享取整边界：相邻格子严丝合缝，且不拉伸
        var x0 = Math.round(ox + pos.x);
        var y0 = Math.round(oy + pos.y);
        var x1 = Math.round(ox + pos.x + tileW);
        var y1 = Math.round(oy + pos.y + tileH);

        var w = x1 - x0;
        var h = y1 - y0;
        if (w <= 0 || h <= 0) continue;

        // ③ 屏幕裁剪
        if (x1 < -1 || x0 > viewW + 1) continue;
        if (y1 < -1 || y0 > viewH + 1) continue;

        if (atlas && atlas.image) {
          // 原样绘制：贴图不做任何裁剪/变形，alpha 由 PNG 自己带
          renderer.drawTile(atlas.image, atlas.getTileRect(index), x0, y0, w, h);
        } else {
          renderer.fillRect(x0, y0, w, h, FALLBACK_COLORS[index % FALLBACK_COLORS.length]);
        }
      }
    }
  }

  return { draw: draw };
}

module.exports = { create: createFloorRenderer, isInsideShape: isInsideShape };
