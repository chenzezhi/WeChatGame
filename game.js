/**
 * 微信小游戏入口 —— cax 引擎最小 MVP
 *
 * 只在做一件事：验证「第三方引擎能跑起来」这一个事实。
 * 画面：绿色方块弹跳 + FPS + 点屏幕把方块抓到手指位置。
 *
 * 两个从 cax 源码里确认的关键点（别改顺序）：
 *   1. require('./libs/cax.js') 内部会调 wx.createCanvas()，
 *      那一次就是上屏画布。所以必须先 require，绝不能自己建画布。
 *   2. 小游戏用 new cax.Stage()（无参），走 isWegame 分支，
 *      内部直接用那块上屏画布。不要传 (w, h, canvas)，那是 Web 分支。
 */
'use strict';

/* 1. 引擎（必须第一个 require） */
var cax = require('./libs/cax.js');

/* 2. 舞台 */
var stage = new cax.Stage();
stage.hitAABB = true;          // 用矩形命中测试，别用像素级（更快、更稳）

var DPR = wx.getSystemInfoSync().pixelRatio || 1;
var W = stage.canvas.width;    // 物理像素
var H = stage.canvas.height;

/* 3. 三个对象：背景 / 方块 / 文字 */
stage.add(new cax.Rect(W, H, { fillStyle: '#0d1117' }));

var SIZE = 50 * DPR;
var box = new cax.Rect(SIZE, SIZE, { fillStyle: '#07c160' });
box.x = W / 2 - SIZE / 2;
box.y = H / 2 - SIZE / 2;
stage.add(box);

var label = new cax.Text('0 fps', { font: (14 * DPR) + 'px sans-serif', color: '#8b98a5' });
label.x = 16 * DPR;
label.y = 40 * DPR;
stage.add(label);

/* 4. 触摸：移到手指位置（屏幕坐标 × DPR = 画布坐标） */
wx.onTouchStart(function (e) {
  var t = e.touches && e.touches[0];
  if (!t) return;
  box.x = t.clientX * DPR - SIZE / 2;
  box.y = t.clientY * DPR - SIZE / 2;
});

/* 5. 主循环 */
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
