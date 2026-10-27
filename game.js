/**
 * 微信小游戏入口（微信运行时自动执行本文件）
 *
 *   ENGINE = 'auto'    存在 cocos/ 构建产物就用 Cocos，否则用内置引擎
 *   ENGINE = 'cocos'   强制 Cocos Creator
 *   ENGINE = 'builtin' 强制内置引擎
 *
 * ⚠️ 两条铁律（踩过坑）：
 *   1. 第一次 wx.createCanvas() 才是「上屏画布」，必须由本文件创建并一路传下去。
 *      其它地方再调 createCanvas() 拿到的是离屏画布，画了也看不见（表现为卡启动页）。
 *   2. 先画一帧再 require 业务模块。只要画了，微信启动页立刻消失，
 *      后面卡在哪一步、报什么错，屏幕上都能看到，而不是干转圈。
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

/* ================= 全局错误捕获 ================= */
if (typeof wx.onError === 'function') {
  wx.onError(function (err) {
    console.error('[game] 未捕获错误：' + (err && (err.stack || err.message || err)));
  });
}

/* ================= 阶段 0：立刻创建上屏画布并出画面 ================= */
function createStage() {
  var info = wx.getSystemInfoSync();
  var dpr = info.pixelRatio || 1;
  var width = info.windowWidth || 375;
  var height = info.windowHeight || 667;

  // 整个游戏里唯一一次取上屏画布
  var canvas = wx.createCanvas();
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 先把背景铺上，微信启动页会马上消失
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#8b98a5';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('正在启动…', width / 2, height / 2);

  return {
    canvas: canvas,
    ctx: ctx,
    width: width,
    height: height,
    dpr: dpr
  };
}

var stage;
try {
  stage = createStage();
} catch (e) {
  console.error('[game] 创建画布失败：' + (e && (e.stack || e.message)));
}

/* ================= 加载画面（可选，失败也不影响启动） ================= */
var screen = null;
try {
  if (stage) screen = require('./app/loading-screen.js').create(stage);
} catch (e) {
  console.error('[game] 加载画面不可用：' + (e && (e.stack || e.message)));
}

function fatal(where, error) {
  var message = (error && (error.stack || error.message)) || String(error);
  console.error('[game] ' + where + ' 失败：\n' + message);

  if (screen) {
    screen.showError(where + '\n' + message);
    return;
  }

  // 连加载画面都没有，就退回到最裸的画布上写错误
  try {
    if (!stage) return;
    stage.ctx.fillStyle = '#1a0000';
    stage.ctx.fillRect(0, 0, stage.width, stage.height);
    stage.ctx.fillStyle = '#ff6b6b';
    stage.ctx.font = '12px monospace';
    stage.ctx.textAlign = 'left';
    var lines = String(message).split('\n');
    for (var i = 0; i < lines.length && i < 18; i++) {
      stage.ctx.fillText(lines[i].slice(0, 60), 16, 40 + i * 18);
    }
  } catch (e2) {
    console.error('[game] 错误信息都画不出来：' + (e2 && e2.message));
  }
}

/* ================= 阶段 1：延迟一拍再启动，让画面先刷新 ================= */
var result = { engine: 'pending', entry: null, app: null };

setTimeout(function () {
  try {
    var started = require('./engine/index.js').start({
      engine: ENGINE,
      config: GAME_CONFIG,
      debug: GAME_CONFIG.debug,
      canvas: stage ? stage.canvas : undefined,
      screen: screen
    });

    result.engine = started.engine;
    result.entry = started.entry;
    result.app = started.app;

    console.log('[game] 启动完成，引擎：' + result.engine +
      (result.entry ? ' (' + result.entry + ')' : ''));
  } catch (e) {
    fatal('启动', e);
  }
}, 0);

module.exports = result;
