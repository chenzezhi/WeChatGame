'use strict';

/* ==================== 功能 ====================
 * AnimMap —— 精灵图动画的渲染连接器
 *
 * 把 atlas.js 加载好的精灵图接到 cax 舞台。
 * 统一入口：render(stage, cfg)，配置里带平铺区域就影分身，不带就放一个。
 * ==============================================*/

/* ==================== 用法 ====================
 * const AnimMap = require('./anim-map.js');
 * const SHEET = require('../config/assets.js');
 *
 * AnimMap.load(SHEET, (am) => {
 *   am.render(stage, { name: 'walk', x: 100, y: 200, scale: 2 });
 *   am.render(stage, { name: 'walk', right: 1080, bottom: 800, scale: 1, gap: 20 });
 *
 *   // 低层方法：height = 目标高度（绝对值）
 *   am.add(stage, 'walk', 100, 200, 300);
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * scale 是「相对单帧尺寸的倍数」；低层 add/tile 也支持 height（目标高度）。
 * render() 会自动把字符串数值转成数字。
 *
 * 平铺是「复制对象」：每个格子创建一个独立 Sprite，
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
    return rows.map((r) => this.add(stage, r.name, num(r.x), num(r.y), num(r.height)));
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
    const displayH = num(opt.height) || frame.h * (num(opt.scale) || 1);
    const cellW = (frame.w * displayH) / frame.h;

    const grid = Tile.grid({
      x: num(opt.x),
      y: num(opt.y),
      right: num(opt.right),
      bottom: num(opt.bottom),
      cellW,
      cellH: displayH,
      gap: num(opt.gap),
      margin: num(opt.margin),
    });

    return grid.cells.map((cell) => this.add(stage, name, cell.x, cell.y, displayH));
  }

  /**
   * 统一入口：按一份配置渲染（带平铺区域就影分身，否则放一个）
   * @param {Object} stage
   * @param {Object} cfg - { name, x, y, scale, height, gap, margin, right, bottom }
   * @returns {Object|Object[]} 单个 Sprite 或 Sprite 数组
   */
  render(stage, cfg) {
    const c = cfg || {};
    const frame = this.size(c.name);

    // 显示高度：优先 height，否则 scale 倍数
    const displayH = num(c.height) || frame.h * (num(c.scale) || 1);

    // 有面积就是平铺
    if (num(c.right) > 0 && num(c.bottom) > 0) {
      return this.tile(stage, c.name, {
        x: num(c.x),
        y: num(c.y),
        right: num(c.right),
        bottom: num(c.bottom),
        height: displayH,
        gap: num(c.gap),
        margin: num(c.margin),
      });
    }

    return this.add(stage, c.name, num(c.x), num(c.y), displayH);
  }
}

/* ==================== 小工具 ==================== */

// 字符串 / 数字 → 数字（解析不了就当 0）
function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

module.exports = AnimMap;
