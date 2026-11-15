'use strict';

/* ==================== 功能 ====================
 * SpriteMap —— 图集（静态小图）的渲染连接器
 *
 * 把 cocos-atlas 的图集数据接到 cax 舞台。
 * 统一入口：render(stage, cfg)，配置里带平铺区域就平铺，不带就放一张。
 * ==============================================*/

/* ==================== 用法 ====================
 * const SpriteMap = require('./sprite-map.js');
 * const assets = require('./asset-manager.js');
 *
 * const sm = SpriteMap.of(assets.atlas('gameMap'));
 *
 * sm.ready(() => {
 *   sm.render(stage, { name: 'hpBar', x: 10, y: 20, scale: 2 });
 *   sm.render(stage, { name: 'gridBg1', right: 1080, bottom: 600, gap: 4 });
 *
 *   // 低层方法
 *   sm.add(stage, 1, 10, 20);   // 序号：最左上角是 1
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 取图前必须等 ready()，图片是异步加载的。
 * render() 会自动把字符串数值转成数字，表格解析出来的值可直接丢进来。
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
   * @param {string|number} name - 名字，或序号
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
    const scale = num(opt.scale) || 1;
    const frame = this.size(name);

    const grid = Tile.grid({
      x: num(opt.x),
      y: num(opt.y),
      right: num(opt.right),
      bottom: num(opt.bottom),
      cellW: frame.w * scale,
      cellH: frame.h * scale,
      gap: num(opt.gap),
      margin: num(opt.margin),
    });

    return grid.cells.map((cell) => {
      const bmp = this.map.bitmap(name, cell.x, cell.y);
      bmp.scale = scale;
      stage.add(bmp);
      return bmp;
    });
  }

  /**
   * 统一入口：按一份配置渲染（带平铺区域就平铺，否则放一张）
   * @param {Object} stage
   * @param {Object} cfg - { name, x, y, scale, gap, margin, right, bottom }
   * @returns {Object|Object[]} 单个 Bitmap 或 Bitmap 数组
   */
  render(stage, cfg) {
    const c = cfg || {};
    const scale = num(c.scale) || 1;

    // 有面积就是平铺
    if (num(c.right) > 0 && num(c.bottom) > 0) {
      return this.tile(stage, c.name, {
        x: num(c.x),
        y: num(c.y),
        right: num(c.right),
        bottom: num(c.bottom),
        scale,
        gap: num(c.gap),
        margin: num(c.margin),
      });
    }

    const bmp = this.add(stage, c.name, num(c.x), num(c.y));
    bmp.scale = scale;
    return bmp;
  }
}

/* ==================== 小工具 ==================== */

// 字符串 / 数字 → 数字（解析不了就当 0）
function num(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

module.exports = SpriteMap;
