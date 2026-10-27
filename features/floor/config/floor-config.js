/**
 * 地板配置（features/floor/config）
 * 业务可调参数集中在这里，改这里不用改逻辑代码。
 *
 * 地图数据有两套来源，优先级从上到下：
 *   1. mapFile    纯文本地图（assets/maps/xxx.txt），直接写索引，最直观
 *   2. mapName    JS 地图（assets/maps/index.js 里注册的）
 *   3. pattern    都没有时按 tilePool 随机生成
 */
'use strict';

// 静态 require：小游戏编译期需要能静态分析到资源。
// ⚠️ 只能 require .js，require .json 会让小游戏启动即崩（卡在启动页）。
var TILESET = require('../../../assets/atlas/floor-tileset.js');
var MAPS = require('../../../assets/maps/index.js');

function clone(obj) {
  var out = {};
  for (var k in obj) out[k] = obj[k];
  return out;
}

var DEFAULTS = {
  // 位图大图描述（见 assets/atlas/floor-tileset.js）
  tileset: TILESET,

  // JS 地图清单（assets/maps/index.js）
  maps: MAPS,

  // ==================== ① 纯文本地图（推荐） ====================
  // 直接写索引的 .txt，运行时读进内存解析。
  // 格式：一行 = 地图一行，数字 = 大图扁平索引，空格/Tab/逗号分隔
  //   17 20 17 20
  //   2 6 7 2
  // 空格子写 . 或 -1；# 开头整行是注释。
  // 填 null 则不使用文本地图。
  mapFile: 'assets/maps/level-1.txt',

  // ==================== ② JS 地图（备选） ====================
  // 填了就用 assets/maps/index.js 里注册的那张图
  mapName: null,

  // 单块原始尺寸，0 表示用 tileset 里的定义
  tileWidth: 0,
  tileHeight: 0,

  // 每块在屏幕上的「显示尺寸」（像素）。0 = 自动（按屏幕宽度铺满）
  // 地形要更粗糙就调大，要更细腻就调小
  tileDisplaySize: 0,

  // ==================== ③ 随机生成时用 ====================
  // 从大图里挑「第几行第几列」的那几块来铺，只在池子里选，不会跑到别的块上。
  //
  // 支持四种写法（可混用）：
  //   { row: 2, col: 1 }   第 2 行第 1 列（行列都从 0 开始）
  //   [2, 1]               简写，注意顺序是 [行, 列]
  //   17                   扁平索引（从左上角往右数）
  //   'floor_0'            tileset.tiles 里起的名字
  tilePool: [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 2 },
    { row: 3, col: 3 }
  ],

  // 池子里怎么选：
  //   'random'   随机（同一个种子结果固定）
  //   'sequence' 按顺序循环（行优先）
  //   'checker'  棋盘交替
  //   'single'   只用池子第一个
  pattern: 'random',

  // 随机种子，固定种子保证每次进入地板花纹一致；换个数字就是另一套花纹
  seed: 20240101,

  // 格子数。0 = 按屏幕自适应
  // 用地图文件（文本或 JS）时这里的值会被忽略
  grid: { columns: 0, rows: 0 },

  background: '#0d1117',

  // 贴图加载超时（毫秒），超时就先用纯色地板进游戏
  loadTimeout: 8000,

  // ==================== 滑动 ====================
  scroll: {
    enabled: true,   // 总开关
    inertia: true,   // 松手后是否惯性滑动
    friction: 0.92   // 惯性衰减（越小停得越快，0.85 ~ 0.96）
  }
};

function mergeObject(base, overrides) {
  var out = clone(base);
  if (overrides && typeof overrides === 'object') {
    for (var k in overrides) {
      if (typeof overrides[k] !== 'undefined' && overrides[k] !== null) out[k] = overrides[k];
    }
  }
  return out;
}

function create(overrides) {
  overrides = overrides || {};
  var config = {};
  var key;

  for (key in DEFAULTS) config[key] = DEFAULTS[key];
  for (key in overrides) {
    if (typeof overrides[key] !== 'undefined' && overrides[key] !== null) {
      config[key] = overrides[key];
    }
  }

  if (!config.tileset) config.tileset = TILESET;
  if (!config.maps) config.maps = MAPS;

  // 嵌套对象要深拷贝，避免多个实例共用同一个 grid/scroll 被互相改掉
  config.grid = mergeObject(DEFAULTS.grid, config.grid);
  config.scroll = mergeObject(DEFAULTS.scroll, config.scroll);

  // 防止只写了半截 tileset（例如只写 tileWidth）导致 image 丢失
  if (!config.tileset.image) {
    var merged = {};
    for (key in TILESET) merged[key] = TILESET[key];
    for (key in config.tileset) merged[key] = config.tileset[key];
    config.tileset = merged;
  }

  return config;
}

module.exports = { create: create, DEFAULTS: DEFAULTS };
