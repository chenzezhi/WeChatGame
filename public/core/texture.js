'use strict';

/* ==================== 功能 ====================
 * Texture —— 图片加载器
 *
 * 把一张 png / jpg 读进内存，交给上层按 { image, width, height } 使用。
 * 同一个 url 只解码一次，之后直接走缓存回调。
 * ==============================================*/

/* ==================== 用法 ====================
 * const texture = require('./texture.js');
 *
 * texture.load('src/assets/roll.png', (t) => {
 *   t.image;    // wx.createImage() 出来的图片对象
 *   t.width;    // 原始宽，单位 px
 *   t.height;   // 原始高，单位 px
 * }, (err) => console.error(err));
 * ==============================================*/

/* ==================== 注意 ====================
 * cax 没有加载失败回调，这里自己挂了 img.onerror，
 * 否则路径写错时只会黑屏，看不到原因。
 * ==============================================*/

var cax = require('../../libs/cax.js');

// 已加载的图片，url -> { image, width, height }
var cache = {};

// 加载一张图片，成功时回调尺寸，失败时回调错误
// url - 图片路径
// onLoad - 成功回调，收到 { image, width, height }
// onError - 失败回调，收到 Error；不传则只打控制台日志
function load(url, onLoad, onError) {
  // 缓存命中的图不再读第二次
  if (cache[url]) {
    onLoad(cache[url]);
    return;
  }

  // 保证成功和失败只会有一个生效
  var done = false;

  var bmp = new cax.Bitmap(url, function () {
    if (done) return;
    done = true;

    var img = this.img;

    // 没有宽高说明图片没解码成功
    if (!img || !img.width) {
      fail('[texture] 图片没有宽高：' + url);
      return;
    }

    // 记录尺寸，写进缓存，再交给调用方
    var t = { image: img, width: img.width, height: img.height };
    cache[url] = t;
    onLoad(t);
  });

  // cax 不提供失败回调，自己在 img 上补一个
  if (!done && bmp.img) {
    bmp.img.onerror = function () {
      if (done) return;
      done = true;
      fail('[texture] 加载失败：' + url);
    };
  }

  // 统一处理失败：有回调交给调用方，没有就打日志
  function fail(msg) {
    if (onError) onError(new Error(msg));
    else console.error(msg);
  }
}

module.exports = { load: load };
