'use strict';

/* ============================================================================
 * 渲染连接器：把「图集数据」接到 cax 舞台
 *
 * 数据层（src/assets/gameMap.js）只管图片和切分信息，不关心怎么画；
 * 这里负责把数据变成 cax 能渲染的对象，并提供最简单的取图/挂舞台 API。
 *
 *   var spriteMap = require('./sprite-map.js');
 *   var gameMap   = require('../../src/assets/gameMap.js');  // 数据，require 即加载
 *
 *   var sm = spriteMap.of(gameMap);
 *   sm.ready(function () {              // 图片异步加载，必须先等这个
 *     sm.add(stage, 'dragonQuestBg2', 0, 0);   // 取图 + 挂到舞台
 *     var bmp = sm.bitmap('hpBar', 10, 20);    // 只取图，自己决定挂不挂
 *     stage.add(bmp);
 *   });
 * ==========================================================================*/

// 把一个图集数据对象包装成渲染连接器
function of(atlasMap) {
  return new SpriteMap(atlasMap);
}

function SpriteMap(atlasMap) {
  this.map = atlasMap;
}

// 等图集加载完成（图片是异步加载的，取图前必须等这个）
SpriteMap.prototype.ready = function (cb) {
  this.map.onReady(cb);
  return this;
};

// 只取一张小图，返回 cax.Bitmap，不挂舞台
SpriteMap.prototype.bitmap = function (name, x, y) {
  return this.map.bitmap(name, x, y);
};

// 取一张小图并直接挂到舞台，返回 bitmap 方便继续调位置/缩放
SpriteMap.prototype.add = function (stage, name, x, y) {
  var bmp = this.map.bitmap(name, x, y);
  stage.add(bmp);
  return bmp;
};

// 批量挂舞台：{ 'dragonQuestBg2': [0, 0], 'hpBar': [10, 20] }
SpriteMap.prototype.addAll = function (stage, spec) {
  var names = Object.keys(spec || {});
  var out = {};
  for (var i = 0; i < names.length; i++) {
    var pos = spec[names[i]];
    out[names[i]] = this.add(stage, names[i], pos[0], pos[1]);
  }
  return out;
};

// 取一张小图的原始尺寸 { w, h }
SpriteMap.prototype.size = function (name) {
  return this.map.size(name);
};

module.exports = { of: of };
