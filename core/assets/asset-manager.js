/**
 * 资源管理器（core/assets）
 * 统一加载 / 缓存图片与图集，同一资源只加载一次。
 */
'use strict';

var imageLoader = require('./loaders/image-loader.js');
var tileAtlas = require('./atlas/tile-atlas.js');

function createAssetManager() {
  var images = {};
  var pending = {};
  var atlases = {};

  return {
    /** 加载图片，返回 Promise<Image>；重复调用复用同一 Promise */
    loadImage: function (key, src, options) {
      if (images[key]) return Promise.resolve(images[key]);
      if (pending[key]) return pending[key];

      var p = imageLoader.load(src, options).then(function (img) {
        images[key] = img;
        delete pending[key];
        return img;
      })['catch'](function (err) {
        delete pending[key];
        throw err;
      });

      pending[key] = p;
      return p;
    },

    getImage: function (key) {
      return images[key] || null;
    },

    /** 用已加载的图片注册一张图集，返回图集对象 */
    registerAtlas: function (key, descriptor, image) {
      var atlas = tileAtlas.create(descriptor, image);
      atlases[key] = atlas;
      return atlas;
    },

    getAtlas: function (key) {
      return atlases[key] || null;
    }
  };
}

module.exports = createAssetManager;
