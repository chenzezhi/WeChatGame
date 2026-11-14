'use strict';

// 纯计算：一张 width×height 的大图，按每格尺寸 / 外边距 / 缝隙，
// 算出每一格的矩形。不碰 cax，不碰 DOM，可以单独测。
// 返回 [[x, y, w, h], ...]，行优先。

function grid(width, height, opt) {
  opt = opt || {};

  var margin = opt.margin || 0;
  var spacing = opt.spacing || 0;
  var cols = opt.cols;
  var rows = opt.rows;

  // 没给行列数，用每格尺寸反推
  if (!cols || !rows) {
    cols = Math.floor((width - margin * 2 + spacing) / (opt.frameWidth + spacing));
    rows = Math.floor((height - margin * 2 + spacing) / (opt.frameHeight + spacing));
  }

  // 没给每格尺寸，用行列数反推
  var fw = opt.frameWidth || Math.floor((width - margin * 2 - spacing * (cols - 1)) / cols);
  var fh = opt.frameHeight || Math.floor((height - margin * 2 - spacing * (rows - 1)) / rows);

  if (fw <= 0 || fh <= 0) {
    throw new Error('[grid] 格子算出来是 ' + fw + 'x' + fh + '，和图片 ' + width + 'x' + height + ' 对不上');
  }

  var out = [];

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      out.push([margin + c * (fw + spacing), margin + r * (fh + spacing), fw, fh]);
    }
  }

  return out;
}

module.exports = grid;
