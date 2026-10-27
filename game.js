/**
 * 微信小游戏入口 —— cax 引擎最小 MVP
 *
 * 启动流程（顺序不能变）：
 *   1. require('./libs/cax.js')  ← 它内部会调 wx.createCanvas()，那次就是上屏画布
 *   2. new cax.Stage()            ← 无参，走小游戏分支，直接用那块上屏画布
 *   3. 加对象 → 每帧 stage.update()
 *
 * 没有兜底引擎。cax 挂了就把错误红字打在屏幕上，方便定位。
 */
'use strict';

/* ============================================================
 * 错误可视化（卡启动页时唯一能看到东西的地方）
 * ============================================================ */
function showError(msg) {
  console.error('[game] ' + msg);

  try {
    var info = wx.getSystemInfoSync();
    var dpr = info.pixelRatio || 1;
    var w = info.windowWidth || 375;
    var h = info.windowHeight || 667;

    var canvas = wx.createCanvas();
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ff6b6b';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';

    var lines = String(msg).split('\n');
    for (var i = 0; i < lines.length && i < 26; i++) {
      ctx.fillText(lines[i].slice(0, 42), 12, 30 + i * 20);
    }
  } catch (e) {
    console.error('[game] 连错误都画不出来：' + (e && e.message));
  }
}

/* ============================================================
 * 加载 cax（字面量 require，打包器能静态分析到）
 * ============================================================ */
var cax = null;
var loadError = null;

try {
  cax = require('./libs/cax.js');
} catch (e) {
  loadError = e;
}

if (!cax) {
  showError(
    'cax 加载失败\n\n' +
    ((loadError && (loadError.message || loadError)) || '未知原因') + '\n\n' +
    '几乎一定是 libs/cax.js 不存在。\n' +
    '在项目根目录执行：\n\n' +
    'mkdir -p libs\n' +
    'cp node_modules/cax/dist/cax.js libs/cax.js\n\n' +
    '然后重新编译。'
  );
} else {
  try {
    start();
  } catch (e) {
    showError('启动异常\n\n' + ((e && (e.stack || e.message)) || String(e)));
  }
}

/* ============================================================
 * 游戏
 * ============================================================ */
function start() {
  var info = wx.getSystemInfoSync();
  var DPR = info.pixelRatio || 1;
  var LOGIC_W = info.windowWidth;
  var LOGIC_H = info.windowHeight;

  /* ---- 舞台 ---- */
  var stage = new cax.Stage();
  stage.hitAABB = true;   // 矩形命中，比像素级快且稳

  var W = stage.canvas.width;    // 物理像素
  var H = stage.canvas.height;

  console.log('[game] 逻辑 ' + LOGIC_W + 'x' + LOGIC_H +
    ' DPR ' + DPR + ' 画布 ' + W + 'x' + H);

  if (Math.abs(W - LOGIC_W * DPR) > 2 || Math.abs(H - LOGIC_H * DPR) > 2) {
    console.warn('[game] 画布尺寸与屏幕不一致，cax 可能没设置画布尺寸');
  }

  /* ---- 三个对象：背景 / 方块 / 文字 ---- */
  stage.add(new cax.Rect(W, H, { fillStyle: '#0d1117' }));

  var SIZE = Math.round(50 * DPR);
  var box = new cax.Rect(SIZE, SIZE, { fillStyle: '#07c160' });
  box.x = W / 2 - SIZE / 2;
  box.y = H / 2 - SIZE / 2;
  stage.add(box);

  var label = new cax.Text('0 fps', {
    font: Math.round(14 * DPR) + 'px sans-serif',
    color: '#8b98a5'
  });
  label.x = Math.round(16 * DPR);
  label.y = Math.round(40 * DPR);
  stage.add(label);

  /* ---- 触摸：移到手指位置（逻辑像素 × DPR = 画布像素） ---- */
  wx.onTouchStart(function (e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    box.x = t.clientX * DPR - SIZE / 2;
    box.y = t.clientY * DPR - SIZE / 2;
  });

  /* ---- 主循环 ---- */
  var vx = 120 * DPR;
  var vy = 180 * DPR;
  var last = Date.now();
  var frames = 0;
  var fps = 0;
  var t0 = Date.now();

  function frame() {
    var now = Date.now();
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    box.x += vx * dt;
    box.y += vy * dt;

    if (box.x < 0) { box.x = 0; vx = -vx; }
    if (box.x > W - SIZE) { box.x = W - SIZE; vx = -vx; }
    if (box.y < 0) { box.y = 0; vy = -vy; }
    if (box.y > H - SIZE) { box.y = H - SIZE; vy = -vy; }

    frames++;
    if (now - t0 >= 500) {
      fps = Math.round(frames * 1000 / (now - t0));
      frames = 0;
      t0 = now;
      label.text = fps + ' fps';
    }

    stage.update();
    requestAnimationFrame(frame);
  }

  frame();
  console.log('[game] 渲染模式：cax 引擎');
}
