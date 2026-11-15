'use strict';

/* ==================== 功能 ====================
 * ImageMap —— 单张图片的渲染连接器
 *
 * 给「独立的普通图片」用：既不在图集里，也不是精灵图动画。
 * 内部组合 texture.js（加载 + 缓存），产出可直接挂舞台的 cax.Bitmap。
 * ==============================================*/

/* ==================== 用法 ====================
 * const ImageMap = require('./image-map.js');
 *
 * // 1. 直接挂舞台（加载完自动挂上）
 * ImageMap.add(stage, 'src/assets/logo.png', 100, 200);
 *
 * // 2. 只创建不挂（要自己调缩放、旋转时）
 * ImageMap.bitmap('src/assets/logo.png', 100, 200, (bmp) => {
 *   bmp.scale = 0.5;
 *   stage.add(bmp);
 * });
 *
 * // 3. 先拿尺寸，用来算布局
 * ImageMap.size('src/assets/logo.png', (w, h) => {
 *   console.log(w, h);
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 加载是异步的：第一次调用要等图片读完，回调才触发。
 * 同一个 url 只读一次（texture.js 里有缓存），
 * 之后再调会立即回调，可以直接当成同步用。
 *
 * 图集里的图走 sprite-map.js；精灵图动画走 anim-map.js。
 * ==============================================*/

const cax = require('../../libs/cax.js');
const texture = require('./texture.js');

class ImageMap {
  /**
   * 创建一张图片的 Bitmap（不挂舞台）
   * @param {string} url - 图片路径
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {Function} [onReady] - (bmp) => void，加载完回调
   * @param {Function} [onError] - (Error) => void
   */
  static bitmap(url, x = 0, y = 0, onReady, onError) {
    texture.load(
      url,
      (t) => {
        const bmp = new cax.Bitmap(t.image);
        bmp.x = x;
        bmp.y = y;
        if (onReady) onReady(bmp);
      },
      onError
    );
  }

  /**
   * 创建并挂到舞台
   * @param {Object} stage
   * @param {string} url - 图片路径
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {Function} [onReady] - (bmp) => void
   * @param {Function} [onError] - (Error) => void
   */
  static add(stage, url, x = 0, y = 0, onReady, onError) {
    ImageMap.bitmap(
      url,
      x,
      y,
      (bmp) => {
        stage.add(bmp);
        if (onReady) onReady(bmp);
      },
      onError
    );
  }

  /**
   * 取图片原始尺寸（算布局用）
   * @param {string} url
   * @param {Function} onReady - (w, h) => void
   * @param {Function} [onError]
   */
  static size(url, onReady, onError) {
    texture.load(
      url,
      (t) => {
        if (onReady) onReady(t.width, t.height);
      },
      onError
    );
  }
}

module.exports = ImageMap;
