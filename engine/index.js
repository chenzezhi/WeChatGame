/**
 * 引擎调度中心
 * 负责：选择 / 加载 / 失败回退
 */
'use strict';

var COCOS = 'cocos';
var BUILTIN = 'builtin';

function log(msg) {
  console.log('[engine] ' + msg);
}

/**
 * 启动游戏
 * @param {Object} options { engine: 'auto'|'cocos'|'builtin', config: Object, debug: Boolean }
 * @return {Object} { engine: String, entry: String|null }
 */
function start(options) {
  options = options || {};
  var preferred = options.engine || 'auto';
  var config = options.config || {};

  if (preferred === COCOS || preferred === 'auto') {
    var cocos = require('./cocos.js');
    var entry = cocos.detect();

    if (entry) {
      log('检测到 Cocos Creator 构建产物：' + entry);
      try {
        cocos.boot({ entry: entry, config: config, debug: options.debug });
        return { engine: COCOS, entry: entry };
      } catch (e) {
        console.error('[engine] Cocos Creator 引擎启动失败，回退到内置引擎');
        console.error(e && (e.stack || e.message || e));
      }
    } else {
      log('未检测到 Cocos Creator 构建产物，使用内置引擎（接入方法见 docs/cocos.md）');
    }
  }

  require('./builtin.js').start({ config: config });
  return { engine: BUILTIN, entry: null };
}

module.exports = {
  start: start,
  COCOS: COCOS,
  BUILTIN: BUILTIN
};
