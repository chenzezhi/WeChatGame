'use strict';

/* ==================== 功能 ====================
 * 棋盘配置 —— 只有数据
 *
 * 棋盘长什么样写在 src/assets/boards.txt（纯文本），这里只放两样东西：
 *   1. 那个文件在哪
 *   2. 所有棋盘共用的模板（尺寸、位置、格子素材）
 *
 * 读取它的是 public/core/board.js 与 public/core/board-text.js。
 * ==============================================*/

/* ==================== 用法 ====================
 * const BOARD = require('../config/board.js');
 * const cfg = Object.assign({}, BOARD.template, data);   // data 来自 boards.txt
 * ==============================================*/

module.exports = {
  // 棋盘数据文件，路径相对包根
  file: 'src/assets/boards.txt',

  // 当前用哪一块：序号或名字，跟 boards.txt 的块头对上
  // 想换棋盘，改这一个值就行；以后要做"玩家选棋盘"，改成运行时变量
  current: 1,

  // 模板：所有棋盘的默认值，只写一次
  // 具体棋盘只写和这里不一样的部分（现在只有 map 不一样）
  template: {
    x: null,          // 棋盘左上角 x，单位 px；null = 水平居中
    y: null,          // 棋盘左上角 y，单位 px；null = 用 topRatio
    cellRatio: 0.28,  // 格子边长占画布宽度的比例（3 格约 84% 宽）
    gapRatio: 0.02,  // 格子间距占画布宽度的比例
    topRatio: 0.32,    // 仅当 y 为 null 时生效，占画布高度的比例

    // 格子用的素材，两种写法都行：
    //   数字            = 图集序号（走 sprite 渲染器，从合图里切）
    //   字符串带 / 或 . = 图片路径（走 image 渲染器，单独一张图）
    cellAsset: 30,
  },
};
