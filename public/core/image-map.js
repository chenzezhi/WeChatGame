'use strict';

/* ==================== 功能 ====================
 * ImageMap —— 单张图片的渲染连接器
 *
 * 给「独立的普通图片」用：既不在图集里，也不是精灵图动画。
 * 内部组合 texture.js（加载 + 缓存）和 tile.js（平铺矩阵）。
 * ==============================================*/

/* ==================== 用法 ====================
 * const ImageMap = require('./image-map.js');
 *
 * // 最简：一张图挂在 (100, 200)
 * ImageMap.add(stage, 'src/assets/logo.png', 100, 200);
 *
 * // 平铺铺满整屏
 * ImageMap.tile(stage, 'src/assets/mapBg/mb1.jpg', {
 *   x: 0, y: 0, right: W, bottom: H,   // W/H = 屏幕物理像素
 *   scale: 0.25,                       // 每个格子 = 原图 × 0.25（调小铺得更密）
 *   gap: 8,                            // 格子间距
 *   margin: 0,                         // 区域四周留白
 *   bottomLayer: true,                 // 压到最底层（当背景）
 * });
 *
 * // 只要尺寸
 * ImageMap.size('src/assets/logo.png', (w, h) => console.log(w, h));
 * ==============================================*/

/* ==================== 注意 ====================
 * 加载是异步的：第一次调用要等图片读完，回调才触发。
 * 同一个 url 只读一次（texture.js 里有缓存），之后调用会立即回调。
 *
 * tile() 是「烘焙」：画布尺寸 = 平铺区域，一格一格画满，
 * 舞台上只挂 1 个对象，所以铺满整块区域且不拖慢渲染。
 * 只能用于静态图；会动的平铺（影分身）请用 anim-map.js 的 tile()。
 *
 * 图集里的图走 sprite-map.js；精灵图动画走 anim-map.js。
 * ==============================================*/

const cax = require('../../libs/cax.js');
const texture = require('./texture.js');
const Tile = require('./tile.js');

class ImageMap {
  /**
   * 创建一张图片的 Bitmap（不挂舞台）
   * @param {string} url
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {Function} [onReady] - (bmp) => void
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
   * @param {string} url
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
   * 取图片原始尺寸
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
   * @param {Object} [options]
   *   x, y           区域左上角
   *   right, bottom  区域右下角
   *   scale          每个格子的倍数（默认 1）
   *   gap            格子间距
   *   margin         区域四周留白
   *   bottomLayer    是否压到最底层（当背景）
   * @param {Function} [onReady] - (bmp) => void
   * @param {Function} [onError] - (Error) => void
   */
  static tile(stage, url, options = {}, onReady, onError) {
    const opt = options || {};

    texture.load(
      url,
      (t) => {
        const scale = opt.scale || 1;
        const cellW = t.width * scale;
        const cellH = t.height * scale;

        // 兼容旧写法：bottom 是布尔值时，当作「压到最底层」
        const isBoolBottom = typeof opt.bottom === 'boolean';
        const wantBottomLayer = opt.bottomLayer || (isBoolBottom && opt.bottom);

        const grid = Tile.grid({
          x: opt.x,
          y: opt.y,
          right: opt.right,
          bottom: isBoolBottom ? undefined : opt.bottom,
          width: opt.width,
          height: opt.height,
          cellW,
          cellH,
          gap: opt.gap,
          margin: opt.margin,
        });

        // 画布尺寸 = 平铺区域本身，保证铺满（不多不少）
        const canvasW = Math.max(1, Math.ceil(grid.width));
        const canvasH = Math.max(1, Math.ceil(grid.height));

        const canvas = createCanvas();
        if (!canvas) {
          if (onError) onError(new Error('[image] 当前环境拿不到可用的画布'));
          return;
        }
        canvas.width = canvasW;
        canvas.height = canvasH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (onError) onError(new Error('[image] 离屏画布没有 2d context'));
          return;
        }

        // 一格一格画满；超出画布的部分自动裁掉
        for (const cell of grid.cells) {
          ctx.drawImage(t.image, cell.x - grid.x, cell.y - grid.y, cellW, cellH);
        }

        const bmp = new cax.Bitmap(canvas);
        bmp.x = grid.x;
        bmp.y = grid.y;

        stage.add(bmp);
        if (wantBottomLayer) moveToBottom(stage, bmp);

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
