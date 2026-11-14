'use strict';

// atlas 用法示例：读一张大图，按配置切出两段动画，让角色走起来、头像抖起来。

var Atlas = require('./atlas.js');
var CONFIG = require('../config/assets.js');

function start(env) {
  var cax = env.cax;
  var stage = env.stage;
  var dpr = wx.getSystemInfoSync().pixelRatio || 1;

  Atlas.load(CONFIG, function (atlas) {
    var w = stage.canvas.width;
    var h = stage.canvas.height;

    // 整身动画：占屏幕高度的 1/4，从左边走到右边，循环
    var heroSize = atlas.size('walk');
    var heroScale = (h * 0.25) / heroSize.h;
    var heroW = heroSize.w * heroScale;

    var hero = atlas.sprite('walk');
    hero.scale = heroScale;
    hero.y = h * 0.62;
    stage.add(hero);

    var born = Date.now();
    cax.tick(function () {
      var k = ((Date.now() - born) / 4000) % 1;
      hero.x = -heroW + k * (w + heroW);
    });

    // 头像动画：固定在上方，自己循环抖动
    var headSize = atlas.size('head');
    var headScale = (h * 0.18) / headSize.h;

    var head = atlas.sprite('head');
    head.scale = headScale;
    head.x = w / 2 - (headSize.w * headScale) / 2;
    head.y = h * 0.12;
    stage.add(head);

    // 静态取某一帧（第 0 帧）也支持
    stage.add(atlas.bitmap('head', 0, 12 * dpr, 12 * dpr)).scale = 0.5;

    stage.add(info(cax, CONFIG.image + '  ' + atlas.width + 'x' + atlas.height, '#8b98a5', dpr));

    console.log('[demo] walk ' + atlas.count('walk') + ' 帧，head ' + atlas.count('head') + ' 帧');
  }, function (err) {
    console.error('[demo] ' + err.message);
    stage.add(info(cax, err.message, '#ff6b6b', dpr));
  });
}

function info(cax, text, color, dpr) {
  var t = new cax.Text(text, { font: Math.round(13 * dpr) + 'px sans-serif', color: color });
  t.x = 12 * dpr;
  t.y = 32 * dpr;
  return t;
}

module.exports = { start: start };
