'use strict';

/* ============================================================================
 * Mapper —— 通用 JSON 对象模板映射器
 *
 * 作用：给一份「默认模板」+ 一串「只写差异的简化数据」，
 *       自动生成完整的 JSON 对象数组（缺失字段用模板默认值补齐）。
 *
 * 它不关心数据是「动作 / 渲染 / 配置」哪一种，纯粹做「对象 → 对象」的替换。
 *
 * 用法：
 *   const Mapper = require('./mapper.js');
 *
 *   const template = { name: '', x: 0, y: 0, scale: 1, rotation: 0 };
 *   const items = [
 *     { name: 'bg',   x: 0,   y: 0 },
 *     { name: 'icon', x: 100, y: 200, scale: 2 }
 *   ];
 *
 *   const full = Mapper.fill(template, items);
 *   // full[1] -> { name:'icon', x:100, y:200, scale:2, rotation:0 }
 *
 * 注意：字符串语法（"icon 100 200 2" + 字段顺序）单独用别的模块做，
 *       这里只做「对象 → 对象」的替换，保持单一职责。
 * ==========================================================================*/

class Mapper {
  /**
   * @param {Object} template - 默认模板对象（所有字段的默认值）
   */
  constructor(template) {
    this._template = template;
    this._simplifiedList = [];  // 简化数据列表（只写差异）
    this._fullList = [];        // 生成后的完整对象列表
  }

  /**
   * 添加简化数据。传数组会逐条加入，传单个对象直接加入。
   * @param {Object|Object[]} items
   * @returns {Mapper}
   */
  add(items) {
    if (Array.isArray(items)) {
      for (const item of items) {
        this.add(item);
      }
      return this;
    }
    if (items && typeof items === 'object') {
      this._simplifiedList.push(items);
    }
    return this;
  }

  /**
   * 深度合并：把 source 里的字段覆盖/补充到 target 上（只处理 source 有的字段）。
   * source 里是嵌套对象时递归进去，其余类型直接整体替换。
   * @param {Object} source
   * @param {Object} target
   * @returns {Object}
   */
  merge(source, target) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return target;
    }
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      return target;
    }

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      const sourceIsObject =
        sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue);
      const targetIsObject =
        targetValue !== null && typeof targetValue === 'object' && !Array.isArray(targetValue);

      if (sourceIsObject) {
        if (!targetIsObject) {
          target[key] = {};
        }
        this.merge(sourceValue, target[key]);
      } else {
        target[key] = sourceValue;
      }
    }
    return target;
  }

  /**
   * 生成完整对象数组：每条简化数据先深拷贝模板，再合并差异。
   * @returns {Object[]}
   */
  generate() {
    this._fullList = [];
    for (const item of this._simplifiedList) {
      const copy = JSON.parse(JSON.stringify(this._template));
      this._fullList.push(this.merge(item, copy));
    }
    return this._fullList;
  }
}

// 一步到位：模板 + 简化数据 → 完整对象数组
Mapper.fill = function (template, items) {
  return new Mapper(template).add(items).generate();
};

module.exports = Mapper;
