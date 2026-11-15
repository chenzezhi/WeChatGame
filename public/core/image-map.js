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
 * // 1. 直接挂舞台
 * ImageMap.add(stage, 'src/assets/logo.png', 100, 200);
 *
 * // 2. 只创建不挂
 * ImageMap.bitmap('src/assets/logo.png', 100, 200, (bmp) => {
 *   bmp.scale = 0.5;
 *   stage.add(bmp);
 * });
 *
 * // 3. 先拿尺寸，用来算布局
 * ImageMap.size('src/assets/logo.png', (w, h) => console.log(w, h));
 *
 * // 4. 平铺（背景 / 花纹）：左上 + 右下 定区域，带间距
 * ImageMap.tile(stage, 'src/assets/mb1.png', {
 *   x: 0, y: 0, right: 1080, bottom: 2400,
 *   scale: 1,      // 每个格子 = 原图 × scale
 *   gap: 8,        // 格子间距
 *   margin: 16,    // 区域四周留白
 *   bottom: true,  // 压到最底层（背景）
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 加载是异步的：第一次调用要等图片读完，回调才触发。
 * 同一个 url 只读一次（texture.js 里有缓存），之后调用会立即回调。
 *
 * tile() 是「烘焙」：先铺到一张离屏画布，舞台上只挂 1 个对象，
 * 所以不会拖慢渲染——代价是只能用于静态图。
 * 需要「会动的平铺」（影分身）请用 anim-map.js 的 tile()。
 *
 * 图集里的图走 sprite-map.js；精灵图动画走 anim-map.js。
 * ==============================================*/

const cax = require('../../libs/cax.js');
const texture = require('./texture.js');
const Tile = require('./tile.js');

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
   * 平铺：把一张图重复铺满一块区域（背景常用），支持间距和外边距
   * @param {Object} stage
   * @param {string} url
   * @param {Object} [options] - { x, y, right, bottom, width, height, scale, gap, margin, bottomLayer }
   * @param {Function} [onReady] - (bmp) => void
   * @param {Function} [onError] - (Error) => void
   */
  static tile(stage, url, options = {}, onReady, onError) {
    const opt = options || {};

    texture.load(
      url,
      (t) => {
        const scale = opt.scale || 1;
        const cellW = t.width * scale;    // 一个格子的宽
        const cellH = t.height * scale;   // 一个格子的高

        // 兼容旧写法：bottom 原来表示「压到最底层」（布尔）
        // 现在 bottom 表示区域右下角坐标，所以布尔值转成 bottomLayer
        const isBoolBottom = typeof opt.bottom === 'boolean';
        const bottomCoord = isBoolBottom ? undefined : opt.bottom;
        const wantBottomLayer = opt.bottomLayer || (isBoolBottom && opt.bottom);

        // 算出平铺矩阵（格子坐标由 tile.js 统一算）
        const grid = Tile.grid({
          x: opt.x,
          y: opt.y,
          right: opt.right,
          bottom: bottomCoord,
          width: opt.width,
          height: opt.height,
          cellW,
          cellH,
          gap: opt.gap,
          margin: opt.margin,
        });

        // 画布从「第一个格子」开始铺，尺寸 = 矩阵占的范围
        const originX = grid.cells[0].x;
        const originY = grid.cells[0].y;
        const areaW = Math.ceil(grid.cols * cellW + (grid.cols - 1) * (opt.gap || 0));
        const areaH = Math.ceil(grid.rows * cellH + (grid.rows - 1) * (opt.gap || 0));

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

        // 一格一格画；相对画布换算坐标
        for (const cell of grid.cells) {
          ctx.drawImage(t.image, cell.x - originX, cell.y - originY, cellW, cellH);
        }

        const bmp = new cax.Bitmap(canvas);
        bmp.x = originX;
        bmp.y = originY;

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
