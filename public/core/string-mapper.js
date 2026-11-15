'use strict';

/* ============================================================================
 * StringMapper —— 字符串 → 对象的映射器（字符串语法糖）
 *
 * 和 mapper.js 配合使用（组合，不是继承）：
 *   mapper.js       只做「对象 → 对象」的模板替换
 *   本模块          只做「字符串 → 对象」的解析
 *
 * 用一段紧凑字符串表达对象，字段顺序由 fieldOrder 决定，
 * 支持嵌套路径（posData.x）和 "n" 占位符（这一位不改，用模板默认值）。
 *
 *   const StringMapper = require('./string-mapper.js');
 *
 *   const fieldOrder = 'name x y scale';
 *
 *   // 1. 只解析成对象
 *   const sm = new StringMapper(fieldOrder);
 *   const obj = sm.parse('icon 100 200 2');
 *   // obj -> { name:'icon', x:'100', y:'200', scale:'2' }
 *
 *   // 2. 组合 mapper，一步到位生成完整对象数组
 *   const template = { name:'', x:0, y:0, scale:1, rotation:0 };
 *   const full = StringMapper.fill(template, ['icon 100 200 2'], fieldOrder);
 *   // full[0] -> { name:'icon', x:'100', y:'200', scale:'2', rotation:0 }
 *
 * 注意：解析出的值统一是字符串。需要数字/布尔时，由使用层自行转换，
 *       这里不猜类型，保持单一职责。
 * ==========================================================================*/

const Mapper = require('./mapper.js');

class StringMapper {
  /**
   * @param {string} fieldOrder - 字段顺序，空格分隔，如 "name x y scale"（支持 a.b 嵌套）
   */
  constructor(fieldOrder) {
    this._fieldOrder = fieldOrder;
  }

  /**
   * 解析单条字符串 → 对象
   * @param {string} str
   * @returns {Object}
   */
  parse(str) {
    const keys = String(this._fieldOrder).trim().split(/\s+/);
    const values = String(str || '').trim().split(/\s+/);
    const obj = {};

    for (let i = 0; i < keys.length; i++) {
      const path = keys[i];
      const val = values[i];
      // 空路径 / 空值 / "n" 占位符 → 跳过
      if (!path || !val || val === 'n') continue;

      const parts = path.split('.');
      let cur = obj;
      for (let j = 0; j < parts.length; j++) {
        const key = parts[j];
        if (j === parts.length - 1) {
          cur[key] = val;
        } else {
          if (!cur[key] || typeof cur[key] !== 'object') {
            cur[key] = {};
          }
          cur = cur[key];
        }
      }
    }
    return obj;
  }

  /**
   * 解析字符串数组 → 对象数组
   * @param {string[]} strings
   * @returns {Object[]}
   */
  parseAll(strings) {
    return strings.map((s) => this.parse(s));
  }

  /**
   * 字符串数组 → 完整对象数组（内部组合 Mapper）
   * @param {Object} template
   * @param {string[]} strings
   * @returns {Object[]}
   */
  build(template, strings) {
    return Mapper.fill(template, this.parseAll(strings));
  }
}

// 一步到位：模板 + 字符串数组 + 字段顺序 → 完整对象数组
StringMapper.fill = function (template, strings, fieldOrder) {
  return new StringMapper(fieldOrder).build(template, strings);
};

module.exports = StringMapper;
