/**
 * 引擎调度中心
 * 负责：选择 / 加载 / 失败回退
 *
 * 注意：本文件不创建画布，画布由 game.js 创建后一路传下去。
 */
'use strict';

var COCOS = 'cocos';
var BUILTIN = 'builtin';

function makeLogger(screen) {
  return function (text, level) {
    console.log('[engine] ' + text);
    if (screen && screen.push) screen.push(text, level);
  };
}

/**
 * 启动游戏
 * @param {Object} options { engine, config, debug, canvas, screen }
 * @return {Object} { engine, entry, app }
 */
function start(options) {
  options = options || {};

  var preferred = options.engine || 'auto';
  var config = options.config || {};
  var log = makeLogger(options.screen);

  if (preferred === COCOS || preferred === 'auto') {
    var cocos = require('./cocos.js');
    var entry = null;

    try {
      entry = cocos.detect();
    } catch (e) {
      log('检测 Cocos 产物出错：' + ((e && e.message) || e), 'error');
    }

    if (entry) {
      log('检测到 Cocos Creator 构建产物：' + entry);
      try {
        var cocosApp = cocos.boot({ entry: entry, config: config, debug: options.debug });
        return { engine: COCOS, entry: entry, app: cocosApp };
      } catch (e) {
        console.error('[engine] Cocos 引擎启动失败，回退到内置引擎');
        console.error(e && (e.stack || e.message || e));
        if (options.screen && options.screen.push) {
          options.screen.push('[警告] Cocos 启动失败，回退内置引擎', 'error');
        }
      }
    } else {
      log('未检测到 Cocos 产物，使用内置引擎');
    }
  }

  var builtinApp = require('./builtin.js').start({
    config: config,
    canvas: options.canvas,
    screen: options.screen
  });

  return { engine: BUILTIN, entry: null, app: builtinApp };
}

module.exports = {
  start: start,
  COCOS: COCOS,
  BUILTIN: BUILTIN
};
