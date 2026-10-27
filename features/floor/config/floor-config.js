/**
 * 地板配置（features/floor/config）
 * 业务可调参数集中在这里，改这里不用改逻辑代码。
 */
'use strict';

// 静态 require：小游戏编译期需要能静态分析到资源。
// ⚠️ 只能 require .js，require .json 会让小游戏启动即崩（卡在启动页）。
var TILESET = require('../../../assets/atlas/floor-tileset.js');

var DEFAULTS = {
  // 位图大图描述（见 assets/atlas/floor-tileset.js）
  tileset: TILESET,

  // 单块尺寸，0 表示用 tileset 里的定义
  tileWidth: 0,
  tileHeight: 0,

  // 铺地板方式：'random' | 'checker' | 'single'
  pattern: 'random',

  // 用大图里的哪几块来铺（索引从 0 开始，左上角第一块是 0）
  tilePool: [0, 1, 2, 3],

  // 随机种子，固定种子保证每次进入地板一致
  seed: 20240101,

  // 地板格数，0 表示按屏幕自适应铺满
  grid: { columns: 0, rows: 0 },

  originX: 0,
  originY: 0,

  background: '#0d1117',

  // 贴图加载超时（毫秒），超时就先用纯色地板进游戏
  loadTimeout: 8000
};

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
  if (!config.grid) config.grid = { columns: 0, rows: 0 };

  // 防止外部传入半截 tileset（例如只写了 tileWidth）导致 image 丢失
  if (!config.tileset.image) {
    var merged = {};
    for (key in TILESET) merged[key] = TILESET[key];
    for (key in config.tileset) merged[key] = config.tileset[key];
    config.tileset = merged;
  }

  return config;
}

module.exports = { create: create, DEFAULTS: DEFAULTS };
