/**
 * Cocos Creator 引擎接入层
 *
 * 工作原理：
 *   1. detect() 用小游戏文件系统检查 cocos/ 下是否存在构建产物入口；
 *   2. boot() 先注入小游戏环境适配（engine/adapter.js），再加载构建产物入口；
 *   3. 构建产物内部的相对 require 会在 cocos/ 目录内自行解析，互不干扰。
 *
 * 注意：不要在这里调用 wx.createCanvas()。
 * 小游戏里第一次 wx.createCanvas() 返回的是「上屏画布」，
 * 必须留给引擎自己去创建，否则 Cocos 会画到离屏画布上（黑屏）。
 */
'use strict';

/** 支持的构建产物入口（按优先级） */
var ENTRIES = [
  {
    path: 'cocos/game.js',
    load: function () { return require('../cocos/game.js'); }
  },
  {
    path: 'cocos/application.js',
    load: function () { return require('../cocos/application.js'); }
  }
];

function fileExists(p) {
  try {
    var fs = wx.getFileSystemManager();
    if (!fs || typeof fs.accessSync !== 'function') return false;
    fs.accessSync(p); // 失败会抛异常
    return true;
  } catch (e) {
    return false;
  }
}

/** 检测是否存在可用的 Cocos 构建产物，返回入口路径或 null */
function detect() {
  for (var i = 0; i < ENTRIES.length; i++) {
    if (fileExists(ENTRIES[i].path)) return ENTRIES[i].path;
  }
  return null;
}

function findLoader(entry) {
  for (var i = 0; i < ENTRIES.length; i++) {
    if (ENTRIES[i].path === entry) return ENTRIES[i];
  }
  return null;
}

/** 启动 Cocos Creator 引擎 */
function boot(options) {
  options = options || {};
  var entry = options.entry || detect();
  if (!entry) throw new Error('未找到 Cocos Creator 构建产物入口');

  var loader = findLoader(entry);
  if (!loader) throw new Error('未知的 Cocos 入口：' + entry);

  // 1. 补齐小游戏缺少的 window / document / navigator 等全局对象
  require('./adapter.js').install();

  // 2. 加载引擎（Cocos 构建产物内部自带 adapter 时会自行初始化）
  var result = loader.load();
  console.log('[cocos] 引擎启动成功：' + entry);
  return result;
}

module.exports = {
  detect: detect,
  boot: boot,
  entries: ENTRIES
};
