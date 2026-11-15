'use strict';

/* ==================== 功能 ====================
 * TableMapper —— 表格形式的数据映射器
 *
 * 表格 = 一个字符串数组：
 *   第 0 个元素是「字段头」（有哪些列、什么顺序）
 *   后面每个元素是一条数据行
 * 内部组合 StringMapper（字符串 → 对象）+ Mapper（补全默认值）。
 * ==============================================*/

/* ==================== 用法 ====================
 * const TableMapper = require('./table-mapper.js');
 * const TEMPLATE = require('../config/render.js').template;
 *
 * const table = [
 *   'renderer name x y scale',      // 第 0 行：字段头
 *   'image logo.png 100 200 2',     // 数据行
 *   'sprite hpBar 10 20',           // 后面可省略，省略的用模板默认值
 * ];
 *
 * const list = TableMapper.fill(TEMPLATE, table);
 * ==============================================*/

/* ==================== 注意 ====================
 * 字段顺序只由表格第 0 行决定，不放到别的地方，
 * 这样写数据时一眼就能看出第几个值对应哪个字段。
 *
 * 解析出的值统一是字符串，需要数字时由渲染器转换。
 * 行尾字段可以不写，不写 = 保持模板默认值。
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
   * @param {string[]} table - [0] 是字段头，其余是数据行
   * @returns {Object[]}
   */
  build(table) {
    const fields = table[0];
    const rows = table.slice(1);
    return StringMapper.fill(this._template, rows, fields);
  }
}

TableMapper.fill = function (template, table) {
  return new TableMapper(template).build(table);
};

module.exports = TableMapper;
