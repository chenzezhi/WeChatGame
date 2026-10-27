/**
 * 微信小游戏入口（微信运行时自动执行本文件）
 *
 *   ENGINE = 'auto'    存在 cocos/ 构建产物就用 Cocos，否则用内置引擎
 *   ENGINE = 'cocos'   强制 Cocos Creator
 *   ENGINE = 'builtin' 强制内置引擎
 *
 * 本文件额外做两件事，避免「卡在微信启动页什么都看不到」：
 *   1. 全局 onError 监听，把错误打到控制台；
 *   2. 启动异常时直接把错误画在画布上（同时启动页也会立刻消失）。
 */
'use strict';

var ENGINE = 'auto';

var GAME_CONFIG = {
  orientation: 'portrait',
  designWidth: 750,
  designHeight: 1334,
  debug: true,

  // 地板模块配置（覆盖 features/floor/config/floor-config.js 的默认值）
  floor: {
    // pattern: 'random' | 'checker' | 'single'
    // tilePool: [0, 1, 2, 3]
    // grid: { columns: 0, rows: 0 }
  }
};

/* ---------------- 全局错误捕获 ---------------- */
if (typeof wx.onError === 'function') {
  wx.onError(function (err) {
    console.error('[game] 未捕获错误：' + (err && (err.stack || err.message || err)));
  });
}

/** 在屏幕上画出错误信息，确保启动页不会一直挂着 */
function showFatalError(error) {
  var message = (error && (error.stack || error.message)) || String(error);
  console.error('[game] 启动失败：\n' + message);

  try {
    // 第一次 createCanvas 得到的是上屏画布
    var canvas = wx.createCanvas();
    var width = canvas.width;
    var height = canvas.height;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a0000';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ff5555';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('启动失败', 20, 60);

    ctx.fillStyle = '#ffdddd';
    ctx.font = '12px sans-serif';
    var lines = String(message).split('\n');
    for (var i = 0; i < lines.length && i < 20; i++) {
      ctx.fillText(lines[i].slice(0, 80), 20, 90 + i * 18);
    }
  } catch (e) {
    console.error('[game] 连错误信息都画不出来：' + (e && e.message));
  }
}

/* ---------------- 启动 ---------------- */
var result = { engine: 'unknown', entry: null };

try {
  result = require('./engine/index.js').start({
    engine: ENGINE,
    config: GAME_CONFIG,
    debug: GAME_CONFIG.debug
  });

  console.log('[game] 启动完成，引擎：' + result.engine + (result.entry ? ' (' + result.entry + ')' : ''));
} catch (e) {
  showFatalError(e);
}

module.exports = result;
