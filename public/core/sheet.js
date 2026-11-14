'use strict';

// 大图切片：texture 负责读图，grid 负责算格子，这里只把它们拼起来。
// 图片始终只有一份，「切片」只是记下大图上的矩形，不复制、不重新解码。
//
//   Sheet.load({ image: 'xx.png', frameWidth: 64, frameHeight: 64, onLoad: fn });
//   sheet.bitmap(0)  → 一个只画第 0 格的 cax.Bitmap

var cax = require('../../libs/cax.js');
var texture = require('./texture.js');
var grid = require('./grid.js');

function load(config) {
  texture.load(config.image, onTexture, config.onError);

  function onTexture(t) {
    var rects;

    try {
      rects = config.frames || grid(t.width, t.height, config);
    } catch (err) {
      if (config.onError) config.onError(err);
      else console.error(err.message);
      return;
    }

    config.onLoad(new Sheet(t, rects));
  }
}

// 句柄：一张图 + 一份矩形表
function Sheet(t, rects) {
  this.image = t.image;
  this.width = t.width;
  this.height = t.height;
  this.rects = rects;
}

Sheet.prototype.count = function () {
  return this.rects.length;
};

Sheet.prototype.rect = function (i) {
  var r = this.rects[i];
  if (!r) throw new Error('[sheet] 没有第 ' + i + ' 帧');
  return r;
};

// 取一帧，得到可 add 到舞台的 Bitmap。开销只有一个空对象，图是共享的。
Sheet.prototype.bitmap = function (i, x, y) {
  var r = this.rect(i);

  var bmp = new cax.Bitmap(this.image);
  bmp.rect = [r[0], r[1], r[2], r[3]];
  bmp.width = r[2];
  bmp.height = r[3];
  bmp.x = x || 0;
  bmp.y = y || 0;

  return bmp;
};

module.exports = { load: load };
