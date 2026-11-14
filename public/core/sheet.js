'use strict';

/* ============================================================================
 *  sheet.js —— 大图切片（基于 cax，单文件、无依赖）
 * ============================================================================
 *
 *  【它干的事】
 *  一张大图里塞了很多小图，cax 本身只认识「整张图」。
 *  切片就是把大图上的一个个矩形记下来，用的时候只画其中一块。
 *
 *      new cax.Bitmap(url)        → 整张图（内部 rect = [0, 0, width, height]）
 *      bitmap.rect = [x, y, w, h] → 只画大图上的这一块
 *
 *  cax 渲染 Bitmap 时用的是：
 *      ctx.drawImage(img, rect[0], rect[1], rect[2], rect[3], 0, 0, rect[2], rect[3])
 *  所以改 rect 就是切片，图片本身不动、不复制、不重新解码。
 *
 *  本模块只做两件事：
 *      ① 用 cax 自带的 cax.Bitmap 把大图读进内存（自带缓存，同一个 url 不会下载第二次）
 *      ② 算出每一帧的矩形，需要时 new 一个共享同一张图的 Bitmap，改掉 rect
 *
 *  ---------------------------------------------------------------------------
 *  【两种切法】
 *
 *  1) 网格切（每格一样大，最常见）
 *        { cols: 4, rows: 4 }                 → 切出 16 帧，帧名 '0' '1' … '15'
 *        { frameWidth: 64, frameHeight: 64 }  → 按每格尺寸自动算行列
 *        margin / spacing                     → 大图留白 / 格子之间的缝隙
 *
 *  2) 手写坐标表（每块大小不一样时用）
 *        { frames: {
 *            rock: [0, 0, 64, 64],                    // [x, y, w, h]
 *            coin: { x: 64, y: 0, w: 32, h: 32 }      // 也可以写成 width / height
 *        } }
 *
 *  ---------------------------------------------------------------------------
 *  【坐标是「图片像素」，不是屏幕像素】
 *  这里的 x/y/w/h 都是大图内部的像素。
 *  屏幕适配（乘 scale、乘 dpr）由调用方自己处理，模块内部不碰 pixelRatio。
 *
 *  ---------------------------------------------------------------------------
 *  【调用示例】
 *
 *      var Sheet = require('./sheet.js');
 *
 *      Sheet.load({
 *          image: 'src/assets/roll.png',
 *          cols: 4, rows: 4,
 *          onLoad: function (sheet) {
 *              stage.add(sheet.bitmap('0'));                        // 取第 0 帧
 *              stage.add(sheet.sprite('spin', ['0','1','2','3'], 12)); // 循环动画
 *          },
 *          onError: function (err) { console.error(err.message); }
 *      });
 * ==========================================================================*/

// 引擎只有一份：这里 require 到的和 game.js 里是同一个 cax 实例
var cax = require('../../libs/cax.js');


/* ---------------------------------------------------------------------------
 * 一、加载 + 切帧
 * -------------------------------------------------------------------------*/

/**
 * 加载大图并切好帧，成功后回调出一个 Sheet 句柄。
 *
 * @param {Object} config
 * @param {string} config.image            大图路径（相对游戏根目录）
 * @param {number} [config.cols]           横向切几列
 * @param {number} [config.rows]           纵向切几行
 * @param {number} [config.frameWidth]     每格宽（给了就不用 cols）
 * @param {number} [config.frameHeight]    每格高（给了就不用 rows）
 * @param {number} [config.margin=0]       大图四周留白
 * @param {number} [config.spacing=0]      格子之间的缝隙
 * @param {number} [config.startFrame=0]   帧号起始值
 * @param {Object} [config.frames]         手写坐标表（给了就不走网格）
 * @param {Function} config.onLoad         function (sheet) {}
 * @param {Function} [config.onError]      function (err) {}，不传就打 console
 */
function load(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('[sheet] load() 需要配置对象');
  }
  if (!config.image) {
    throw new Error('[sheet] config.image 必填（大图路径）');
  }

  // 防止 onload / onerror 各回调一次
  var settled = false;

  // cax 自带的加载：内部走 wx.createImage()，成功后 this 就是这个 Bitmap
  // 同一个 url 第二次进来会命中 Bitmap.cache，同步回调，不会重复下载
  var bitmap = new cax.Bitmap(config.image, function () {
    if (settled) return;
    settled = true;
    finish(this.img);
  });

  // cax 的图片加载没有错误回调，这里补一个，否则路径写错时只会一片黑屏
  if (!settled && bitmap.img) {
    bitmap.img.onerror = function () {
      if (settled) return;
      settled = true;
      fail(new Error('[sheet] 图片加载失败：' + config.image));
    };
  }

  /**
   * 图片已经在内存里了，开始算帧表。
   *
   * @param {Image} image wx.createImage() 出来的图片对象
   */
  function finish(image) {
    if (!image || !image.width || !image.height) {
      fail(new Error('[sheet] 图片没有宽高，可能还没加载完：' + config.image));
      return;
    }

    var frames;
    try {
      frames = buildFrames(config, image.width, image.height);
    } catch (err) {
      fail(err);
      return;
    }

    var sheet = new Sheet(image, config.image, frames);

    console.log('[sheet] ' + config.image + ' ' + image.width + 'x' + image.height +
      ' → ' + sheet.names().length + ' 帧');

    if (config.onLoad) config.onLoad(sheet);
  }

  /**
   * 失败出口：有 onError 就交给调用方，没有就打到控制台。
   */
  function fail(err) {
    if (config.onError) {
      config.onError(err);
      return;
    }
    console.error(err.message);
  }
}


/* ---------------------------------------------------------------------------
 * 二、算帧表：{ 帧名: [x, y, w, h] }
 * -------------------------------------------------------------------------*/

/**
 * 根据配置和图片真实尺寸算出每一帧的矩形。
 *
 * @param {Object} config
 * @param {number} iw 大图宽（图片像素）
 * @param {number} ih 大图高（图片像素）
 * @returns {Object<string, Array<number>>}
 */
function buildFrames(config, iw, ih) {
  // 手写坐标表优先，大小不一的素材只能走这条路
  if (config.frames) return normalizeFrames(config.frames);

  var margin = config.margin || 0;
  var spacing = config.spacing || 0;
  var fw = config.frameWidth;
  var fh = config.frameHeight;
  var cols = config.cols;
  var rows = config.rows;

  // 只给了每格尺寸：先反推能放几行几列
  if (fw && fh && (!cols || !rows)) {
    cols = Math.floor((iw - margin * 2 + spacing) / (fw + spacing));
    rows = Math.floor((ih - margin * 2 + spacing) / (fh + spacing));
  }

  if (!cols || !rows) {
    throw new Error('[sheet] 需要 frames，或 cols+rows，或 frameWidth+frameHeight');
  }

  // 只给了行列数：反推每格尺寸
  if (!fw) fw = Math.floor((iw - margin * 2 - spacing * (cols - 1)) / cols);
  if (!fh) fh = Math.floor((ih - margin * 2 - spacing * (rows - 1)) / rows);

  if (fw <= 0 || fh <= 0) {
    throw new Error('[sheet] 算出来格子是 ' + fw + 'x' + fh +
      '，和图片 ' + iw + 'x' + ih + ' 对不上');
  }

  var start = config.startFrame || 0;
  var frames = {};
  var index = start;
  var r;
  var c;

  // 行优先编号：0 1 2 … 从左到右、从上到下
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      frames[String(index)] = [
        margin + c * (fw + spacing),
        margin + r * (fh + spacing),
        fw,
        fh
      ];
      index++;
    }
  }

  return frames;
}

/**
 * 把手写坐标表统一成 { 帧名: [x, y, w, h] }。
 *
 * 兼容三种写法：
 *      [[x,y,w,h], ...]                → 帧名是下标
 *      { 名字: [x,y,w,h] }
 *      { 名字: {x, y, w, h} } 或 {x, y, width, height}
 *
 * @param {Array|Object} input
 * @returns {Object<string, Array<number>>}
 */
function normalizeFrames(input) {
  var out = {};
  var i;

  if (Array.isArray(input)) {
    for (i = 0; i < input.length; i++) {
      var rect = readRect(input[i]);
      if (rect) out[String(i)] = rect;
    }
  } else {
    var names = Object.keys(input);
    for (i = 0; i < names.length; i++) {
      var value = readRect(input[names[i]]);
      if (value) out[names[i]] = value;
    }
  }

  if (Object.keys(out).length === 0) {
    throw new Error('[sheet] config.frames 里没有任何有效矩形');
  }

  return out;
}

/**
 * 从单个条目里读出一个矩形。
 *
 * @param {Array|Object} item
 * @returns {Array<number>|null}
 */
function readRect(item) {
  if (!item) return null;

  if (Array.isArray(item)) {
    return item.length >= 4 ? [item[0], item[1], item[2], item[3]] : null;
  }

  var w = item.w !== undefined ? item.w : item.width;
  var h = item.h !== undefined ? item.h : item.height;

  if (item.x === undefined || item.y === undefined || w === undefined || h === undefined) {
    return null;
  }

  return [item.x, item.y, w, h];
}


/* ---------------------------------------------------------------------------
 * 三、Sheet：加载成功后拿到的句柄
 * -------------------------------------------------------------------------*/

/**
 * @constructor
 * @param {Image} image  wx.createImage() 出来的原始图片，所有切片共享它
 * @param {string} url    图片路径，报错时用
 * @param {Object<string, Array<number>>} frames 帧表
 */
function Sheet(image, url, frames) {
  this.image = image;
  this.url = url;
  this.width = image.width;
  this.height = image.height;
  this.frames = frames;
}

/** 所有帧名，顺序和创建顺序一致 */
Sheet.prototype.names = function () {
  return Object.keys(this.frames);
};

/** 有没有这一帧 */
Sheet.prototype.has = function (name) {
  return this.frames[name] !== undefined;
};

/**
 * 取一帧的矩形，不存在就明确报错。
 *
 * @param {string|number} name
 * @returns {Array<number>}
 */
Sheet.prototype.rect = function (name) {
  var rect = this.frames[name];
  if (!rect) {
    throw new Error('[sheet] ' + this.url + ' 里没有帧 "' + name + '"');
  }
  return rect;
};

/**
 * 取一帧的尺寸，换来换去的那种场景很好用。
 *
 * @param {string|number} name
 * @returns {{x:number, y:number, w:number, h:number}}
 */
Sheet.prototype.size = function (name) {
  var rect = this.rect(name);
  return { x: rect[0], y: rect[1], w: rect[2], h: rect[3] };
};

/**
 * 取一帧，得到一个可以直接 add 到舞台上的 cax.Bitmap。
 *
 * 传的是图片对象而不是 url，所以这里不会触发下载，
 * 只是新建一个引用同一张图的 Bitmap 对象，内存开销可以忽略。
 *
 * @param {string|number} name 帧名
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @returns {cax.Bitmap}
 */
Sheet.prototype.bitmap = function (name, x, y) {
  var rect = this.rect(name);

  var bmp = new cax.Bitmap(this.image);

  // 关键一步：只画大图上的这一块
  bmp.rect = [rect[0], rect[1], rect[2], rect[3]];

  // width / height 用来做命中测试和布局，不设的话 AABB 是空的
  bmp.width = rect[2];
  bmp.height = rect[3];

  bmp.x = x || 0;
  bmp.y = y || 0;

  return bmp;
};

/**
 * 用 cax 自带的 Sprite 播帧动画（它会按 framerate 自动换 rect）。
 *
 * @param {string} animName         动画名，随便起，只在本 Sprite 内部用
 * @param {Array<string>} frameNames 按播放顺序排好的帧名
 * @param {number} [frameRate=12]   每秒多少帧
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @returns {cax.Sprite}
 */
Sheet.prototype.sprite = function (animName, frameNames, frameRate, x, y) {
  if (!frameNames || frameNames.length === 0) {
    throw new Error('[sheet] 动画 "' + animName + '" 没有任何帧');
  }

  // cax.Sprite 要的是 { 动画名: { frames: [帧名...] } } 这种结构
  var animations = {};
  animations[animName] = { frames: frameNames };

  return new cax.Sprite({
    imgs: [this.image],        // 直接给图片对象，Sprite 内部不会再下载
    frames: this.frames,       // 帧表：帧名 → [x, y, w, h]
    animations: animations,
    framerate: frameRate || 12,
    currentAnimation: animName,
    x: x || 0,
    y: y || 0
  });
};


/* ---------------------------------------------------------------------------
 * 四、导出
 * -------------------------------------------------------------------------*/

module.exports = {
  load: load
};
