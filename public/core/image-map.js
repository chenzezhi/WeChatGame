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
 *
 * // 4. 平铺：把一张小图重复铺满一块区域（当背景用）
 * ImageMap.tile(stage, 'src/assets/logo.png', {
 *   x: 0, y: 0,          // 区域左上角
 *   width: 1080,         // 区域宽（不写 = 一张图的宽）
 *   height: 2400,        // 区域高（不写 = 一张图的高）
 *   scale: 1,            // 每张小图的倍数（调小 → 铺得更密）
 *   bottom: true,        // 放最底层（背景）
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 加载是异步的：第一次调用要等图片读完，回调才触发。
 * 同一个 url 只读一次（texture.js 里有缓存），
 * 之后再调会立即回调，可以直接当成同步用。
 *
 * tile() 只生成「一张」平铺好的大图（先画进离屏画布），
 * 不是真的往舞台上塞几百个对象，所以不会拖慢渲染。
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

  /**
   * 平铺：把一张图重复铺满一块区域（背景常用）
   * @param {Object} stage
   * @param {string} url
   * @param {Object} [options] - { x, y, width, height, scale, bottom }
   * @param {Function} [onReady] - (bmp) => void
   * @param {Function} [onError] - (Error) => void
   */
  static tile(stage, url, options = {}, onReady, onError) {
    const opt = options || {};

    texture.load(
      url,
      (t) => {
        const scale = opt.scale || 1;
        const tileW = t.width * scale;    // 一个小格子的宽
        const tileH = t.height * scale;   // 一个小格子的高

        const areaW = Math.ceil(opt.width || tileW);    // 铺满的区域宽
        const areaH = Math.ceil(opt.height || tileH);   // 铺满的区域高

        // 先铺到一张离屏画布上，最终只往舞台挂一张图
        const canvas = createCanvas();
        if (!canvas) {
          if (onError) onError(new Error('[image] 当前环境拿不到可用的画布'));
          return;
        }
        canvas.width = areaW;
        canvas.height = areaH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (onError) onError(new Error('[image] 离屏画布没有 2d context'));
          return;
        }

        // 一格一格画满；超出边缘的部分被画布自然裁掉
        for (let ty = 0; ty < areaH; ty += tileH) {
          for (let tx = 0; tx < areaW; tx += tileW) {
            ctx.drawImage(t.image, tx, ty, tileW, tileH);
          }
        }

        const bmp = new cax.Bitmap(canvas);
        bmp.x = opt.x || 0;
        bmp.y = opt.y || 0;

        stage.add(bmp);
        if (opt.bottom) moveToBottom(stage, bmp);

        if (onReady) onReady(bmp);
      },
      onError
    );
  }
}

/* ==================== 小工具 ==================== */

// 建一块离屏画布（cax 已经占掉第一块上屏画布，这里拿到的是离屏的）
function createCanvas() {
  if (typeof wx !== 'undefined' && wx.createCanvas) return wx.createCanvas();
  if (typeof document !== 'undefined') return document.createElement('canvas');
  return null;
}

// 把对象挪到最底层（cax 没有 zIndex，渲染顺序 = children 顺序）
// 放在第 1 位：第 0 位是 game.js 铺的底色矩形
function moveToBottom(stage, obj) {
  const list = stage.children;
  const i = list.indexOf(obj);
  if (i < 0) return;
  list.splice(i, 1);
  list.splice(Math.min(1, list.length), 0, obj);
}

module.exports = ImageMap;
