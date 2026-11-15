'use strict';

/* ==================== 功能 ====================
 * ImageMap —— 单张图片的渲染连接器
 *
 * 给「独立的普通图片」用：既不在图集里，也不是精灵图动画。
 * 统一入口：render(stage, cfg)，配置里带平铺区域就平铺，不带就放一张。
 * ==============================================*/

/* ==================== 用法 ====================
 * const ImageMap = require('./image-map.js');
 *
 * ImageMap.render(stage, { name: 'src/assets/logo.png', x: 100, y: 200 });
 *
 * // 平铺铺满整屏
 * ImageMap.render(stage, {
 *   name: 'src/assets/mapBg/mb1.jpg',
 *   right: W, bottom: H, scale: 0.25, gap: 8,
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 加载是异步的：第一次调用要等图片读完，回调才触发。
 * 同一个 url 只读一次（texture.js 里有缓存），之后调用会立即回调，
 * 所以「先 size() 预热，再 render()」就能得到同步的渲染效果。
 *
 * 平铺是「烘焙」：画布尺寸 = 平铺区域，一格一格画满，
 * 舞台上只挂 1 个对象，铺满整块区域且不拖慢渲染。只能用于静态图。
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
        bmp.scale = bmp.scale || 1;
        stage.add(bmp);
        if (onReady) onReady(bmp);
      },
      onError
    );
  }

  /**
   * 取图片原始尺寸（也可用来「预热」，之后 render 就会同步执行）
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
   * @param {Object} [options] - { x, y, right, bottom, scale, gap, margin }
   * @param {Function} [onReady] - (bmp) => void
   * @param {Function} [onError] - (Error) => void
   */
  static tile(stage, url, options = {}, onReady, onError) {
    const opt = options || {};

    texture.load(
      url,
      (t) => {
        const scale = num(opt.scale) || 1;
        const cellW = t.width * scale;
        const cellH = t.height * scale;

        const grid = Tile.grid({
          x: num(opt.x),
          y: num(opt.y),
          right: num(opt.right),
          bottom: num(opt.bottom),
          cellW,
          cellH,
          gap: num(opt.gap),
          margin: num(opt.margin),
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
        if (onReady) onReady(bmp);
      },
      onError
    );
  }

  /**
   * 统一入口：按一份配置渲染（带平铺区域就平铺，否则放一张）
   * @param {Object} stage
   * @param {Object} cfg - { name, x, y, scale, gap, margin, right, bottom }
   * @param {Function} [onReady] - (bmp) => void
   * @param {Function} [onError] - (Error) => void
   */
  static render(stage, cfg, onReady, onError) {
    const c = cfg || {};
    const url = c.name || c.url;   // 兼容 url 写法
    const scale = num(c.scale) || 1;

    // 有面积就是平铺
    if (num(c.right) > 0 && num(c.bottom) > 0) {
      return ImageMap.tile(
        stage,
        url,
        {
          x: num(c.x),
          y: num(c.y),
          right: num(c.right),
          bottom: num(c.bottom),
          scale,
          gap: num(c.gap),
          margin: num(c.margin),
        },
        onReady,
        onError
      );
    }

    return ImageMap.add(
      stage,
      url,
      num(c.x),
      num(c.y),
      (bmp) => {
        bmp.scale = scale;
        if (onReady) onReady(bmp);
      },
      onError
    );
  }
}

/* ==================== 小工具 ==================== */

// 字符串 / 数字 → 数字（解析不了就当 0）
function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// 建一块离屏画布（cax 已经占掉第一块上屏画布，这里拿到的是离屏的）
function createCanvas() {
  if (typeof wx !== 'undefined' && wx.createCanvas) return wx.createCanvas();
  if (typeof document !== 'undefined') return document.createElement('canvas');
  return null;
}

module.exports = ImageMap;
