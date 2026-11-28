'use strict';

/* ==================== 功能 ====================
 * Board —— 棋盘
 *
 * 用字符串数组描述棋盘布局（一个字符一个格子），生成一组 Cell 对象。
 * 每个 Cell 知道自己是谁、在第几行第几列、坐标多大、要渲染成哪一行表格。
 *
 * 只管棋盘自己的事：算尺寸、算坐标、生成渲染行。
 * 不碰渲染器，不碰图集加载，也不碰表格解析。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Board = require('./board.js');
 * const CONFIG = require('../config/board.js');
 *
 * const board = new Board(CONFIG, { width: w, height: h, frame: { w: 64, h: 64 } });
 *
 * board.cells;             // Cell 对象数组，按行优先顺序
 * board.path;              // 同上，作为「人物行走顺序」用
 * board.cellAt(0, 0);      // 按行列取格子，空洞返回 null
 * board.toTable();         // ['sprite 30 100 200 3.2', ...] 直接拼进表格
 * ==============================================*/

/* ==================== 注意 ====================
 * 所有坐标单位都是 px；格子尺寸和间距用「占画布宽度的比例」，换分辨率不会错位。
 * frame 是格子原图的尺寸，用来把格子缩放到目标 px；不传则 scale 为 1。
 * 布局里的 '.' 是空洞，不生成格子，也不占 path 的序号。
 * ==============================================*/

// 格子：棋盘上的一格
// board - 所属的 Board，用来取格子的尺寸和原点
// row, col - 在布局里的行列，从 0 开始
// char - 布局里写的字符：A 空格子 / S 起点
class Cell {
  constructor(board, row, col, char) {
    this.row = row;
    this.col = col;
    this.char = char;

    // 在 path 上的序号，Board 生成时赋值
    this.index = -1;

    // 位置与尺寸，单位 px
    this.x = board.originX + col * (board.cellW + board.gap);
    this.y = board.originY + row * (board.cellH + board.gap);
    this.w = board.cellW;
    this.h = board.cellH;

    // 画自己用的素材：图集序号 + 缩放倍数
    this.sprite = board.cellSprite;
    this.scale = board.cellScale;

    // 挂在格子上的卡牌，没有就是 null
    this.card = null;
  }

  // 这个格子要渲染的表格行
  // renderer - 用哪个渲染器，默认 sprite
  // 返回字符串数组，一行一个渲染项
  toRows(renderer) {
    const r = renderer || 'sprite';
    return [`${r} ${this.sprite} ${this.x} ${this.y} ${this.scale}`];
  }
}

// 棋盘：由布局字符串生成格子
// config - 见 public/config/board.js（map / cellRatio / gapRatio / topRatio / cellSprite）
// env - { width, height, frame }，画布物理像素尺寸 + 格子原图尺寸
class Board {
  constructor(config, env) {
    const cfg = config || {};
    const e = env || {};

    // 布局：每行拆成单字符，空格只为看着清楚
    this.chars = (cfg.map || []).map((line) => String(line).replace(/\s+/g, '').split(''));

    // 棋盘几行几列
    this.rowCount = this.chars.length;
    this.colCount = this.rowCount ? this.chars[0].length : 0;

    // 画布尺寸，单位 px
    const width = e.width || 0;
    const height = e.height || 0;

    // 格子尺寸与间距，单位 px（比例 × 画布宽）
    this.cellW = width * (cfg.cellRatio || 0);
    this.cellH = this.cellW;              // 正方形格子
    this.gap = width * (cfg.gapRatio || 0);

    // 棋盘总宽高，单位 px
    this.width = this.colCount * this.cellW + (this.colCount - 1) * this.gap;
    this.height = this.rowCount * this.cellH + (this.rowCount - 1) * this.gap;

    // 棋盘左上角：水平居中，纵向按画布高度比例
    this.originX = (width - this.width) / 2;
    this.originY = height * (cfg.topRatio || 0);

    // 格子用的图集序号，以及缩放到格子宽所需的倍数
    this.cellSprite = cfg.cellSprite;
    const frame = e.frame || null;
    this.cellScale = frame && frame.w ? this.cellW / frame.w : 1;

    // 生成格子对象；'.' 是空洞，跳过
    this.cells = [];
    this.path = [];     // 行优先顺序的格子，人物按这个顺序走
    for (let r = 0; r < this.rowCount; r++) {
      for (let c = 0; c < this.colCount; c++) {
        const ch = this.chars[r][c];
        if (ch === '.') continue;

        const cell = new Cell(this, r, c, ch);
        cell.index = this.path.length;
        this.cells.push(cell);
        this.path.push(cell);
      }
    }
  }

  // 按行列取格子
  // row, col - 行列，从 0 开始
  // 返回 Cell，越界或是空洞则返回 null
  cellAt(row, col) {
    if (row < 0 || col < 0 || row >= this.rowCount || col >= this.colCount) return null;
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.row === row && cell.col === col) return cell;
    }
    return null;
  }

  // 整盘棋的渲染行
  // 返回字符串数组，行优先顺序，可直接拼进表格
  toTable() {
    const out = [];
    for (let i = 0; i < this.cells.length; i++) {
      const rows = this.cells[i].toRows();
      for (let j = 0; j < rows.length; j++) out.push(rows[j]);
    }
    return out;
  }
}

module.exports = Board;
