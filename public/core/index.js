// 核心控制器：把画布、输入、场景、主循环、存档组装成一个对外的 app 对象。
// 外部（入口文件 / 各模块）只需要 require 这个文件。

const canvasKit = require('./canvas.js');
const input = require('./input.js');
const scenes = require('./scenes.js');
const loop = require('./loop.js');
const storage = require('./storage.js');

const app = {
  canvas: canvasKit.canvas,
  ctx: canvasKit.ctx,
  width: canvasKit.width,
  height: canvasKit.height,
  sys: canvasKit.sys,
  scenes: scenes,
  storage: storage,
};

let started = false;

// 启动：注册输入转发 + 进入初始场景 + 跑主循环
app.start = function (initialScene) {
  if (started) return;
  started = true;

  // 所有触摸事件统一交给「当前场景」处理
  input.on('start', function (e) { scenes.touchStart(e); });
  input.on('move', function (e) { scenes.touchMove(e); });
  input.on('end', function (e) { scenes.touchEnd(e); });

  if (initialScene) scenes.switchTo(initialScene);

  loop.start(function (dt, now) {
    scenes.update(dt, now);
    scenes.render(canvasKit.ctx, now);
  });
};

module.exports = app;
