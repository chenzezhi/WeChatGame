'use strict';

// gameMap 图集【数据层】：只描述这张大图（图片 + json），require 一下即加载完成。
// 想用某张大图，require 这一个模块就够了；取图/渲染交给 sprite-map（渲染层）。
//
//   var gameMap = require('../assets/gameMap.js');                        // 数据，require 即加载
//   var sm = require('../../public/core/sprite-map.js').of(gameMap);      // 接渲染
//
//   sm.ready(function () {
//     sm.add(stage, 'columnSlotLightBg', 0, 0);          // 取图 + 挂舞台
//     console.log(gameMap.names);                        // 所有小图名字
//     console.log(gameMap.columnSlotLightBg.rect);       // [x, y, w, h]
//   });

module.exports = require('../../public/core/cocos-atlas.js').create({
  image: 'src/assets/gameMap.png',
  jsonPath: 'src/assets/gameMap.json'
});
