/**
 * 微信小游戏入口（微信运行时自动执行本文件）
 *
 * 本文件只做一件事：选择引擎并启动。
 * 具体业务全部在 app/ → features/ 里，按模块分层。
 *
 *   ENGINE = 'auto'    自动：有 cocos/ 构建产物就用 Cocos，否则用内置引擎
 *   ENGINE = 'cocos'   强制 Cocos Creator
 *   ENGINE = 'builtin' 强制内置引擎（本项目的模块化运行时）
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
    // tilePool: [0, 1, 2, 3]   // 用大图里的第几块位图来铺地板
    // grid: { columns: 0, rows: 0 }  // 0 = 按屏幕自适应
  }
};

var result = require('./engine/index.js').start({
  engine: ENGINE,
  config: GAME_CONFIG,
  debug: GAME_CONFIG.debug
});

console.log('[game] 启动完成，引擎：' + result.engine + (result.entry ? ' (' + result.entry + ')' : ''));

module.exports = result;
