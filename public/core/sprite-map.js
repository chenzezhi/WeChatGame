'use strict';

/* ==================== 功能 ====================
 * SpriteMap —— 图集（静态小图）的渲染连接器
 *
 * 把 cocos-atlas 的图集数据接到 cax 舞台：
 * 按名字 / 序号取单张小图，也可以平铺成一片。
 * ==============================================*/

/* ==================== 用法 ====================
 * const SpriteMap = require('./sprite-map.js');
 * const assets = require('./asset-manager.js');
 *
 * const sm = SpriteMap.of(assets.atlas('gameMap'));
 *
 * sm.ready(() => {
 *   sm.add(stage, 'hpBar', 10, 20);          // 按名字
 *   sm.add(stage, 1, 10, 20);                // 按序号（最左上角是 1）
 *
 *   // 平铺：把同一个小图铺满一块区域
 *   sm.tile(stage, 'gridBg1', {
 *     x: 0, y: 0, right: 1080, bottom: 600,
 *     scale: 1, gap: 4, margin: 8,
 *   });
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 图集里的图走这里（静态），精灵图动画走 anim-map.js。
 * 取图前必须等 ready()，图片是异步加载的。
 * ==============================================*/

const Tile = require('./tile.js');

class SpriteMap {
  /**
   * @param {Object} atlasMap - cocos-atlas 的图集对象
   */
  constructor(atlasMap) {
    this.map = atlasMap;
  }

  /**
   * 包装一个图集数据对象
   * @param {Object} atlasMap
   * @returns {SpriteMap}
   */
  static of(atlasMap) {
    return new SpriteMap(atlasMap);
  }

  /**
   * 等图集加载完成（取图前必须先等）
   * @param {Function} cb
   * @returns {SpriteMap}
   */
  ready(cb) {
    this.map.onReady(cb);
    return this;
  }

  /**
   * 只取一张小图（不挂舞台）
   * @param {string|number} name - 名字，或序号（数字 / 纯数字字符串）
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @returns {Object} cax.Bitmap
   */
  bitmap(name, x = 0, y = 0) {
    return this.map.bitmap(name, x, y);
  }

  /**
   * 取一张小图并挂到舞台
   * @param {Object} stage
   * @param {string|number} name
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @returns {Object} cax.Bitmap
   */
  add(stage, name, x = 0, y = 0) {
    const bmp = this.map.bitmap(name, x, y);
    stage.add(bmp);
    return bmp;
  }

  /**
   * 批量挂舞台
   * @param {Object} stage
   * @param {Object} spec - { 名字: [x, y], 名字: [x, y] }
   * @returns {Object} 名字 -> Bitmap
   */
  addAll(stage, spec = {}) {
    const out = {};
    for (const name of Object.keys(spec || {})) {
      const pos = spec[name];
      out[name] = this.add(stage, name, pos[0], pos[1]);
    }
    return out;
  }

  /**
   * 取一张小图的原始尺寸
   * @param {string|number} name
   * @returns {{w: number, h: number}}
   */
  size(name) {
    return this.map.size(name);
  }

  /**
   * 平铺：把同一个小图铺满一块区域
   * @param {Object} stage
   * @param {string|number} name
   * @param {Object} [options] - { x, y, right, bottom, scale, gap, margin }
   * @returns {Object[]} cax.Bitmap[]
   */
  tile(stage, name, options = {}) {
    const opt = options || {};
    const scale = opt.scale || 1;
    const frame = this.size(name);

    const grid = Tile.grid({
      x: opt.x,
      y: opt.y,
      right: opt.right,
      bottom: opt.bottom,
      cellW: frame.w * scale,
      cellH: frame.h * scale,
      gap: opt.gap,
      margin: opt.margin,
    });

    return grid.cells.map((cell) => {
      const bmp = this.map.bitmap(name, cell.x, cell.y);
      bmp.scale = scale;
      stage.add(bmp);
      return bmp;
    });
  }
}

module.exports = SpriteMap;
