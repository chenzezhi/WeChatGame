// 最简单的微信小游戏入口文件
// 小游戏会自动执行 game.js

// 获取全局画布（小游戏默认提供的第一个 canvas）
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 画布尺寸（游戏默认铺满屏幕，单位为 px）
const width = canvas.width;
const height = canvas.height;

// 方块初始位置与速度
let x = width / 2 - 25;
let y = height / 2 - 25;
let vx = 3;
let vy = 3;
const size = 50;

// 简单的触摸交互提示
let touchCount = 0;
wx.onTouchStart(() => {
  touchCount++;
});

// 主循环
function loop() {
  // 清屏
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, width, height);

  // 移动方块并碰到边缘反弹
  x += vx;
  y += vy;
  if (x <= 0 || x + size >= width) vx = -vx;
  if (y <= 0 || y + size >= height) vy = -vy;

  // 绘制方块
  ctx.fillStyle = '#fcf9ff';
  ctx.fillRect(x, y, size, size);

  // 绘制文字
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hello 微信小游戏', width / 2, 60);
  ctx.fillText('触摸次数: ' + touchCount, width / 2, 90);

  // 请求下一帧
  requestAnimationFrame(loop);
}

// 小游戏提供了 requestAnimationFrame 全局方法
if (typeof requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 1000 / 60);
}

loop();
