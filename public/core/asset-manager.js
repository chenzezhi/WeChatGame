'use strict';

/* ==================== 功能 ====================
 * AssetManager —— 素材 / 图集管理器
 *
 * 按「名称」取一张合图，自动拼出图片路径和 json 路径，并保证同一张只加载一次。
 * 命名协议默认在 public/config/rules/atlas.js：
 *   图片 = {baseDir}{名称}.{png|jpg|jpeg|webp}   按 imageExtensions 顺序探测
 *   数据 = {baseDir}{名称}.json                  固定 json
 * ==============================================*/

/* ==================== 用法 ====================
 * const assets = require('./asset-manager.js');
 *
 * const gameMap = assets.atlas('gameMap');              // 自动找 gameMap.png + gameMap.json
 * assets.preload(['gameMap', 'ui']);                     // 一次预加载多张
 * assets.atlas('gameMap', { imageExt: 'jpg' });          // 临时指定格式
 * assets.atlas('gameMap', { image: 'a.png', json: 'b.json' });  // 完全自定义路径
 * ==============================================*/

/* ==================== 注意 ====================
 * 缓存键按「名称 + 格式」算，同一个名称用不同格式会各自加载一份。
 * 探测不到文件系统时（非小游戏环境），直接用默认扩展名。
 * ==============================================*/

var cocosAtlas = require('./cocos-atlas.js');
var rules = require('../config/rules/atlas.js');

// 已加载的合图，缓存键 -> AtlasMap
var cache = {};

// 取一张合图（图集），同一个名称只创建一次
// name - 素材名称，对应 {baseDir} 下的图片与 json 文件名
// options - 可选，临时覆盖规则：{ image, json, imageExt }
// 返回 cocos-atlas 创建的图集对象
function atlas(name, options) {
  var opt = options || {};

  // 完全自定义图片路径时用图片路径当缓存键，否则按「名称#格式」
  var key = opt.image || (name + '#' + (opt.imageExt || 'auto'));
  if (cache[key]) return cache[key];

  var image = opt.image || findImage(name, opt.imageExt);
  var jsonPath = opt.json || (rules.baseDir + name + '.' + rules.dataExtension);

  var map = cocosAtlas.create({ image: image, jsonPath: jsonPath });
  cache[key] = map;
  return map;
}

// 预加载多张合图，只创建不等待（渲染前由各自的 ready 等待）
// names - 名称数组
function preload(names) {
  for (var i = 0; i < names.length; i++) atlas(names[i]);
}

// 找出这张合图实际用哪个扩展名，返回完整图片路径
// name - 素材名称
// imageExt - 指定扩展名（如 'jpg'），不传则按规则顺序探测
// 返回图片路径
function findImage(name, imageExt) {
  // 指定了扩展名就直接用，不用探测
  if (imageExt) return rules.baseDir + name + '.' + imageExt;

  var fs;
  try { fs = wx.getFileSystemManager(); } catch (e) { fs = null; }

  // 探测不了文件系统，退回默认格式
  if (!fs) return rules.baseDir + name + '.' + rules.defaultImageExt;

  // 按规则里的顺序逐个试，第一个存在的就用它
  var list = rules.imageExtensions;
  for (var i = 0; i < list.length; i++) {
    var p = rules.baseDir + name + '.' + list[i];
    try {
      fs.accessSync(p);
      return p;
    } catch (e) {
      // 这个扩展名不存在，试下一个
    }
  }

  // 一个都不存在，退回默认格式，让加载失败时走 onError 报出来
  return rules.baseDir + name + '.' + rules.defaultImageExt;
}

module.exports = { atlas: atlas, preload: preload, rules: rules };
