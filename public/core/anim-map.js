'use strict';

/* ==================== 功能 ====================
 * AnimMap —— 精灵图动画的渲染连接器
 *
 * 把 atlas.js 加载好的精灵图接到 cax 舞台。
 * 把「取动画 + 算缩放 + 设坐标 + 挂舞台」这一串重复调用，收成一行。
 * ==============================================*/

/* ==================== 用法 ====================
 * const AnimMap = require('./anim-map.js');
 * const SHEET = require('../config/assets.js');
 *
 * AnimMap.load(SHEET, (am) => {
 *   am.add(stage, 'walk', 100, 200, 300);  // 目标高度 300，自动算等比缩放
 *   am.add(stage, 'walk', 100, 200);        // 不传高度 → 用原图尺寸
 * });
 * ==============================================*/

/* ==================== 注意 ====================
 * 精灵图动画走 atlas.js（真动画）；
 * 单张静态图走 cocos-atlas.js + sprite-map.js。
 * ==============================================*/

const Atlas = require('./atlas.js');

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
}

module.exports = AnimMap;
