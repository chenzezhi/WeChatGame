'use strict';

/* ==================== 功能 ====================
 * TableMapper —— 表格形式的数据映射器
 *
 * 在 string-mapper 之上再加一层：把「字段头」和「数据行」
 * 统一放进一个数组，像表格一样，一眼看清每列是什么。
 * 内部组合 StringMapper（字符串 → 对象）+ Mapper（对象 → 完整对象）。
 * ==============================================*/

/* ==================== 用法 ====================
 * const TableMapper = require('./table-mapper.js');
 *
 * const template = { name: '', x: 0, y: 0, scale: 1 };
 * const table = [
 *   'name x y scale',     // 第 0 行：字段头（要改哪些字段）
 *   'icon 100 200 2',     // 下面每行：一条数据
 *   'bg 0 0',             // 字段可省略，省略的用模板默认值
 * ];
 *
 * const full = TableMapper.fill(template, table);
 * ==============================================*/

/* ==================== 注意 ====================
 * 解析出的值统一是字符串，需要数字/布尔时由使用层转换。
 * ==============================================*/

const StringMapper = require('./string-mapper.js');

class TableMapper {
  /**
   * @param {Object} template - 默认值模板
   */
  constructor(template) {
    this._template = template;
  }

  /**
   * 解析表格 → 完整对象数组
   * @param {string[]} table - 第 0 个是字段头，其余是数据行
   * @returns {Object[]}
   */
  build(table) {
    const fieldOrder = table[0];
    const strings = table.slice(1);
    return StringMapper.fill(this._template, strings, fieldOrder);
  }
}

TableMapper.fill = function (template, table) {
  return new TableMapper(template).build(table);
};

module.exports = TableMapper;
