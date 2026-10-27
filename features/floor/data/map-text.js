/**
 * 纯文本地图（features/floor/data/map-text）
 *
 * 用 wx.getFileSystemManager().readFileSync 把「代码包内的 .txt」读成字符串，
 * 再在内存里解析成 map[row][col]。不需要 require，也就不受
 * 「小游戏 require 只支持 .js」的限制。
 *
 * 文本格式（很宽松）：
 *   17 20 17 20      一行 = 地图的一行
 *   2 6 7 2          分隔符：空格 / Tab / 逗号 / 分号
 *
 *   - 以 # 或 ; 开头的整行 = 注释
 *   - 行尾 // 之后 = 注释
 *   - 空格子写 .  或  -1
 *   - 短行自动补空格子，行数不用声明
 */
'use strict';

var EMPTY = -1;

// 同一路径只读一次（避免每次 relayout 都读盘）
var cache = {};

function getFileSystem() {
  try {
    if (typeof wx === 'undefined' || typeof wx.getFileSystemManager !== 'function') return null;
    return wx.getFileSystemManager();
  } catch (e) {
    return null;
  }
}

/**
 * 读取文本文件
 * @param {String} path 代码包内相对路径，如 'assets/maps/level-1.txt'
 * @return {Object} { ok, text, error }
 */
function load(path) {
  if (!path) return { ok: false, text: null, error: '路径为空' };
  if (Object.prototype.hasOwnProperty.call(cache, path)) return cache[path];

  var result;
  var fs = getFileSystem();

  if (!fs || typeof fs.readFileSync !== 'function') {
    result = { ok: false, text: null, error: '当前环境不支持 FileSystemManager.readFileSync' };
  } else {
    try {
      var text = fs.readFileSync(path, 'utf8');
      result = { ok: true, text: String(text), error: null };
    } catch (e) {
      var msg = (e && (e.message || e.errMsg)) || String(e);
      result = { ok: false, text: null, error: msg };
    }
  }

  cache[path] = result;
  return result;
}

/** 清掉缓存（地图文件改完后想热重载时手动调） */
function clearCache(path) {
  if (path) delete cache[path];
  else cache = {};
}

/**
 * 把单个 token 转成索引
 *   数字          → 索引（负数当空格子）
 *   . / - / x / _ → 空格子
 *   其它          → 空格子（不认识的写法不会导致崩溃）
 */
function toIndex(token, limit) {
  if (typeof token !== 'string' || !token) return EMPTY;

  if (token === '.' || token === '-' || token === 'x' || token === 'X' || token === '_') {
    return EMPTY;
  }

  if (/^-?\d+$/.test(token)) {
    var n = parseInt(token, 10);
    if (isNaN(n) || n < 0) return EMPTY;
    if (limit > 0) return ((n % limit) + limit) % limit;
    return n;
  }

  return EMPTY;
}

/**
 * 解析文本地图
 *
 * @param {String} text    文件内容
 * @param {String} name    地图名（写日志用，一般传文件路径）
 * @param {Object} atlas   图集，用于拿总数做越界取模，可为 null
 * @return {Object|null}   { name, columns, rows, map, tileDisplaySize }
 */
function parse(text, name, atlas) {
  if (!text) return null;

  var limit = (atlas && atlas.count) || 0;
  var lines = String(text).split(/\r?\n/);
  var map = [];
  var columns = 0;

  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];

    // 去掉行尾注释
    var commentAt = raw.indexOf('//');
    if (commentAt >= 0) raw = raw.slice(0, commentAt);

    var line = raw.replace(/^\s+|\s+$/g, '');
    if (!line) continue;

    // 整行注释
    var first = line.charAt(0);
    if (first === '#' || first === ';') continue;

    var tokens = line.split(/[\s,;]+/);
    var row = [];

    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      if (!token) continue;
      row.push(toIndex(token, limit));
    }

    if (!row.length) continue;
    if (row.length > columns) columns = row.length;
    map.push(row);
  }

  if (!map.length || columns <= 0) return null;

  // 短行补空格子，保证矩阵是矩形
  for (var r = 0; r < map.length; r++) {
    while (map[r].length < columns) map[r].push(EMPTY);
  }

  return {
    name: name || 'text-map',
    columns: columns,
    rows: map.length,
    map: map,
    tileDisplaySize: 0
  };
}

/** 读 + 解析，一步到位 */
function loadAndParse(path, atlas) {
  var res = load(path);
  if (!res.ok) return { ok: false, data: null, error: res.error };

  var data = parse(res.text, path, atlas);
  if (!data) return { ok: false, data: null, error: '文件内容里没有可用的数字行' };

  return { ok: true, data: data, error: null };
}

module.exports = {
  EMPTY: EMPTY,
  load: load,
  clearCache: clearCache,
  parse: parse,
  loadAndParse: loadAndParse
};
