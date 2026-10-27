/**
 * 图片加载器（core/assets/loaders）
 *
 * 微信小游戏原生支持 wx.createImage() + img.onload，这里包成 Promise，
 * 并统一处理超时与错误，避免各处重复写回调。
 */
'use strict';

var platformRender = require('../../../platform/wx/render.js');

var DEFAULT_TIMEOUT = 15000;

function load(src, options) {
  options = options || {};
  var timeout = options.timeout || DEFAULT_TIMEOUT;

  return new Promise(function (resolve, reject) {
    var img = platformRender.createImage();
    var settled = false;
    var timer = null;

    function finish(fn, arg) {
      if (settled) return;
      settled = true;
      if (timer) { clearTimeout(timer); timer = null; }
      fn(arg);
    }

    img.onload = function () { finish(resolve, img); };
    img.onerror = function () {
      finish(reject, new Error('图片加载失败：' + src));
    };

    timer = setTimeout(function () {
      finish(reject, new Error('图片加载超时：' + src));
    }, timeout);

    img.src = src;
  });
}

module.exports = { load: load };
