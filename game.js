// 微信小游戏：弹跳小球 + 触屏挡板 + 主菜单 + 本地存档
// 构建号见 BUILD 常量，会显示在画面上，用于确认运行的是哪一版代码。

const BUILD = 'B3';

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 画布尺寸：优先用 canvas，兜底用系统信息
const sysInfo = (function () {
  try { return wx.getSystemInfoSync() || {}; } catch (e) { return {}; }
})();

const width = canvas.width || sysInfo.windowWidth || 375;
const height = canvas.height || sysInfo.windowHeight || 667;

// 触摸事件是逻辑像素，canvas 可能是物理像素，需要换算
const scaleX = sysInfo.windowWidth ? width / sysInfo.windowWidth : 1;
const scaleY = (sysInfo.screenHeight || sysInfo.windowHeight)
  ? height / (sysInfo.screenHeight || sysInfo.windowHeight)
  : 1;

// ---------------- 参数 ----------------
const BALL_R = Math.max(16, width * 0.055);   // 小球半径
const GRAVITY = 0.55;
const MAX_SPEED = 22;
const PADDLE_W = Math.max(96, width * 0.28);
const PADDLE_H = 18;
const PADDLE_Y = height - 120;   // 挡板顶部 y

// ---------------- 状态 ----------------
let state = 'menu';   // menu | countdown | playing | over
let paused = false;
let score = 0;
let best = 0;
let hasGame = false;
let hasSave = false;
let countdownEnd = 0;

let paddleX = (width - PADDLE_W) / 2;
let paddleTargetX = paddleX;

const ball = { x: width / 2, y: height * 0.4, vx: 4.5, vy: -8 };

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// ================= 存档 =================
const USER_DATA = (wx.env && wx.env.USER_DATA_PATH) || '';
const SAVE_PATH = USER_DATA + '/save.json';

let fs = null;
try { fs = wx.getFileSystemManager(); } catch (e) { fs = null; }

function saveGame() {
  if (!fs || !hasGame || !USER_DATA) return;
  const data = {
    score: score,
    ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
    paddle: paddleX,
    time: Date.now(),
  };
  try {
    fs.writeFileSync(SAVE_PATH, JSON.stringify(data), 'utf8');
    hasSave = true;
  } catch (e) { /* 忽略 */ }
}

function loadGame() {
  if (!fs || !USER_DATA) return false;
  let raw = null;
  try { raw = fs.readFileSync(SAVE_PATH, 'utf8'); } catch (e) { return false; }
  let data = null;
  try { data = JSON.parse(raw); } catch (e) { return false; }
  if (!data || !data.ball) return false;

  score = typeof data.score === 'number' ? data.score : 0;
  ball.x = clamp(typeof data.ball.x === 'number' ? data.ball.x : width / 2, BALL_R, width - BALL_R);
  ball.y = clamp(typeof data.ball.y === 'number' ? data.ball.y : height * 0.4, BALL_R, PADDLE_Y - BALL_R);
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
  hasSave = false;
  if (!fs || !USER_DATA) return;
  try { fs.unlinkSync(SAVE_PATH); } catch (e) { /* 不存在 */ }
}

function refreshSaveFlag() {
  if (!fs || !USER_DATA) { hasSave = false; return; }
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
  countdownEnd = Date.now() + 3000; // 3 / 2 / 1
}

function startNewGame() {
  score = 0;
  resetBall();
  paddleX = (width - PADDLE_W) / 2;
  paddleTargetX = paddleX;
  hasGame = true;
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
  try { wx.showToast({ title: '当前环境不支持退出', icon: 'none' }); } catch (e) { /* 忽略 */ }
  showMenu();
}

// ================= 菜单按钮 =================
const BTN_W = Math.min(width * 0.68, 420);
const BTN_H = Math.max(52, height * 0.075);
const BTN_GAP = BTN_H * 0.42;
const BTN_X = (width - BTN_W) / 2;
const BTN_Y0 = height * 0.44;

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
          beginCountdown();
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

wx.onTouchStart(function (e) {
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
  movePaddleToCanvasX(p.x);
});

wx.onTouchMove(function (e) {
  if (state === 'menu' || state === 'over') return;
  const t = e.touches && e.touches[0];
  if (t) movePaddleToCanvasX(touchPoint(t).x);
});

// 切后台 / 挂起 -> 存档并暂停；回到前台 -> 重新倒计时
if (typeof wx.onHide === 'function') {
  wx.onHide(function () {
    saveGame();
    if (state === 'playing' || state === 'countdown') paused = true;
  });
}

if (typeof wx.onShow === 'function') {
  wx.onShow(function () {
    if (paused) beginCountdown();
  });
}

// ================= 逻辑更新 =================
function update(now) {
  // 挡板平滑跟随手指
  paddleX += (paddleTargetX - paddleX) * 0.35;
  paddleX = clamp(paddleX, 0, width - PADDLE_W);

  if (state === 'countdown') {
    if (now >= countdownEnd) state = 'playing';
    return;
  }

  if (paused) return;
  if (state !== 'playing') return;

  ball.vy += GRAVITY;
  if (ball.vy > MAX_SPEED) ball.vy = MAX_SPEED;

  const prevBottom = ball.y + BALL_R;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // 左右墙反弹
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

  // 与挡板碰撞
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

  // 掉出屏幕 -> 结束
  if (ball.y - BALL_R > height) {
    if (score > best) best = score;
    state = 'over';
    clearSave();
  }
}

// ================= 绘制 =================
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

function fillCircle(cx, cy, r, style) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#1e1e2e');
  g.addColorStop(1, '#14141f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

// 球体：先画实心圆，再叠渐变和高光，保证任何情况下都是圆的
function drawBall() {
  fillCircle(ball.x, ball.y, BALL_R, '#b9b2d0');
  try {
    const grad = ctx.createRadialGradient(
      ball.x - BALL_R * 0.35, ball.y - BALL_R * 0.35, BALL_R * 0.12,
      ball.x, ball.y, BALL_R
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.65, '#e3dff0');
    grad.addColorStop(1, '#b9b2d0');
    fillCircle(ball.x, ball.y, BALL_R, grad);
  } catch (e) {
    // 渐变失败就用纯色
  }
  fillCircle(ball.x - BALL_R * 0.32, ball.y - BALL_R * 0.34, BALL_R * 0.18, 'rgba(255,255,255,0.9)');
}

function drawPaddle() {
  ctx.fillStyle = '#5ee0c0';
  roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, PADDLE_H / 2);
  ctx.fill();
}

function drawHud() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('得分 ' + score, width / 2, 56);
  if (best > 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('最高 ' + best, width / 2, 82);
  }
  drawBuildTag();
}

function drawBuildTag() {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(BUILD, 8, 8);
  ctx.textBaseline = 'alphabetic';
}

function drawMenu() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('弹跳小球', width / 2, height * 0.24);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('滑动挡板，别让小球掉下去', width / 2, height * 0.24 + 32);

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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  if (best > 0) {
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('最高得分 ' + best, width / 2, height * 0.9);
  }

  drawBuildTag();
}

function drawCountdown(now) {
  const remain = countdownEnd - now;
  const num = Math.max(1, Math.ceil(remain / 1000));
  const frac = 1 - (((remain % 1000) + 1000) % 1000) / 1000;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(96 + (1 - frac) * 40) + 'px sans-serif';
  ctx.fillText(String(num), width / 2, height / 2 - 20);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('准备开始', width / 2, height / 2 + 80);
  ctx.textBaseline = 'alphabetic';
}

function drawOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
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
  globalThis.requestAnimationFrame = function (cb) {
    return setTimeout(function () { cb(Date.now()); }, 1000 / 60);
  };
}

function loop() {
  const now = Date.now();
  try {
    update(now);
    draw(now);
  } catch (e) {
    // 绘制异常时也不让循环中断，并在角落提示
    try {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff5555';
      ctx.font = '12px sans-serif';
      ctx.fillText('ERR: ' + (e && e.message ? e.message : e), 8, height - 12);
    } catch (e2) { /* 忽略 */ }
  }
  requestAnimationFrame(loop);
}

refreshSaveFlag();
loop();
