'use strict';

/* ==================== 功能 ====================
 * BoardText —— 棋盘文本数据的读取与解析
 *
 * 把一份纯文本的棋盘文件变成结构化数据：
 *   文本 → [{ index, name, map }, ...]
 *
 * 只做格式转换：不管棋盘怎么画，也不管谁在用哪一块。
 * ==============================================*/

/* ==================== 用法 ====================
 * const BoardText = require('./board-text.js');
 *
 * const list = BoardText.load('src/assets/boards.txt');  // 读文件 + 解析
 * const one  = BoardText.pick(list, 1);                  // 按序号取一块
 * ==============================================*/

/* ==================== 文本格式 ====================
 *   # 注释，整行忽略
 *
 *   1 回字形          ← 块头：序号 + 名字，行首必须是数字
 *   A A A A A         ← 布局：一个字符一格，空格忽略
 *   A A . A A
 *
 *   2 三乘三          ← 空行分隔，块头开新块
 *   A A A
 *   A A A
 * ==============================================*/

/* ==================== 返回的数据 ====================
 * [
 *   { index: 1, name: '回字形', map: ['A A A A A', 'A A A A A', ...] },
 *   { index: 2, name: '三乘三', map: ['A A A', 'A A A', 'A A A'] },
 *   ...
 * ]
 *
 * index - 块头里的序号，只是个编号
 * name  - 块头里的名字，没写就是空字符串
 * map   - 布局行数组，字符串即原样，Board 会自己拆字符
 * ==============================================*/

// 读文件并解析成棋盘列表
// path - 任意文本文件路径，不要求后缀
// 返回 [{ index, name, map }]，文件里没有棋盘时返回空数组
function load(path) {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
    throw new Error('[board] 当前环境读不了包内文件：' + path);
  }

  const text = wx.getFileSystemManager().readFileSync(path, 'utf8');
  return parse(text);
}

// 把棋盘文件的全部内容解析成列表
// text - 文件内容，字符串
// 返回 [{ index, name, map }]，顺序和文件里一致
function parse(text) {
  const out = [];
  let cur = null;   // 当前正在读的棋盘

  const lines = String(text || '').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行和注释行跳过
    if (!line || line[0] === '#') continue;

    // 行首是数字 → 块头，开一块新的
    if (/^\d/.test(line)) {
      const parts = line.split(/\s+/);
      cur = {
        index: Number(parts[0]),
        name: parts.slice(1).join(' '),   // 名字允许带空格
        map: [],
      };
      out.push(cur);
      continue;
    }

    // 其余行都是布局；还没有块头时忽略
    if (cur) cur.map.push(line);
  }

  return out;
}

// 从列表里挑一块棋盘
// list - load / parse 的结果
// key - 序号（数字或纯数字字符串）或名字；不传则用第一块
// 返回匹配的那一块，指定了却找不到则返回 null
function pick(list, key) {
  if (!list || !list.length) return null;

  const k = key == null ? '' : String(key).trim();
  // 没指定，用第一块
  if (!k) return list[0];

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (String(b.index) === k || b.name === k) return b;
  }
  return null;
}

module.exports = { load: load, parse: parse, pick: pick };
