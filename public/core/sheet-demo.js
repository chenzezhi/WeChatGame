'use strict';

// sheet.js 的示例：加载大图，按格子切片，平铺到屏幕上对照检查。

var Sheet = require('./sheet.js');

var IMAGE = 'src/assets/roll.png';

// 用每格尺寸切（美术给了单帧大小就用这个）
// 也可以用 cols / rows 按行列均分
var SLICE = { frameWidth: 128, frameHeight: 128, margin: 0, spacing: 0 };

function start(env) {
  var cax = env.cax;
  var stage = env.stage;
  var dpr = wx.getSystemInfoSync().pixelRatio || 1;

  Sheet.load({
    image: IMAGE,
    frameWidth: SLICE.frameWidth,
    frameHeight: SLICE.frameHeight,
    margin: SLICE.margin,
    spacing: SLICE.spacing,

    onLoad: function (sheet) {
      console.log('[demo] ' + IMAGE + ' ' + sheet.width + 'x' + sheet.height + ' → ' + sheet.count() + ' 帧');
      tile(cax, stage, sheet, dpr);
    },

    onError: function (err) {
      console.error('[demo] ' + err.message);
      stage.add(label(cax, err.message, '#ff6b6b', dpr));
    }
  });
}

// 每帧一个格子，行优先铺满
function tile(cax, stage, sheet, dpr) {
  var cols = Math.ceil(Math.sqrt(sheet.count()));
  var rows = Math.ceil(sheet.count() / cols);

  var top = 56 * dpr;
  var cellW = stage.canvas.width / cols;
  var cellH = (stage.canvas.height - top) / rows;

  var first = sheet.rect(0);
  var scale = Math.min(cellW / first[2], cellH / first[3]);

  for (var i = 0; i < sheet.count(); i++) {
    var bmp = sheet.bitmap(i);
    bmp.scaleX = scale;
    bmp.scaleY = scale;
    bmp.x = (i % cols) * cellW + (cellW - first[2] * scale) / 2;
    bmp.y = top + Math.floor(i / cols) * cellH + (cellH - first[3] * scale) / 2;
    stage.add(bmp);
  }

  stage.add(label(cax, IMAGE + '  ' + sheet.width + 'x' + sheet.height + '  →  ' + sheet.count() + ' 帧', '#8b98a5', dpr));
}

function label(cax, text, color, dpr) {
  var t = new cax.Text(text, { font: Math.round(13 * dpr) + 'px sans-serif', color: color });
  t.x = 12 * dpr;
  t.y = 32 * dpr;
  return t;
}

module.exports = { start: start };
