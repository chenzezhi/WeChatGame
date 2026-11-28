'use strict';

/* ==================== 功能 ====================
 * Atlas —— 图集
 *
 * 一张大图 + 若干套切法（layouts）+ 若干段动画（clips）。
 * 图只读一次；「切片」只是记住大图上的矩形，不复制、不重新解码。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Atlas = require('./atlas.js');
 *
 * Atlas.load(CONFIG, function (atlas) {
 *   stage.add(atlas.sprite('walk', 100, 200));   // 自动循环播放的动画
 *   stage.add(atlas.bitmap('head', 0, 0, 0));    // 只要静态某一帧
 *   atlas.size('walk');                          // 单帧尺寸 { w, h }
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * layouts 里的每套切法至少要给「行列数」或「格子尺寸」中的一个，另一个会反推。
 * clips 里的 layout 必须是 layouts 里存在的 key，否则取帧时报错。
 * ==============================================*/

var cax = require('../../libs/cax.js');
var texture = require('./texture.js');


/* --------------------------------------------------------------------------
 * 加载：读图 → 每套 layout 算出格子 → 交给 Atlas
 * ------------------------------------------------------------------------*/

// 加载一张图集
// config - { image, layouts, clips }，见 config/assets.js
// onLoad - 成功回调，收到 Atlas 对象
// onError - 失败回调，收到 Error；不传则打日志
function load(config, onLoad, onError) {
  texture.load(config.image, function (t) {
    var layouts = {};   // layout 名 -> 该套切法算出的矩形数组

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

  // 统一处理失败：有回调交给调用方，没有就打日志
  function fail(err) {
    if (onError) onError(err);
    else console.error(err.message);
  }
}


/* --------------------------------------------------------------------------
 * 一套切法 → 一组矩形（行优先）
 *
 *   { cols: 4, rows: 4 }                 整张图均分
 *   { frameWidth: 64, frameHeight: 64 }  按格子尺寸排
 *   { frameWidth: 64, origin: [0, 256] } 从大图某处开始排（同一张图两种规格）
 *   margin / spacing                     四周留白 / 格子缝隙
 * ------------------------------------------------------------------------*/

// 把一套切法算成一组矩形
// width, height - 大图尺寸，单位 px
// spec - 切法配置：cols / rows / frameWidth / frameHeight / origin / margin / spacing
// 返回 [[x, y, w, h], ...]，按行优先排列
function cells(width, height, spec) {
  var spacing = spec.spacing || 0;
  var ox = spec.origin ? spec.origin[0] : (spec.margin || 0);   // 起始 x
  var oy = spec.origin ? spec.origin[1] : (spec.margin || 0);   // 起始 y
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

  // 逐行逐列算出每个格子的矩形
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

// 图集句柄
// t - texture.load 拿到的 { image, width, height }
// layouts - layout 名 -> 矩形数组
// clips - 动画名 -> 动画配置
function Atlas(t, layouts, clips) {
  this.image = t.image;     // 大图对象
  this.width = t.width;     // 大图宽，单位 px
  this.height = t.height;   // 大图高，单位 px
  this.layouts = layouts;   // 每套切法的矩形数组
  this.clips = clips;       // 每段动画的配置
}

// 取一段动画的配置
// name - 动画名
// 返回该动画的配置对象，不存在则抛错
Atlas.prototype.clip = function (name) {
  var clip = this.clips[name];
  if (!clip) throw new Error('[atlas] 没有 clip "' + name + '"');
  return clip;
};

// 一段动画用到的所有矩形
// name - 动画名
// 返回 [[x, y, w, h], ...]，按播放顺序
Atlas.prototype.rects = function (name) {
  var clip = this.clip(name);
  var grid = this.layouts[clip.layout];

  if (!grid) throw new Error('[atlas] clip "' + name + '" 的 layout "' + clip.layout + '" 不存在');

  var from = clip.from || 0;   // 从第几格开始取
  // 没写 frames 就按 from + count 连续取
  var indices = clip.frames || range(from, clip.count === undefined ? grid.length - from : clip.count);
  var out = [];

  for (var i = 0; i < indices.length; i++) {
    var rect = grid[indices[i]];
    if (!rect) throw new Error('[atlas] clip "' + name + '" 第 ' + indices[i] + ' 格超出 layout 范围');
    out.push(rect);
  }
  return out;
};

// 一段动画有几帧
// name - 动画名
Atlas.prototype.count = function (name) {
  return this.rects(name).length;
};

// 单帧尺寸，用来算缩放
// name - 动画名
// 返回 { w, h }，单位 px
Atlas.prototype.size = function (name) {
  var r = this.rects(name)[0];
  return { w: r[2], h: r[3] };
};

// 取某一帧的静态 Bitmap
// name - 动画名
// index - 第几帧，默认 0
// x, y - 左上角位置，默认 0
Atlas.prototype.bitmap = function (name, index, x, y) {
  var rect = this.rects(name)[index || 0];

  var bmp = new cax.Bitmap(this.image);
  bmp.rect = [rect[0], rect[1], rect[2], rect[3]];   // 只显示大图里这一块
  bmp.width = rect[2];
  bmp.height = rect[3];
  bmp.x = x || 0;
  bmp.y = y || 0;

  return bmp;
};

// 取一段动画，返回可直接 add 到舞台、自己循环播放的 Sprite
// name - 动画名
// x, y - 左上角位置，默认 0
Atlas.prototype.sprite = function (name, x, y) {
  var clip = this.clip(name);
  var rects = this.rects(name);

  // 把每一帧的矩形按序号排成 frames
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

// 生成一段连续数字
// from - 起始值
// count - 个数
// 返回 [from, from+1, ...]
function range(from, count) {
  var out = [];
  for (var i = 0; i < count; i++) out.push(from + i);
  return out;
}


module.exports = { load: load };
