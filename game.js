// 微信小游戏入口：弹跳方块 + 触屏拖动挡板
// 玩法：方块受重力不断下落，左右滑动屏幕移动底部挡板；
// 挡板接住方块 -> 方块向上弹起并 +1 分；没接住掉出屏幕 -> 游戏结束，点击重新开始。

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 画布尺寸（px）
const width = canvas.width;
const height = canvas.height;

// 触摸事件给的是逻辑像素，canvas 可能是物理像素，需要换算
const sysInfo = (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {};
const touchScale = sysInfo.windowWidth ? width / sysInfo.windowWidth : 1;

// ---------------- 参数 ----------------
const BALL_SIZE = 46;          // 方块边长
const GRAVITY = 0.55;          // 重力加速度
const MAX_SPEED = 22;          // 速度上限
const PADDLE_W = Math.max(96, width * 0.28); // 挡板宽度
const PADDLE_H = 18;
const PADDLE_Y = height - 120; // 挡板高度位置（底部留白，避开手势区）

// ---------------- 状态 ----------------
let state = 'ready'; // ready | playing | over
let score = 0;
let best = 0;

let paddleX = (width - PADDLE_W) / 2; // 挡板左上角 x
let paddleTargetX = paddleX;          // 平滑跟随目标

const ball = {
  x: width / 2 - BALL_SIZE / 2,
  y: height / 2 - BALL_SIZE / 2,
  vx: 4.5,
  vy: -8,
};

function resetBall() {
  ball.x = (width - BALL_SIZE) / 2;
  ball.y = height * 0.4 - BALL_SIZE / 2;
  ball.vx = Math.random() > 0.5 ? 4.5 : -4.5;
  ball.vy = -8;
}

function startGame() {
  score = 0;
  resetBall();
  paddleX = (width - PADDLE_W) / 2;
  paddleTargetX = paddleX;
  state = 'playing';
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// ---------------- 输入：拖动移动挡板 ----------------
function movePaddleToClientX(clientX) {
  const px = clientX * touchScale; // 触摸点对应的 canvas 坐标
  paddleTargetX = clamp(px - PADDLE_W / 2, 0, width - PADDLE_W);
}

wx.onTouchStart((e) => {
  if (state === 'over') {
    startGame();
    return;
  }
  if (state === 'ready') state = 'playing';
  const t = e.touches && e.touches[0];
  if (t) movePaddleToClientX(t.clientX);
});

wx.onTouchMove((e) => {
  const t = e.touches && e.touches[0];
  if (t) movePaddleToClientX(t.clientX);
});

// ---------------- 逻辑更新 ----------------
function update() {
  // 挡板平滑跟随手指
  paddleX += (paddleTargetX - paddleX) * 0.35;
  paddleX = clamp(paddleX, 0, width - PADDLE_W);

  if (state !== 'playing') return;

  // 重力
  ball.vy += GRAVITY;
  if (ball.vy > MAX_SPEED) ball.vy = MAX_SPEED;

  const prevBottom = ball.y + BALL_SIZE;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // 左右墙面反弹
  if (ball.x <= 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + BALL_SIZE >= width) {
    ball.x = width - BALL_SIZE;
    ball.vx = -Math.abs(ball.vx);
  }

  // 顶部反弹（让方块始终留在场内）
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
  }

  // 与挡板碰撞：只有下落中、且上一帧还在挡板上方时才判定，避免"粘住"
  const paddleLeft = paddleX;
  const paddleRight = paddleX + PADDLE_W;
  const overlapX = ball.x + BALL_SIZE > paddleLeft && ball.x < paddleRight;
  const crossedTop = prevBottom <= PADDLE_Y + 4;
  const reachedTop = ball.y + BALL_SIZE >= PADDLE_Y;

  if (ball.vy > 0 && overlapX && crossedTop && reachedTop) {
    ball.y = PADDLE_Y - BALL_SIZE;
    // 向上弹起，并根据打在挡板的位置改变水平方向
    ball.vy = -Math.max(Math.abs(ball.vy) * 1.02, 8);
    const hitRatio = (ball.x + BALL_SIZE / 2 - (paddleLeft + PADDLE_W / 2)) / (PADDLE_W / 2);
    ball.vx = clamp(ball.vx + hitRatio * 6, -MAX_SPEED, MAX_SPEED);
    if (Math.abs(ball.vx) < 2) ball.vx = ball.vx >= 0 ? 2 : -2;
    score++;
  }

  // 掉出屏幕 -> 游戏结束
  if (ball.y > height) {
    state = 'over';
    if (score > best) best = score;
  }
}

// ---------------- 渲染 ----------------
function draw() {
  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#1e1e2e');
  g.addColorStop(1, '#14141f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // 顶部信息
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('得分 ' + score, width / 2, 56);
  if (best > 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('最高 ' + best, width / 2, 82);
  }

  // 挡板
  ctx.fillStyle = '#5ee0c0';
  ctx.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);

  // 方块
  if (state !== 'over' || ball.y <= height) {
    ctx.fillStyle = '#fcf9ff';
    ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
  }

  // 提示 / 结束界面
  ctx.textAlign = 'center';
  if (state === 'ready') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '16px sans-serif';
    ctx.fillText('左右滑动屏幕移动挡板', width / 2, height / 2 - 90);
    ctx.fillText('接住方块，别让它掉下去', width / 2, height / 2 - 64);
  } else if (state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('游戏结束', width / 2, height / 2 - 20);
    ctx.font = '18px sans-serif';
    ctx.fillText('本局得分 ' + score, width / 2, height / 2 + 20);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px sans-serif';
    ctx.fillText('点击屏幕重新开始', width / 2, height / 2 + 60);
  }
}

// ---------------- 主循环 ----------------
if (typeof requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 1000 / 60);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
