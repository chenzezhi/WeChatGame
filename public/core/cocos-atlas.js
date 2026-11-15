'use strict';

/* --------------------------------------------------------------------------
 * Cocos 图集小引擎：一份 *.json（小图信息） + 一张 *.png（大图）
 *
 * json 是 Cocos 导出的数组，每一项形如
 *   [ [ { name, rect:{x,y,width,height}, offset, originalSize, rotated, capInsets } ], [0], 0, ... ]
 * 本模块把它变成「名字 -> 小图」的映射，顺带把大图读进内存。
 *
 *   var gameMap = require('../../src/assets/gameMap.js');
 *
 *   gameMap.onReady(function () {
 *     stage.add(gameMap.columnSlotLightBg.bitmap(0, 0)); // 按名字直接拿图
 *     console.log(gameMap.columnSlotLightBg.rect);       // [x, y, w, h]
 *     console.log(gameMap.names);                        // 所有小图的名字
 *   });
 *
 * 换一套图集只要再写一行 js：
 *   module.exports = require('../../public/core/cocos-atlas.js').create({
 *     image: 'src/assets/xxx.png',
 *     jsonPath: 'src/assets/xxx.json'
 *   });
 * ------------------------------------------------------------------------ */

var cax = require('../../libs/cax.js');
var texture = require('./texture.js');

// rotated 帧在 json 里的 rect 到底是「显示尺寸」还是「大图上的尺寸」。
// 本项目的 gameMap.json 是前者：rect 宽高 == originalSize，大图上的区域宽高互换。
// 如果将来某套图集切出来是横的/竖的错位，把这个开关翻一下即可。
var ROTATED_RECT_IS_DISPLAY_SIZE = true;

// 烘焙旋转帧用的画布最大宽度
var BAKE_WIDTH = 1024;

// 同一份 json 只读一次
var jsonCache = {};


/* --------------------------------------------------------------------------
 * 对外入口
 * ------------------------------------------------------------------------ */

function create(options) {
  var m = new AtlasMap(options || {});
  m._init();
  return m;
}

function AtlasMap(options) {
  this.imagePath = options.image || '';
  this.jsonPath = options.jsonPath || '';

  this.frames = {};      // 名字 -> 帧对象
  this.names = [];       // 所有名字，按 json 里的顺序
  this.image = null;     // 大图（加载完后才有）
  this.ready = false;
  this.error = null;

  this._data = options.json || null;
  this._readyCbs = [];
  this._errorCbs = [];
  this._loading = false;
  this._autoLoad = options.autoLoad !== false;
}

AtlasMap.prototype._init = function () {
  var data = this._data;

  if (!data && this.jsonPath) {
    try {
      data = readJson(this.jsonPath);
    } catch (err) {
      console.error('[atlas] 读 json 失败：' + err.message);
    }
  }

  var list = parseFrames(data);
  for (var i = 0; i < list.length; i++) this._addFrame(list[i]);

  if (this._autoLoad) this.load();
};


/* --------------------------------------------------------------------------
 * 帧：一个小图 = 大图上的一块矩形
 * ------------------------------------------------------------------------ */

AtlasMap.prototype._addFrame = function (info) {
  var rect = info.rect || {};
  var size = info.originalSize || {};
  var offset = info.offset || { x: 0, y: 0 };

  var w = rect.width || size.width || 0;
  var h = rect.height || size.height || 0;

  var self = this;
  var f = {
    name: info.name,
    owner: this,

    x: rect.x || 0,          // 在所在图片上的源矩形
    y: rect.y || 0,
    w: w,
    h: h,

    width: size.width || w,  // 未裁剪的原始尺寸
    height: size.height || h,
    offsetX: offset.x || 0,
    offsetY: offset.y || 0,

    rotated: !!info.rotated,
    baked: false,            // 是否已被烘焙成不旋转的小图
    capInsets: info.capInsets || [0, 0, 0, 0],

    image: null,             // 加载完后补上
    bitmap: frameBitmap
  };

  Object.defineProperty(f, 'rect', { get: frameRect, configurable: true });

  this.frames[f.name] = f;
  this.names.push(f.name);

  // 让 gameMap.columnSlotLightBg 直接就是这个帧
  if (!(f.name in this)) {
    Object.defineProperty(this, f.name, {
      get: function () { return self.frames[f.name]; },
      configurable: true
    });
  }
};

function frameRect() {
  return [this.x, this.y, this.w, this.h];
}

function frameBitmap(x, y) {
  return this.owner.bitmap(this.name, x, y);
}


/* --------------------------------------------------------------------------
 * 加载
 * ------------------------------------------------------------------------ */

AtlasMap.prototype.load = function (onLoad, onError) {
  if (onLoad) this.onReady(onLoad);
  if (onError) this.onError(onError);

  if (this.ready || this._loading) return this;

  this._loading = true;
  var self = this;

  texture.load(this.imagePath, function (t) {
    self._onImage(t);
  }, function (err) {
    self._onFail(err);
  });

  return this;
};

AtlasMap.prototype.onReady = function (cb) {
  if (typeof cb !== 'function') return this;
  if (this.ready) cb(this);
  else this._readyCbs.push(cb);
  return this;
};

AtlasMap.prototype.onError = function (cb) {
  if (typeof cb !== 'function') return this;
  if (this.error) cb(this.error);
  else this._errorCbs.push(cb);
  return this;
};

AtlasMap.prototype._onImage = function (t) {
  this.image = t.image;
  this.imageWidth = t.width;
  this.imageHeight = t.height;

  try {
    this._bake();
  } catch (err) {
    console.error('[atlas] 烘焙失败：' + err.message);
  }

  // 没烘焙的帧直接用大图
  for (var i = 0; i < this.names.length; i++) {
    var f = this.frames[this.names[i]];
    if (!f.image) f.image = this.image;
  }

  this.ready = true;
  this._loading = false;

  var cbs = this._readyCbs;
  this._readyCbs = [];
  fire(cbs, this);
};

AtlasMap.prototype._onFail = function (err) {
  this.error = err || new Error('图集加载失败：' + this.imagePath);
  this._loading = false;

  var cbs = this._errorCbs;
  this._errorCbs = [];
  fire(cbs, this.error);
};


/* --------------------------------------------------------------------------
 * 旋转帧烘焙
 *
 * 大图里 rotated 的小图是躺着存的，直接 drawImage 出来会歪。
 * 这里把它们一次性画到一张离屏画布上，画的时候转回来，
 * 之后每个帧的 rect 就都是正的，取图的人完全不用管旋转。
 * ------------------------------------------------------------------------ */

AtlasMap.prototype._bake = function () {
  var i, f;
  var need = [];

  for (i = 0; i < this.names.length; i++) {
    f = this.frames[this.names[i]];
    if (f.rotated && !f.baked) need.push(f);
  }

  if (!need.length) return;

  var canvas = createCanvas();
  if (!canvas) {
    console.warn('[atlas] 没有可用的离屏画布，旋转的小图会画歪');
    return;
  }

  // 1. 先算位置：一行一行往右摆
  var px = 0;
  var py = 0;
  var rowH = 0;
  var usedW = 1;
  var dw, dh, sw, sh;

  for (i = 0; i < need.length; i++) {
    f = need[i];

    if (ROTATED_RECT_IS_DISPLAY_SIZE) {
      dw = f.w; dh = f.h;   // 显示尺寸
      sw = f.h; sh = f.w;   // 大图上的区域：宽高互换
    } else {
      dw = f.h; dh = f.w;
      sw = f.w; sh = f.h;
    }

    if (px > 0 && px + dw > BAKE_WIDTH) {
      px = 0;
      py += rowH;
      rowH = 0;
    }

    f._dw = dw;
    f._dh = dh;
    f._sw = sw;
    f._sh = sh;
    f._bx = px;
    f._by = py;

    px += dw;
    if (dw > usedW) usedW = dw;
    if (px > usedW) usedW = px;
    if (dh > rowH) rowH = dh;
  }

  // 2. 建画布
  canvas.width = usedW;
  canvas.height = py + rowH;

  var ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[atlas] 离屏画布没有 2d context，旋转的小图会画歪');
    return;
  }

  // 3. 旋转画进去
  for (i = 0; i < need.length; i++) {
    f = need[i];

    ctx.save();
    ctx.translate(f._bx, f._by + f._dh);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(this.image, f.x, f.y, f._sw, f._sh, 0, 0, f._sw, f._sh);
    ctx.restore();

    f.x = f._bx;
    f.y = f._by;
    f.w = f._dw;
    f.h = f._dh;
    f.image = canvas;
    f.baked = true;

    delete f._bx;
    delete f._by;
    delete f._dw;
    delete f._dh;
    delete f._sw;
    delete f._sh;
  }
};


/* --------------------------------------------------------------------------
 * 取图
 * ------------------------------------------------------------------------ */

AtlasMap.prototype.has = function (name) {
  return !!this.frames[name];
};

AtlasMap.prototype.get = function (name) {
  var f = this.frames[name];
  if (!f) throw new Error('[atlas] 没有叫 "' + name + '" 的小图（' + this.imagePath + '）');
  return f;
};

AtlasMap.prototype.size = function (name) {
  var f = this.get(name);
  return { w: f.w, h: f.h };
};

// 取一张小图，返回可直接 add 到舞台的 Bitmap
AtlasMap.prototype.bitmap = function (name, x, y) {
  var f = this.get(name);

  if (!f.image) {
    throw new Error('[atlas] 图集还没加载完，先 gameMap.onReady(...) 再取 "' + name + '"');
  }

  var bmp = new cax.Bitmap(f.image);
  bmp.rect = [f.x, f.y, f.w, f.h];
  bmp.width = f.w;
  bmp.height = f.h;
  bmp.x = x || 0;
  bmp.y = y || 0;

  return bmp;
};


/* --------------------------------------------------------------------------
 * json
 * ------------------------------------------------------------------------ */

function readJson(path) {
  if (jsonCache[path]) return jsonCache[path];

  if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
    throw new Error('当前环境读不了包内文件：' + path);
  }

  var fs = wx.getFileSystemManager();
  var text = fs.readFileSync(path, 'utf8');
  var data = JSON.parse(text);

  jsonCache[path] = data;
  return data;
}

// 把 Cocos 的数组结构拆成扁平的帧列表
function parseFrames(data) {
  var out = [];
  var i, j;

  if (!data) return out;

  if (Array.isArray(data)) {
    for (i = 0; i < data.length; i++) {
      var entry = data[i];
      if (!entry) continue;

      // 正常格式：entry[0] 是帧信息数组
      var group = entry[0];
      if (Array.isArray(group)) {
        for (j = 0; j < group.length; j++) push(group[j]);
      } else {
        push(group);
      }

      // 兼容扁平格式
      if (entry.name) push(entry);
    }
    return out;
  }

  // 兼容 { frames: [...] } 和 { name: {...} }
  var list = data.frames || data;

  if (Array.isArray(list)) {
    for (i = 0; i < list.length; i++) push(list[i]);
    return out;
  }

  if (typeof list === 'object') {
    var keys = Object.keys(list);
    for (i = 0; i < keys.length; i++) {
      var item = list[keys[i]];
      if (!item) continue;
      if (!item.name) item.name = keys[i];
      push(item);
    }
  }

  return out;

  function push(item) {
    if (!item || !item.name || !item.rect) return;
    out.push(item);
  }
}


/* --------------------------------------------------------------------------
 * 小工具
 * ------------------------------------------------------------------------ */

function createCanvas() {
  if (typeof wx !== 'undefined' && wx.createCanvas) return wx.createCanvas();
  if (typeof document !== 'undefined') return document.createElement('canvas');
  return null;
}

function fire(cbs, arg) {
  for (var i = 0; i < cbs.length; i++) {
    try {
      cbs[i](arg);
    } catch (err) {
      console.error(err);
    }
  }
}


module.exports = { create: create };
