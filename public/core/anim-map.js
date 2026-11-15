'use strict';

/* ==================== 功能 ====================
 * AnimMap —— 精灵图动画的渲染连接器
 *
 * 把 atlas.js 加载好的精灵图接到 cax 舞台。
 * 单个动画一行调用；平铺（影分身）交给 tile()，共用同一套矩阵计算。
 * ==============================================*/

/* ==================== 用法 ====================
 * const AnimMap = require('./anim-map.js');
 * const SHEET = require('../config/assets.js');
 *
 * AnimMap.load(SHEET, (am) => {
 *   // 单个：目标高度 300，自动算等比缩放
 *   am.add(stage, 'walk', 100, 200, 300);
 *
 *   // 平铺（影分身）：左上 + 右下 定区域，每个格子放一个动画
 *   am.tile(stage, 'walk', {
 *     x: 0, y: 0, right: 1080, bottom: 800,
 *     height: 120,   // 每个影分身的目标高度
 *     gap: 20,       // 间距
 *     margin: 10,    // 四周留白
 *   });
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 精灵图动画走 atlas.js（真动画）；
 * 单张静态图走 cocos-atlas.js + sprite-map.js / image-map.js。
 *
 * tile() 是「复制对象」：每个格子都创建一个独立 Sprite，
 * 因为动画每帧都在变，没法像静态图那样烘焙成一张。
 * ==============================================*/

const Atlas = require('./atlas.js');
const Tile = require('./tile.js');

class AnimMap {
  /**
   * @param {Object} atlas - atlas.js 加载完成后的图集对象
   */
  constructor(atlas) {
    this._atlas = atlas;
  }

  /**
   * 加载精灵图配置，成功后回调拿到 AnimMap 实例
   * @param {Object} config - 精灵图配置（public/config/assets.js）
   * @param {Function} onLoad - (AnimMap) => void
   * @param {Function} onError - (Error) => void
   */
  static load(config, onLoad, onError) {
    Atlas.load(config, (atlas) => onLoad(new AnimMap(atlas)), onError);
  }

  /**
   * 包装一个已加载的图集对象
   * @param {Object} atlas
   * @returns {AnimMap}
   */
  static of(atlas) {
    return new AnimMap(atlas);
  }

  /**
   * 单帧尺寸
   * @param {string} name - 动画名
   * @returns {{w: number, h: number}}
   */
  size(name) {
    return this._atlas.size(name);
  }

  /**
   * 创建动画 Sprite（不挂舞台）
   * @param {string} name - 动画名
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [height=0] - 目标高度，传了才自动算等比缩放
   * @returns {Object} cax.Sprite
   */
  sprite(name, x = 0, y = 0, height = 0) {
    const s = this._atlas.sprite(name);
    if (height) s.scale = height / this.size(name).h;
    s.x = x;
    s.y = y;
    return s;
  }

  /**
   * 创建动画 Sprite 并挂到舞台
   * @param {Object} stage
   * @param {string} name - 动画名
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [height=0] - 目标高度
   * @returns {Object} cax.Sprite
   */
  add(stage, name, x = 0, y = 0, height = 0) {
    const s = this.sprite(name, x, y, height);
    stage.add(s);
    return s;
  }

  /**
   * 批量挂舞台
   * @param {Object} stage
   * @param {Array<{name: string, x?: number, y?: number, height?: number}>} rows
   * @returns {Object[]} cax.Sprite[]
   */
  addAll(stage, rows = []) {
    return rows.map((r) => this.add(stage, r.name, r.x, r.y, r.height));
  }

  /**
   * 平铺（影分身）：在区域里铺满同一种动画
   * @param {Object} stage
   * @param {string} name - 动画名
   * @param {Object} [options] - { x, y, right, bottom, height, scale, gap, margin }
   * @returns {Object[]} 创建的 Sprite 列表
   */
  tile(stage, name, options = {}) {
    const opt = options || {};
    const frame = this.size(name);

    // 每个影分身的显示高度：优先 height（绝对值），否则用 scale（倍数）
    const displayH = opt.height || frame.h * (opt.scale || 1);
    const cellH = displayH;
    const cellW = (frame.w * displayH) / frame.h;

    const grid = Tile.grid({
      x: opt.x,
      y: opt.y,
      right: opt.right,
      bottom: opt.bottom,
      cellW,
      cellH,
      gap: opt.gap,
      margin: opt.margin,
    });

    return grid.cells.map((cell) => this.add(stage, name, cell.x, cell.y, displayH));
  }
}

module.exports = AnimMap;
