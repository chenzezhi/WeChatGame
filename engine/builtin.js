/**
 * 内置引擎（engine/builtin）
 * 只做一件事：把 app 启动流程接进引擎调度层。
 * 具体运行时全在 app/、core/、state/、features/。
 */
'use strict';

var bootstrap = require('../app/bootstrap.js');

function start(options) {
  options = options || {};
  console.log('[builtin] 使用内置引擎（模块化运行时）');

  var app = bootstrap.start({
    canvas: options.canvas,
    config: options.config || {}
  });

  return {
    name: 'builtin',
    app: app,
    stop: function () { app.stop(); }
  };
}

module.exports = { start: start };
