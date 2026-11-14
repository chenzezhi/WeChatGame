'use strict';

// 图集：一张大图 + 若干套切法(layouts) + 若干段动画(clips)。
// 图只读一次；「切片」只是记住大图上的矩形，不复制、不重新解码。
//
//   Atlas.load(CONFIG, function (atlas) {
//     stage.add(atlas.sprite('walk', 100, 200));   // 自动循环播放
//     stage.add(atlas.bitmap('head', 0, 0, 0));    // 只要静态某一帧
//   });

var cax = require('../../libs/cax.js');
var texture = require('./texture.js');


/* --------------------------------------------------------------------------
 * 加载：读图 → 每套 layout 算出格子 → 交给 Atlas
 * ------------------------------------------------------------------------*/

function load(config, onLoad, onError) {
  texture.load(config.image, function (t) {
    var layouts = {};

    try {
      var names = Object.keys(config.layouts || {});
      for (var i = 0; i < names.length; i++) {
        layouts[names[i]] = cells(t.width, t.height, config.layouts[names[i]]);
      }
    } catch (err) {
      fail(err);
      return;
    }

    onLoad(new Atlas(t, layouts, config.clips || {}));
  }, onError);

  function fail(err) {
    if (onError) onError(err);
    else console.error(err.message);
  }
}


/* --------------------------------------------------------------------------
 * 一套切法 → 一组矩形（行优先）
 *
 *   { cols: 4, rows: 4 }                          整张图均分
 *   { frameWidth: 64, frameHeight: 64 }           按格子尺寸排
 *   { frameWidth: 64, origin: [0, 256] }          从大图某处开始排（同一张图两种规格）
 *   margin / spacing                              四周留白 / 格子缝隙
 * ------------------------------------------------------------------------*/

function cells(width, height, spec) {
  var spacing = spec.spacing || 0;
  var ox = spec.origin ? spec.origin[0] : (spec.margin || 0);
  var oy = spec.origin ? spec.origin[1] : (spec.margin || 0);
  var cols = spec.cols;
  var rows = spec.rows;
  var fw = spec.frameWidth;
  var fh = spec.frameHeight;

  // 给了行列数没给格子尺寸：用图片尺寸反推
  if (!fw && cols) fw = Math.floor((width - ox - spacing * (cols - 1)) / cols);
  if (!fh && rows) fh = Math.floor((height - oy - spacing * (rows - 1)) / rows);

  if (!fw || !fh) {
    throw new Error('[atlas] layout 需要 frameWidth+frameHeight，或者 cols+rows');
  }

  // 给了格子尺寸没给行列数：反推能排几个
  if (!cols) cols = Math.floor((width - ox + spacing) / (fw + spacing));
  if (!rows) rows = Math.floor((height - oy + spacing) / (fh + spacing));

  if (cols < 1 || rows < 1) {
    throw new Error('[atlas] 格子 ' + fw + 'x' + fh + ' 在 ' + width + 'x' + height + ' 的图上排不下');
  }

  var out = [];
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      out.push([ox + c * (fw + spacing), oy + r * (fh + spacing), fw, fh]);
    }
  }
  return out;
}


/* --------------------------------------------------------------------------
 * Atlas：加载完成后拿到的句柄
 * ------------------------------------------------------------------------*/

function Atlas(t, layouts, clips) {
  this.image = t.image;
  this.width = t.width;
  this.height = t.height;
  this.layouts = layouts;
  this.clips = clips;
}

Atlas.prototype.clip = function (name) {
  var clip = this.clips[name];
  if (!clip) throw new Error('[atlas] 没有 clip "' + name + '"');
  return clip;
};

// 一段动画用到的所有矩形
Atlas.prototype.rects = function (name) {
  var clip = this.clip(name);
  var grid = this.layouts[clip.layout];

  if (!grid) throw new Error('[atlas] clip "' + name + '" 的 layout "' + clip.layout + '" 不存在');

  var from = clip.from || 0;
  var indices = clip.frames || range(from, clip.count === undefined ? grid.length - from : clip.count);
  var out = [];

  for (var i = 0; i < indices.length; i++) {
    var rect = grid[indices[i]];
    if (!rect) throw new Error('[atlas] clip "' + name + '" 第 ' + indices[i] + ' 格超出 layout 范围');
    out.push(rect);
  }
  return out;
};

Atlas.prototype.count = function (name) {
  return this.rects(name).length;
};

// 单帧尺寸，用来算缩放
Atlas.prototype.size = function (name) {
  var r = this.rects(name)[0];
  return { w: r[2], h: r[3] };
};

// 取某一帧的静态 Bitmap
Atlas.prototype.bitmap = function (name, index, x, y) {
  var rect = this.rects(name)[index || 0];

  var bmp = new cax.Bitmap(this.image);
  bmp.rect = [rect[0], rect[1], rect[2], rect[3]];
  bmp.width = rect[2];
  bmp.height = rect[3];
  bmp.x = x || 0;
  bmp.y = y || 0;

  return bmp;
};

// 取一段动画，返回可直接 add 到舞台、自己循环播放的 Sprite
Atlas.prototype.sprite = function (name, x, y) {
  var clip = this.clip(name);
  var rects = this.rects(name);

  var frames = {};
  var order = [];
  for (var i = 0; i < rects.length; i++) {
    frames[String(i)] = rects[i];
    order.push(String(i));
  }

  var animations = {};
  animations[name] = { frames: order };

  var sprite = new cax.Sprite({
    imgs: [this.image],       // 直接给图片对象，不会重复下载
    frames: frames,
    animations: animations,
    framerate: clip.framerate || 12,
    currentAnimation: name,
    x: x || 0,
    y: y || 0
  });

  // 设了宽高才有 AABB，点击检测才有范围
  sprite.width = rects[0][2];
  sprite.height = rects[0][3];

  return sprite;
};


/* --------------------------------------------------------------------------
 * 小工具
 * ------------------------------------------------------------------------*/

function range(from, count) {
  var out = [];
  for (var i = 0; i < count; i++) out.push(from + i);
  return out;
}


module.exports = { load: load };
