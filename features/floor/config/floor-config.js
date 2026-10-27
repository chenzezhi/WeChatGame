/**
 * 地板配置（features/floor/config）
 * 业务可调参数集中在这里，改这里不用改逻辑代码。
 *
 * 地图数据有三套来源，优先级从高到低：
 *   1. mapFile    纯文本地图（assets/maps/xxx.txt）
 *   2. mapName    JS 地图（assets/maps/index.js 里注册的）
 *   3. pattern    都没有时按 tilePool 随机生成
 */
'use strict';

var TILESET = require('../../../assets/atlas/floor-tileset.js');
var MAPS = require('../../../assets/maps/index.js');

function clone(obj) {
  var out = {};
  for (var k in obj) out[k] = obj[k];
  return out;
}

var DEFAULTS = {
  tileset: TILESET,
  maps: MAPS,

  // ==================== 布局模式（只看格子摆在哪） ====================
  //   'grid'       正方形平铺（方块地砖）
  //   'staggered'  菱形交错铺（菱形贴图用这个）← 当前
  //   'iso'        等距投影（45° 斜向）
  layout: 'staggered',

  // ==================== 交错比例（仅 staggered 有效） ====================
  //   x：相邻行横向错开多少「格宽」的比例（0.5 = 半格）
  //   y：相邻行纵向走多少「格高」的比例（0.5 = 菱形标准值）
  //
  //   菱形偏扁  → y 调小（0.4 左右）
  //   菱形偏高  → y 调大（0.6 左右）
  stagger: { x: 0.5, y: 0.5 },

  // ==================== 地图整体形状（只看画不画某格） ====================
  //   'rect'     矩形，全部格子都画
  //   'diamond'  菱形，边界外的格子整块不画 → 四边留缺口 ← 你要的效果
  //
  // ⚠️ 这里只决定「画不画」，绝不修改贴图本身
  mapShape: 'diamond',

  // 菱形判定的容差：0 = 标准菱形；0.15 左右会让菱形胖一点、边角更满
  shapeTolerance: 0,

  // ==================== 背景 ====================
  // 纯色背景（没有背景图时铺这个）
  background: '#0d1117',

  // 背景图（可选）。填包内路径就加载，铺满屏幕（cover），再在上面画地板。
  // 菱形缺口处露出的就是它。例：'assets/bg/ground.png'
  backgroundImage: null,

  // ==================== ① 纯文本地图（推荐） ====================
  mapFile: 'assets/maps/level-1.txt',

  // ==================== ② JS 地图（备选） ====================
  mapName: null,

  // 单块原始尺寸，0 表示用 tileset 里的定义
  tileWidth: 0,
  tileHeight: 0,

  // 每块显示尺寸（逻辑像素）。0 = 保持原始大小，超出屏幕就滚动
  tileDisplaySize: 0,

  // ==================== ③ 随机生成时用 ====================
  tilePool: [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 2 },
    { row: 3, col: 3 }
  ],

  // 'random' | 'sequence' | 'checker' | 'single'
  pattern: 'random',

  seed: 20240101,

  // 格子数（仅随机生成模式有效）。0 = 按屏幕自适应
  grid: { columns: 0, rows: 0 },

  loadTimeout: 8000,

  // ==================== 滑动 ====================
  scroll: {
    enabled: true,
    inertia: true,
    friction: 0.92
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

  config.grid = mergeObject(DEFAULTS.grid, config.grid);
  config.scroll = mergeObject(DEFAULTS.scroll, config.scroll);
  config.stagger = mergeObject(DEFAULTS.stagger, config.stagger);

  if (!config.tileset.image) {
    var merged = {};
    for (key in TILESET) merged[key] = TILESET[key];
    for (key in config.tileset) merged[key] = config.tileset[key];
    config.tileset = merged;
  }

  return config;
}

module.exports = { create: create, DEFAULTS: DEFAULTS };
