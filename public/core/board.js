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
 *
 * // 想挪棋盘：配置里给 x / y，不给就自适应
 * new Board({ ...CONFIG, x: 0, y: 0 }, env);   // 贴左上角
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位都是 px；格子尺寸和间距用「占画布宽度的比例」，换分辨率不会错位。
 *
 * 位置：x / y 为 null 时自适应（水平居中、纵向用 topRatio）；
 *       填数字就用那个值当棋盘左上角，0 是合法值（贴边）。
 *
 * frame 是格子素材的原始尺寸，用来把格子缩放到目标 px；不传则 scale 为 1。
 * 用图集序号时传图集里那张图的尺寸，用单张图片时传那张图的尺寸。
 *
 * 布局里的 '.' 是空洞，不生成格子，也不占 path 的序号。
 * ==============================================*/

// 判断素材写的是「图片路径」还是「图集序号」
// value - 纯数字或纯数字字符串算序号，含 / 或 . 的算路径
function isImagePath(value) {
  return /[\/.]/.test(String(value));
}

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

    // 画自己用的素材：图集序号（数字），或图片路径（字符串）
    this.asset = board.cellAsset;
    // 按素材形态自动选渲染器：路径走 image，序号走 sprite
    this.renderer = isImagePath(this.asset) ? 'image' : 'sprite';
    // 缩放倍数，把素材原始尺寸缩到格子大小
    this.scale = board.cellScale;

    // 挂在格子上的卡牌，没有就是 null
    this.card = null;
  }

  // 这个格子要渲染的表格行
  // renderer - 强制指定渲染器；不传就按素材形态自动选
  // 返回字符串数组，一行一个渲染项
  toRows(renderer) {
    const r = renderer || this.renderer;
    return [`${r} ${this.asset} ${this.x} ${this.y} ${this.scale}`];
  }
}

// 棋盘：由布局字符串生成格子
// config - 见 public/config/board.js：
//          map / x / y / cellRatio / gapRatio / topRatio / cellAsset
// env - { width, height, frame }
//          width, height 画布物理像素尺寸
//          frame 格子素材原始尺寸 { w, h }，不传则 scale 为 1
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
    // 配置里必须给齐，默认值由 config/board.js 的模板负责，代码里不兜底
    this.cellW = width * cfg.cellRatio;
    this.cellH = this.cellW;              // 正方形格子
    this.gap = width * cfg.gapRatio;

    // 棋盘总宽高，单位 px
    this.width = this.colCount * this.cellW + (this.colCount - 1) * this.gap;
    this.height = this.rowCount * this.cellH + (this.rowCount - 1) * this.gap;

    // 棋盘左上角：给了 x / y 就用它，没给就自适应
    this.originX = cfg.x == null ? (width - this.width) / 2 : cfg.x;
    this.originY = cfg.y == null ? height * cfg.topRatio : cfg.y;

    // 格子用的素材与缩放倍数
    this.cellAsset = cfg.cellAsset;
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

  // 把格子画到舞台上，并记下对象，方便以后缩放 / 隐藏
  // stage - cax Stage
  // sm - SpriteMap
  // 返回创建出来的 cax 对象数组（每个带 _baseX / _baseY / _baseScale）
  render(stage, sm) {
    if (this.sprites) return this.sprites;

    const out = [];
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];

      let node = null;
      try {
        node = sm.add(stage, cell.asset, cell.x, cell.y);
      } catch (e) {
        continue;
      }

      node.scale = cell.scale;
      node._baseX = cell.x;
      node._baseY = cell.y;
      node._baseScale = cell.scale;
      out.push(node);
    }

    this.sprites = out;
    return out;
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
