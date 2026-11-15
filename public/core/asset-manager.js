'use strict';

/* ============================================================================
 * 素材 / 图集管理器
 *
 * 以前每加一张合图都要建一个 js 文件（gameMap.js），内容无非是调一次
 * cocos-atlas.create(...)。现在把这个步骤抽掉：想用哪张合图，传「名称」即可。
 *
 * 协议（默认规则在 public/config/rules/atlas.js）：
 *   合图图片 = {baseDir}{名称}.{png|jpg|jpeg|webp}   // 按 imageExtensions 顺序探测
 *   合图数据 = {baseDir}{名称}.json                   // 固定 json
 *
 *   var assets = require('./asset-manager.js');
 *   var gameMap = assets.atlas('gameMap');   // 自动加载 gameMap.png + gameMap.json
 *
 * 同一名称只加载一次（缓存）；调用时可临时覆盖规则：
 *   assets.atlas('gameMap', { imageExt: 'jpg' })
 *   assets.atlas('gameMap', { image: 'a.png', json: 'b.json' })
 * ==========================================================================*/

var cocosAtlas = require('./cocos-atlas.js');
var rules = require('../config/rules/atlas.js');

var cache = {}; // 缓存键 -> AtlasMap

// 取一张合图（图集）。name = 素材名称，options 可临时覆盖协议规则。
function atlas(name, options) {
  var opt = options || {};

  // 完全自定义图片路径时，用图片路径当缓存键；否则按「名称#格式」缓存
  var key = opt.image || (name + '#' + (opt.imageExt || 'auto'));
  if (cache[key]) return cache[key];

  var image = opt.image || findImage(name, opt.imageExt);
  var jsonPath = opt.json || (rules.baseDir + name + '.' + rules.dataExtension);

  var map = cocosAtlas.create({ image: image, jsonPath: jsonPath });
  cache[key] = map;
  return map;
}

// 预加载多张：assets.preload(['gameMap', 'ui'])
function preload(names) {
  for (var i = 0; i < names.length; i++) atlas(names[i]);
}

// 按 imageExtensions 顺序探测哪张图片真的存在。
// 指定了 imageExt 就直接用它；否则从第一个格式开始一个个试。
function findImage(name, imageExt) {
  if (imageExt) return rules.baseDir + name + '.' + imageExt;

  var fs;
  try { fs = wx.getFileSystemManager(); } catch (e) { fs = null; }

  // 探测不了文件系统，直接退回默认格式
  if (!fs) return rules.baseDir + name + '.' + rules.defaultImageExt;

  var list = rules.imageExtensions;
  for (var i = 0; i < list.length; i++) {
    var p = rules.baseDir + name + '.' + list[i];
    try {
      fs.accessSync(p);
      return p; // 这张存在，用它
    } catch (e) {
      // 不存在，试下一个扩展名
    }
  }

  // 都没找到，退回默认格式，让加载失败时走 onError 报出来
  return rules.baseDir + name + '.' + rules.defaultImageExt;
}

module.exports = { atlas: atlas, preload: preload, rules: rules };
