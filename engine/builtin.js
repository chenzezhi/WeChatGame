/**
 * 内置引擎（engine/builtin）
 * 只做一件事：把 app 启动流程接进引擎调度层。
 *
 * 画布与加载画面由 game.js 创建并传入，这里不碰 wx.createCanvas()。
 */
'use strict';

var bootstrap = require('../app/bootstrap.js');

function start(options) {
  options = options || {};

  console.log('[builtin] 使用内置引擎（模块化运行时）');
  if (options.screen && options.screen.push) {
    options.screen.push('使用内置引擎');
  }

  var app = bootstrap.start({
    canvas: options.canvas,
    config: options.config || {},
    screen: options.screen
  });

  return {
    name: 'builtin',
    app: app,
    stop: function () { app.stop(); }
  };
}

module.exports = { start: start };
