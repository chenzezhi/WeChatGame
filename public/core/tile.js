'use strict';

/* ==================== 功能 ====================
 * Tile —— 平铺矩阵计算（纯计算，不碰渲染）
 *
 * 给它一块区域 + 每个格子的尺寸 + 间距，算出所有格子的坐标。
 * 只算位置，不创建对象：静态图可以烘焙成一张大图，
 * 精灵 / 图集可以复制成 N 个对象。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Tile = require('./tile.js');
 *
 * const grid = Tile.grid({
 *   x: 0, y: 0, right: 1080, bottom: 2400,
 *   cellW: 256, cellH: 256,
 *   gap: 8,        // 格子之间的间距
 *   margin: 16,    // 区域四周留白
 * });
 *
 * grid.x, grid.y;            // 实际区域左上角（已含 margin）
 * grid.width, grid.height;   // 实际区域尺寸
 * grid.cols, grid.rows;      // 几列几行
 * grid.cells;                // [{x, y}, ...] 每个格子的左上角
 * ==============================================*/

/* ==================== 注意 ====================
 * 平铺的语义是「铺满」：区域除不尽格子时，补一格，
 * 最后一格超出区域的部分由调用方裁掉（画布会自动裁）。
 * 所以 cols/rows 用的是向上取整，不用向下取整。
 *
 * right / bottom 优先；没给就用 x + width、y + height。
 * 区域比一个格子还小的时候，也会放 1 个。
 * ==============================================*/

class Tile {
  /**
   * 算一块区域的平铺矩阵
   * @param {Object} options
   *   x, y            区域左上角（默认 0, 0）
   *   right, bottom   区域右下角（优先）
   *   width, height   区域宽高（没给 right/bottom 时用）
   *   cellW, cellH    每个格子的尺寸（必填）
   *   gap             格子之间的间距
   *   margin          区域四周留白
   * @returns {{x: number, y: number, width: number, height: number,
   *            cols: number, rows: number, cellW: number, cellH: number,
   *            cells: Array<{x: number, y: number}>}}
   */
  static grid(options = {}) {
    const opt = options || {};

    const cellW = opt.cellW || 1;
    const cellH = opt.cellH || 1;
    const gap = opt.gap || 0;
    const margin = opt.margin || 0;

    // 区域左上角（留白往里缩）
    const left = (opt.x || 0) + margin;
    const top = (opt.y || 0) + margin;

    // 区域右下角：优先角坐标，其次宽高
    const right = opt.right !== undefined ? opt.right : left + (opt.width || 0) - margin;
    const bottom = opt.bottom !== undefined ? opt.bottom : top + (opt.height || 0) - margin;

    const areaW = right - left;
    const areaH = bottom - top;

    // 向上取整：保证铺满，最后一格超出区域的部分会被裁掉
    const cols = areaW > 0 ? Math.max(1, Math.ceil((areaW + gap) / (cellW + gap))) : 1;
    const rows = areaH > 0 ? Math.max(1, Math.ceil((areaH + gap) / (cellH + gap))) : 1;

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          x: left + c * (cellW + gap),
          y: top + r * (cellH + gap),
        });
      }
    }

    return {
      x: left,
      y: top,
      width: areaW > 0 ? areaW : cellW,
      height: areaH > 0 ? areaH : cellH,
      cols,
      rows,
      cellW,
      cellH,
      cells,
    };
  }
}

module.exports = Tile;
