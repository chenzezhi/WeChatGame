'use strict';

/* ==================== 功能 ====================
 * CocosAtlas —— 读 Cocos 打包出来的图集
 *
 * 一份 *.json（每个小图的位置和尺寸）+ 一张 *.png（大图），
 * 把它变成「名字 -> 小图」的映射，之后按名字直接取图。
 * 图块大小不一、位置乱塞，靠 json 记住每一块在哪。
 * ==============================================*/

/* ==================== 用法 ====================
 * var gameMap = require('./asset-manager.js').atlas('gameMap');
 *
 * gameMap.onReady(function () {
 *   stage.add(gameMap.columnSlotLightBg.bitmap(0, 0));  // 按名字取图并摆位置
 *   gameMap.columnSlotLightBg.rect;                     // [x, y, w, h]
 *   gameMap.names;                                      // 所有小图的名字
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 和 atlas.js 别混用：
 *   atlas.js   规整网格精灵图，产出会循环播放的动画 Sprite（给「动作」用）
 *   本模块      乱排的 Cocos 图集，按名字取静态 Bitmap（给「单张素材」用）
 *
 * 三层分工：asset-manager 传名称加载 → sprite-map 接 cax 舞台 → 使用方只碰 sprite-map。
 *
 * 图片是异步加载的，取图前必须等 onReady，否则报「图集还没加载完」。
 * ==============================================*/

var cax = require('../../libs/cax.js');
var texture = require('./texture.js');

// rotated 帧在 json 里的 rect 是「显示尺寸」还是「大图上的尺寸」。
// 本项目 gameMap.json 是前者：rect 宽高 == originalSize，大图上的区域宽高互换。
// 换一套图集如果切出来是横竖错位，把这个开关翻一下即可。
var ROTATED_RECT_IS_DISPLAY_SIZE = true;

// 烘焙旋转帧用的离屏画布最大宽度，单位 px
var BAKE_WIDTH = 1024;

// 已经读过的 json，路径 -> 解析后的数据
var jsonCache = {};


/* --------------------------------------------------------------------------
 * 对外入口
 * ------------------------------------------------------------------------ */

// 创建一张图集
// options - { image, jsonPath, json, autoLoad }
//   image    大图路径
//   jsonPath json 路径
//   json     直接传解析好的数据，给了就不再读文件
//   autoLoad 是否创建后立刻加载，默认 true
// 返回 AtlasMap 对象
function create(options) {
  var m = new AtlasMap(options || {});
  m._init();
  return m;
}

// 图集对象，内部保存帧表、名字列表、加载状态
// options - 同 create
function AtlasMap(options) {
  this.imagePath = options.image || '';       // 大图路径
  this.jsonPath = options.jsonPath || '';     // json 路径

  this.frames = {};      // 名字 -> 帧对象
  this.names = [];       // 所有名字，按 json 里的顺序
  this.image = null;     // 大图，加载完后才有
  this.ready = false;    // 是否加载完成
  this.error = null;     // 加载失败时的错误

  this._data = options.json || null;          // 直接传入的 json 数据
  this._readyCbs = [];                        // 等待加载成功的回调
  this._errorCbs = [];                        // 等待加载失败的回调
  this._loading = false;                      // 是否正在加载
  this._autoLoad = options.autoLoad !== false;
}

// 初始化：读 json → 建帧 → 建序号索引 → 开始加载
AtlasMap.prototype._init = function () {
  var data = this._data;

  // 没有直接给数据，就从 json 文件读
  if (!data && this.jsonPath) {
    try {
      data = readJson(this.jsonPath);
    } catch (err) {
      console.error('[atlas] 读 json 失败：' + err.message);
    }
  }

  var list = parseFrames(data);
  for (var i = 0; i < list.length; i++) this._addFrame(list[i]);

  // 建立「序号 → 名称」索引（从左到右、从上到下，最左上角是 1）
  this._buildIndex();

  if (this._autoLoad) this.load();
};


/* --------------------------------------------------------------------------
 * 序号索引：按「从左到右、从上到下」排出行优先顺序
 * ------------------------------------------------------------------------ */

// 建序号索引，让表格里可以直接写序号而不是名字
AtlasMap.prototype._buildIndex = function () {
  var entries = [];
  for (var i = 0; i < this.names.length; i++) {
    var name = this.names[i];
    var f = this.frames[name];
    entries.push({ name: name, x: f.x, y: f.y });
  }

  // 行优先：先从上到下（y 升序），同一行内从左到右（x 升序）
  entries.sort(function (a, b) {
    return (a.y - b.y) || (a.x - b.x);
  });

  this._index = entries;  // 1-based：this._index[序号 - 1]
};

// 序号 → 名称
// index - 从 1 开始的序号
// 返回该序号对应的名字，越界则抛错
AtlasMap.prototype._nameByIndex = function (index) {
  var e = this._index[index - 1];
  if (!e) {
    throw new Error('[atlas] 序号越界：' + index + '（共 ' + this._index.length + ' 张）');
  }
  return e.name;
};

// 判断这个 key 是「序号」还是「名字」
// key - 数字类型，或纯数字字符串（如 '1'）都算序号
function isIndexKey(key) {
  return typeof key === 'number' || (typeof key === 'string' && /^\d+$/.test(key));
}


/* --------------------------------------------------------------------------
 * 帧：一个小图 = 大图上的一块矩形
 * ------------------------------------------------------------------------ */

// 把一个 json 条目登记成一帧
// info - json 里的单条帧信息 { name, rect, originalSize, offset, rotated, capInsets }
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

    x: rect.x || 0,          // 在大图上的源矩形
    y: rect.y || 0,
    w: w,
    h: h,

    width: size.width || w,  // 未裁剪的原始尺寸
    height: size.height || h,
    offsetX: offset.x || 0,
    offsetY: offset.y || 0,

    rotated: !!info.rotated,          // json 里这块是否旋转存储
    baked: false,                     // 是否已经烘焙成不旋转的小图
    capInsets: info.capInsets || [0, 0, 0, 0],   // 九宫格边距

    image: null,             // 加载完后补上
    bitmap: frameBitmap      // 帧上直接取图：gameMap.名字.bitmap(x, y)
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

// 取这一帧的源矩形
// 返回 [x, y, w, h]，单位 px
function frameRect() {
  return [this.x, this.y, this.w, this.h];
}

// 帧上取图：等价于 gameMap.bitmap(name, x, y)
function frameBitmap(x, y) {
  return this.owner.bitmap(this.name, x, y);
}


/* --------------------------------------------------------------------------
 * 加载
 * ------------------------------------------------------------------------ */

// 加载大图
// onLoad - 成功回调，收到图集对象
// onError - 失败回调，收到 Error
AtlasMap.prototype.load = function (onLoad, onError) {
  if (onLoad) this.onReady(onLoad);
  if (onError) this.onError(onError);

  // 已经好了或正在加载，不重复发起
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

// 登记「加载成功」回调，已经加载好就立即执行
// cb - 回调函数，收到图集对象
AtlasMap.prototype.onReady = function (cb) {
  if (typeof cb !== 'function') return this;
  if (this.ready) cb(this);
  else this._readyCbs.push(cb);
  return this;
};

// 登记「加载失败」回调，已经失败就立即执行
// cb - 回调函数，收到 Error
AtlasMap.prototype.onError = function (cb) {
  if (typeof cb !== 'function') return this;
  if (this.error) cb(this.error);
  else this._errorCbs.push(cb);
  return this;
};

// 图片加载成功：烘焙旋转帧 → 补上大图 → 通知等待者
// t - texture 拿到的 { image, width, height }
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

// 图片加载失败：记下错误并通知等待者
// err - 错误对象
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

// 把所有旋转帧画成不旋转的图，替换掉原来的坐标
AtlasMap.prototype._bake = function () {
  var i, f;
  var need = [];    // 需要烘焙的帧

  for (i = 0; i < this.names.length; i++) {
    f = this.frames[this.names[i]];
    if (f.rotated && !f.baked) need.push(f);
  }

  // 没有旋转帧就不用建画布
  if (!need.length) return;

  var canvas = createCanvas();
  if (!canvas) {
    console.warn('[atlas] 没有可用的离屏画布，旋转的小图会画歪');
    return;
  }

  // 1. 先算位置：一行一行往右摆，超出宽度换行
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

    // 这一行放不下了，换到下一行
    if (px > 0 && px + dw > BAKE_WIDTH) {
      px = 0;
      py += rowH;
      rowH = 0;
    }

    f._dw = dw;   // 显示宽
    f._dh = dh;   // 显示高
    f._sw = sw;   // 源宽
    f._sh = sh;   // 源高
    f._bx = px;   // 烘焙后的左上角 x
    f._by = py;   // 烘焙后的左上角 y

    px += dw;
    if (dw > usedW) usedW = dw;
    if (px > usedW) usedW = px;
    if (dh > rowH) rowH = dh;
  }

  // 2. 按算出来的范围建画布
  canvas.width = usedW;
  canvas.height = py + rowH;

  var ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[atlas] 离屏画布没有 2d context，旋转的小图会画歪');
    return;
  }

  // 3. 逐个旋转画进去，再把帧改成烘焙后的坐标
  for (i = 0; i < need.length; i++) {
    f = need[i];

    ctx.save();
    ctx.translate(f._bx, f._by + f._dh);   // 移到这块的底部
    ctx.rotate(-Math.PI / 2);              // 逆时针转 90°，把躺着的图立起来
    ctx.drawImage(this.image, f.x, f.y, f._sw, f._sh, 0, 0, f._sw, f._sh);
    ctx.restore();

    f.x = f._bx;
    f.y = f._by;
    f.w = f._dw;
    f.h = f._dh;
    f.image = canvas;      // 这一帧改用离屏画布当图源
    f.baked = true;

    // 中间变量用完就删，保持帧对象干净
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

// 有没有这张小图
// name - 名字或序号
AtlasMap.prototype.has = function (name) {
  if (isIndexKey(name)) {
    var idx = Number(name);
    return idx >= 1 && idx <= this._index.length;
  }
  return !!this.frames[name];
};

// 取一帧
// name - 名字，或从 1 开始的序号（数字或纯数字字符串）
// 返回帧对象，找不到则抛错
AtlasMap.prototype.get = function (name) {
  // 序号先换成名字
  if (isIndexKey(name)) {
    name = this._nameByIndex(Number(name));
  }

  var f = this.frames[name];
  if (!f) throw new Error('[atlas] 没有叫 "' + name + '" 的小图（' + this.imagePath + '）');
  return f;
};

// 取一张小图的尺寸
// name - 名字或序号
// 返回 { w, h }，单位 px
AtlasMap.prototype.size = function (name) {
  var f = this.get(name);
  return { w: f.w, h: f.h };
};

// 取一张小图，返回可直接 add 到舞台的 Bitmap
// name - 名字或序号
// x, y - 左上角位置，默认 0
AtlasMap.prototype.bitmap = function (name, x, y) {
  var f = this.get(name);

  if (!f.image) {
    throw new Error('[atlas] 图集还没加载完，先 gameMap.onReady(...) 再取 "' + name + '"');
  }

  var bmp = new cax.Bitmap(f.image);
  bmp.rect = [f.x, f.y, f.w, f.h];   // 只显示大图里这一块
  bmp.width = f.w;
  bmp.height = f.h;
  bmp.x = x || 0;
  bmp.y = y || 0;

  return bmp;
};


/* --------------------------------------------------------------------------
 * json
 * ------------------------------------------------------------------------ */

// 读并解析 json，同一份只读一次
// path - json 路径
// 返回解析后的数据
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
// data - json 解析结果，兼容数组、{ frames: [...] }、{ 名字: {...} } 三种格式
// 返回帧信息数组
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
      if (!item.name) item.name = keys[i];   // 名字写在 key 上时补回来
      push(item);
    }
  }

  return out;

  // 只收有名字也有 rect 的条目
  function push(item) {
    if (!item || !item.name || !item.rect) return;
    out.push(item);
  }
}


/* --------------------------------------------------------------------------
 * 小工具
 * ------------------------------------------------------------------------ */

// 建一张离屏画布：小游戏用 wx，浏览器用 document
// 返回 canvas，都拿不到则返回 null
function createCanvas() {
  if (typeof wx !== 'undefined' && wx.createCanvas) return wx.createCanvas();
  if (typeof document !== 'undefined') return document.createElement('canvas');
  return null;
}

// 依次执行回调，某一个抛错不影响后面的
// cbs - 回调数组
// arg - 传给每个回调的参数
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
