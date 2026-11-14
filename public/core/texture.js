'use strict';

// 只干一件事：把大图读进内存，并保证同一个 url 只读一次。
// 返回 { image, width, height }，image 就是 wx.createImage() 出的那个对象。

var cax = require('../../libs/cax.js');

var cache = {}; // url -> { image, width, height }

function load(url, onLoad, onError) {
  if (cache[url]) {
    onLoad(cache[url]);
    return;
  }

  var done = false;

  var bmp = new cax.Bitmap(url, function () {
    if (done) return;
    done = true;

    var img = this.img;

    if (!img || !img.width) {
      fail('[texture] 图片没有宽高：' + url);
      return;
    }

    var t = { image: img, width: img.width, height: img.height };
    cache[url] = t;
    onLoad(t);
  });

  // cax 没有加载失败回调，自己补一个，否则路径写错只会黑屏
  if (!done && bmp.img) {
    bmp.img.onerror = function () {
      if (done) return;
      done = true;
      fail('[texture] 加载失败：' + url);
    };
  }

  function fail(msg) {
    if (onError) onError(new Error(msg));
    else console.error(msg);
  }
}

module.exports = { load: load };
