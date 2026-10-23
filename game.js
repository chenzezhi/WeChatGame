// 微信小游戏：弹跳小球 + 触屏挡板 + 主菜单 + 本地存档
// 玩法：小球受重力下落，左右滑动屏幕移动底部挡板接住小球；
// 接住 +1 分并反弹，掉出屏幕则本局结束。
// 主菜单：开始游戏 / 读取游戏 / 退出游戏。
// 存档：切后台、挂起时自动覆盖保存（得分 + 球位置 + 挡板位置）。

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 画布尺寸（px）
const width = canvas.width;
const height = canvas.height;

// 触摸事件是逻辑像素，canvas 可能是物理像素，需要换算
const sysInfo = (wx.getSystemInfoSync && wx.getSystemInfoSync()) || {};
const scaleX = sysInfo.windowWidth ? width / sysInfo.windowWidth : 1;
const scaleY = (sysInfo.screenHeight || sysInfo.windowHeight)
  ? height / (sysInfo.screenHeight || sysInfo.windowHeight)
  : 1;

// ---------------- 参数 ----------------
const BALL_R = 23;             // 小球半径
const GRAVITY = 0.55;          // 重力加速度
const MAX_SPEED = 22;          // 速度上限
const PADDLE_W = Math.max(96, width * 0.28);
const PADDLE_H = 18;
const PADDLE_Y = height - 120; // 挡板顶部 y（底部留白，避开手势区）

// ---------------- 状态 ----------------
let state = 'menu';   // menu | countdown | playing | over
let paused = false;   // 切后台时暂停
let score = 0;
let best = 0;
let hasGame = false;  // 是否有"进行中"的对局（避免在主菜单覆盖存档）
let hasSave = false;  // 本地是否存在存档
let countdownEnd = 0; // 倒计时结束时间戳

let paddleX = (width - PADDLE_W) / 2;
let paddleTargetX = paddleX;

// 小球用圆心坐标
const ball = { x: width / 2, y: height * 0.4, vx: 4.5, vy: -8 };

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// ================= 存档 =================
const SAVE_PATH = ((wx.env && wx.env.USER_DATA_PATH) || '') + '/save.json';
let fs = null;
try { fs = wx.getFileSystemManager(); } catch (e) { fs = null; }

function saveGame() {
  if (!fs || !hasGame) return;
  const data = {
    score: score,
    ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
    paddle: paddleX,
    time: Date.now(),
  };
  try {
    fs.writeFileSync(SAVE_PATH, JSON.stringify(data), 'utf8');
    hasSave = true;
  } catch (e) {
    // 忽略写入失败
  }
}

function loadGame() {
  if (!fs) return false;
  let raw = null;
  try { raw = fs.readFileSync(SAVE_PATH, 'utf8'); } catch (e) { return false; }
  let data = null;
  try { data = JSON.parse(raw); } catch (e) { return false; }
  if (!data || !data.ball) return false;

  score = typeof data.score === 'number' ? data.score : 0;
  ball.x = clamp(typeof data.ball.x === 'number' ? data.ball.x : width / 2, BALL_R, width - BALL_R);
  ball.y = clamp(typeof data.ball.y === 'number' ? data.ball.y : height * 0.4, BALL_R, height - BALL_R);
  ball.vx = typeof data.ball.vx === 'number' ? data.ball.vx : 4.5;
  ball.vy = typeof data.ball.vy === 'number' ? data.ball.vy : -8;
  paddleX = clamp(
    typeof data.paddle === 'number' ? data.paddle : (width - PADDLE_W) / 2,
    0, width - PADDLE_W
  );
  paddleTargetX = paddleX;
  hasGame = true;
  return true;
}

function clearSave() {
  hasGame = false;
  if (!fs) return;
  try { fs.unlinkSync(SAVE_PATH); } catch (e) { /* 文件不存在 */ }
  hasSave = false;
}

function refreshSaveFlag() {
  if (!fs) { hasSave = false; return; }
  try {
    fs.accessSync(SAVE_PATH);
    hasSave = true;
  } catch (e) {
    hasSave = false;
  }
}

// ================= 流程控制 =================
function resetBall() {
  ball.x = width / 2;
  ball.y = height * 0.4;
  ball.vx = Math.random() > 0.5 ? 4.5 : -4.5;
  ball.vy = -8;
}

function beginCountdown() {
  state = 'countdown';
  paused = false;
  countdownEnd = Date.now() + 3000; // 3 秒倒计时：3 / 2 / 1
}

function startNewGame() {
  score = 0;
  resetBall();
  paddleX = (width - PADDLE_W) / 2;
  paddleTargetX = paddleX;
  hasGame = true;
  beginCountdown();
}

function resumeFromSave() {
  beginCountdown();
}

function showMenu() {
  state = 'menu';
  paused = false;
  refreshSaveFlag();
}

function exitGame() {
  saveGame();
  if (typeof wx.exitMiniProgram === 'function') {
    try { wx.exitMiniProgram({}); return; } catch (e) { /* 不支持 */ }
  }
  try {
    wx.showToast({ title: '当前环境不支持退出', icon: 'none' });
  } catch (e) { /* 忽略 */ }
  showMenu();
}

// ================= 菜单按钮 =================
const BTN_W = Math.min(width * 0.68, 420);
const BTN_H = Math.max(54, height * 0.075);
const BTN_GAP = BTN_H * 0.42;
const BTN_X = (width - BTN_W) / 2;
const BTN_Y0 = height * 0.46;

const buttons = [
  { id: 'start', label: '开始游戏' },
  { id: 'load', label: '读取游戏' },
  { id: 'exit', label: '退出游戏' },
];

function buttonRect(i) {
  return { x: BTN_X, y: BTN_Y0 + i * (BTN_H + BTN_GAP), w: BTN_W, h: BTN_H };
}

function onMenuTouch(cx, cy) {
  for (let i = 0; i < buttons.length; i++) {
    const r = buttonRect(i);
    if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
      const id = buttons[i].id;
      if (id === 'start') {
        startNewGame();
      } else if (id === 'load') {
        if (loadGame()) {
          resumeFromSave();
        } else {
          try { wx.showToast({ title: '没有找到存档', icon: 'none' }); } catch (e) { /* 忽略 */ }
        }
      } else if (id === 'exit') {
        exitGame();
      }
      return;
    }
  }
}

// ================= 输入 =================
function movePaddleToCanvasX(cx) {
  paddleTargetX = clamp(cx - PADDLE_W / 2, 0, width - PADDLE_W);
}

function touchPoint(t) {
  return { x: t.clientX * scaleX, y: t.clientY * scaleY };
}

wx.onTouchStart((e) => {
  const t = e.touches && e.touches[0];
  if (!t) return;
  const p = touchPoint(t);

  if (state === 'menu') {
    onMenuTouch(p.x, p.y);
    return;
  }
  if (state === 'over') {
    showMenu();
    return;
  }
  // 倒计时 / 游戏中都可以拖挡板
  movePaddleToCanvasX(p.x);
});

wx.onTouchMove((e) => {
  if (state === 'menu' || state === 'over') return;
  const t = e.touches && e.touches[0];
  if (t) movePaddleToCanvasX(touchPoint(t).x);
});

// 切后台 / 挂起 -> 自动存档并暂停；回到前台 -> 重新倒计时
wx.onHide(() => {
  saveGame();
  if (state === 'playing' || state === 'countdown') paused = true;
});

wx.onShow(() => {
  if (paused) beginCountdown();
});

// ================= 逻辑更新 =================
function update(now) {
  // 挡板平滑跟随手指（任何非菜单状态都可以）
  paddleX += (paddleTargetX - paddleX) * 0.35;
  paddleX = clamp(paddleX, 0, width - PADDLE_W);

  if (state === 'countdown') {
    if (now >= countdownEnd) state = 'playing';
    return;
  }

  if (paused) return;
  if (state !== 'playing') return;

  // 重力
  ball.vy += GRAVITY;
  if (ball.vy > MAX_SPEED) ball.vy = MAX_SPEED;

  const prevBottom = ball.y + BALL_R;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // 左右墙反弹（圆的边界）
  if (ball.x - BALL_R <= 0) {
    ball.x = BALL_R;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + BALL_R >= width) {
    ball.x = width - BALL_R;
    ball.vx = -Math.abs(ball.vx);
  }

  // 顶部反弹
  if (ball.y - BALL_R <= 0) {
    ball.y = BALL_R;
    ball.vy = Math.abs(ball.vy);
  }

  // 与挡板碰撞：下落中 + 上一帧球底还在挡板上方，避免"粘住"
  const paddleLeft = paddleX;
  const paddleRight = paddleX + PADDLE_W;
  const overlapX = ball.x + BALL_R > paddleLeft && ball.x - BALL_R < paddleRight;
  const crossedTop = prevBottom <= PADDLE_Y + 4;
  const reachedTop = ball.y + BALL_R >= PADDLE_Y;

  if (ball.vy > 0 && overlapX && crossedTop && reachedTop) {
    ball.y = PADDLE_Y - BALL_R;
    ball.vy = -Math.max(Math.abs(ball.vy) * 1.02, 8);
    const hitRatio = (ball.x - (paddleLeft + PADDLE_W / 2)) / (PADDLE_W / 2);
    ball.vx = clamp(ball.vx + hitRatio * 6, -MAX_SPEED, MAX_SPEED);
    if (Math.abs(ball.vx) < 2) ball.vx = ball.vx >= 0 ? 2 : -2;
    score++;
  }

  // 掉出屏幕 -> 本局结束，清掉存档（否则会读到已结束的局）
  if (ball.y - BALL_R > height) {
    if (score > best) best = score;
    state = 'over';
    clearSave();
  }
}

// ================= 绘制辅助 =================
function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#1e1e2e');
  g.addColorStop(1, '#14141f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

// 球体：径向渐变 + 高光，确保看起来是圆的
function drawBall() {
  const grad = ctx.createRadialGradient(
    ball.x - BALL_R * 0.35, ball.y - BALL_R * 0.35, BALL_R * 0.12,
    ball.x, ball.y, BALL_R
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.65, '#e3dff0');
  grad.addColorStop(1, '#b9b2d0');

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 高光小圆点
  ctx.beginPath();
  ctx.arc(ball.x - BALL_R * 0.32, ball.y - BALL_R * 0.34, BALL_R * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

function drawPaddle() {
  ctx.fillStyle = '#5ee0c0';
  roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, PADDLE_H / 2);
  ctx.fill();
}

function drawHud() {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('得分 ' + score, width / 2, 56);
  if (best > 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('最高 ' + best, width / 2, 82);
  }
}

function drawMenu() {
  ctx.textAlign = 'center';

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('弹跳小球', width / 2, height * 0.26);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('滑动挡板，别让小球掉下去', width / 2, height * 0.26 + 32);

  // 按钮
  for (let i = 0; i < buttons.length; i++) {
    const r = buttonRect(i);
    const b = buttons[i];
    const disabled = b.id === 'load' && !hasSave;

    ctx.fillStyle = disabled ? 'rgba(255,255,255,0.08)' : 'rgba(94,224,192,0.16)';
    roundRect(r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.15)' : '#5ee0c0';
    ctx.stroke();

    ctx.fillStyle = disabled ? 'rgba(255,255,255,0.35)' : '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  // 底部提示
  if (best > 0) {
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('最高得分 ' + best, width / 2, height * 0.9);
  }
}

function drawCountdown(now) {
  const remain = countdownEnd - now;
  const num = Math.max(1, Math.ceil(remain / 1000));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, width, height);

  // 数字随剩余时间轻微缩放
  const frac = 1 - (remain % 1000) / 1000; // 0 -> 1
  const size = 96 + (1 - frac) * 40;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(size) + 'px sans-serif';
  ctx.fillText(String(num), width / 2, height / 2);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('准备开始', width / 2, height / 2 + 90);
  ctx.textBaseline = 'alphabetic';
}

function drawOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('游戏结束', width / 2, height / 2 - 24);

  ctx.font = '18px sans-serif';
  ctx.fillText('本局得分 ' + score, width / 2, height / 2 + 18);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '16px sans-serif';
  ctx.fillText('点击屏幕返回主菜单', width / 2, height / 2 + 60);
}

function draw(now) {
  drawBackground();

  if (state === 'menu') {
    drawMenu();
    return;
  }

  drawHud();
  drawPaddle();
  drawBall();

  if (state === 'countdown') drawCountdown(now);
  if (state === 'over') drawOver();
}

// ================= 主循环 =================
if (typeof requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 1000 / 60);
}

function loop() {
  const now = Date.now();
  update(now);
  draw(now);
  requestAnimationFrame(loop);
}

// 启动
refreshSaveFlag();
loop();
