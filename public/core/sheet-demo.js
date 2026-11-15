'use strict';

// atlas 用法示例：读一张大图，切出两段动画，原地循环播放，看每帧变化。

var Atlas = require('./atlas.js');
var CONFIG = require('../config/assets.js');

function start(env) {
  var cax = env.cax;
  var stage = env.stage;
  var dpr = wx.getSystemInfoSync().pixelRatio || 1;

  Atlas.load(CONFIG, function (atlas) {
    var w = stage.canvas.width;
    var h = stage.canvas.height;

    // 左：整身走动的循环动画，固定在原地播
    var hero = atlas.sprite('walk');
    hero.scale = (h * 0.3) / atlas.size('walk').h;
    hero.x = w * 0;
    hero.y = h * 0.45;
    stage.add(hero);

    // // 右：头像抖动，同样是原地循环
    // var head = atlas.sprite('head');
    // head.scale = (h * 0.3) / atlas.size('head').h;
    // head.x = w * 0.7 - (head.width * head.scale) / 2;
    // head.y = h * 0.45;
    // stage.add(head);

    }, function (err) {
    console.error('[demo] ' + err.message);
    stage.add(info(cax, err.message, '#ff6b6b', dpr));
  });
}

function info(cax, text, color, dpr, y) {
  var t = new cax.Text(text, { font: Math.round(13 * dpr) + 'px sans-serif', color: color });
  t.x = 12 * dpr;
  t.y = (y || 32) * dpr;
  return t;
}

module.exports = { start: start };
