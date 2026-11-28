'use strict';

/* ==================== 功能 ====================
 * Records —— 表格文本读取器
 *
 * 把「字段头 + 数据行」的纯文本变成对象数组：
 *   文本 → [{ 字段名: 值, ... }, ...]
 * 数值自动转成数字，其余保留字符串。武器表、怪物表、波次表都用它。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Records = require('./records.js');
 *
 * const list = Records.load('src/data/weapons.txt');
 * list[0];   // { name: 'arrow', damage: 10, cdMs: 500 }
 * ==============================================*/

/* ==================== 文本格式 ====================
 *   # 井号开头整行注释，空行忽略
 *
 *   name    damage  cdMs
 *   arrow   10      500
 *   stone   20      900
 *
 * 第一个非注释行 = 字段头，其余每行一条数据，空格分隔。
 * 字段个数对上就行，行的顺序无所谓。
 * ==============================================*/

// 读文件并解析
// path - 任意文本文件路径，不要求后缀
// 返回对象数组，没数据时返回空数组
function load(path) {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
    throw new Error('[records] 当前环境读不了包内文件：' + path);
  }
  return parse(wx.getFileSystemManager().readFileSync(path, 'utf8'));
}

// 解析表格文本
// text - 文件内容
// 返回对象数组，字段名来自第一行
function parse(text) {
  const out = [];
  let fields = null;

  const lines = String(text || '').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行和注释行跳过
    if (!line || line[0] === '#') continue;

    const parts = line.split(/\s+/);

    // 第一条有效行当字段头
    if (!fields) {
      fields = parts;
      continue;
    }

    const obj = {};
    for (let j = 0; j < fields.length; j++) {
      const v = parts[j] === undefined ? '' : parts[j];
      // 纯数字（含负号、小数点）转成 number，其余保持字符串
      obj[fields[j]] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    }
    out.push(obj);
  }

  return out;
}

// 按某个字段取值，找不到返回 null
// list - parse/load 的结果
// field - 用哪个字段比
// value - 要匹配的值
function find(list, field, value) {
  for (let i = 0; i < list.length; i++) {
    if (String(list[i][field]) === String(value)) return list[i];
  }
  return null;
}

module.exports = { load: load, parse: parse, find: find };
