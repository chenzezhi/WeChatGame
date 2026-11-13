/**
 * 微信小游戏入口 —— cax 引擎最小 MVP
 *
 * 文件分两段：
 *   上半段「逻辑编排」：一行一个步骤，从上往下就是启动顺序，没有任何判断分支
 *   下半段「步骤实现」：每个函数的具体做法
 *
 * 只看上半段就能知道整个启动流程，不需要翻下半段。
 *
 * 画面：绿色方块弹跳 + FPS 显示 + 点屏幕把方块抓到手指位置。
 */
'use strict';

/* ============================================================
 * 逻辑编排（一行一个步骤，顺序即执行顺序，这里不放判断）
 * ============================================================ */
main();

function main() {
  try {
    // 加载 cax 引擎，它内部会调用 wx.createCanvas() 拿到上屏画布
    var cax = loadEngine();

    // 创建舞台对象，绑定到那块上屏画布上
    var stage = createStage(cax);

    // 往舞台上放背景、方块、FPS 文字，并把它们打包成场景对象返回
    var scene = buildScene(cax, stage);

    // 注册触摸事件：点一下屏幕就把方块移到手指的位置
    bindInput(scene);

    // 启动主循环：每帧算位置、刷 FPS、提交渲染
    startLoop(scene);

    // 打印启动成功，带上画布的物理像素尺寸
    console.log('[game] cax 引擎启动，画布 ' + scene.width + 'x' + scene.height);
  } catch (e) {
    // 任何异常都把错误信息画到屏幕上，避免卡在微信启动页看不到原因
    showError(e);
  }
}

/* ============================================================
 * 步骤实现
 * ============================================================ */

/**
 * 加载 cax 引擎
 * 它内部会创建那唯一一块上屏画布，所以这是整个项目里最早的画布来源
 */
function loadEngine() {
  // 直接 require 打包进包里的引擎文件，路径必须是字面量
  return require('./libs/cax.js');
}

/**
 * 创建舞台
 * 不传参数 = 走小游戏分支，内部直接复用上屏画布
 */
function createStage(cax) {
  // 无参构造，这是小游戏专用的分支
  var stage = new cax.Stage();

  // 命中测试用矩形，比像素级检测快很多，也够用
  stage.hitAABB = true;

  // 返回舞台，后面的步骤都往它上面挂对象
  return stage;
}

/**
 * 搭场景：背景 + 方块 + FPS 文字
 * 把所有需要每帧访问的东西打包成一个对象，避免散落成全局变量
 */
function buildScene(cax, stage) {
  // 取设备像素比，用来把逻辑像素换算成画布物理像素
  var dpr = wx.getSystemInfoSync().pixelRatio || 1;

  // 画布宽度，单位是物理像素
  var width = stage.canvas.width;

  // 画布高度，单位是物理像素
  var height = stage.canvas.height;

  // 背景：一个铺满整个画布的深色矩形
  stage.add(new cax.Rect(width, height, { fillStyle: '#0d1117' }));

  // 方块的边长，按物理像素算
  var size = Math.round(50 * dpr);

  // 创建方块，用微信绿
  var box = new cax.Rect(size, size, { fillStyle: '#07c160' });

  // 方块初始横向位置：画布水平居中
  box.x = width / 2 - size / 2;

  // 方块初始纵向位置：画布垂直居中
  box.y = height / 2 - size / 2;

  // 把方块挂到舞台上
  stage.add(box);

  // 创建 FPS 文字，字号按像素比放大保证清晰
  var label = new cax.Text('0 fps', {
    font: Math.round(14 * dpr) + 'px sans-serif',
    color: '#8b98a5'
  });

  // 文字横向位置：左边留一点边距
  label.x = Math.round(16 * dpr);

  // 文字纵向位置：避开状态栏
  label.y = Math.round(40 * dpr);

  // 把文字挂到舞台上
  stage.add(label);

  // 返回场景对象，后续步骤通过它访问所有需要变化的东西
  return {
    stage: stage,
    box: box,
    label: label,
    size: size,
    width: width,
    height: height,
    dpr: dpr,
    vx: 120 * dpr,
    vy: 180 * dpr,
    frames: 0,
    fps: 0,
    fpsTime: Date.now()
  };
}

/**
 * 绑定触摸：点屏幕把方块移到手指位置
 */
function bindInput(scene) {
  // 注册触摸开始事件
  wx.onTouchStart(function (e) {
    // 取出第一个触点，没取到就直接返回
    var t = e.touches && e.touches[0];
    if (!t) return;

    // 手指横向位置换算成画布物理像素，再减去半个方块让它居中在手指下
    scene.box.x = t.clientX * scene.dpr - scene.size / 2;

    // 手指纵向位置同样换算，减去半个方块高度
    scene.box.y = t.clientY * scene.dpr - scene.size / 2;
  });
}

/**
 * 启动主循环：每帧 更新位置 → 刷新 FPS → 渲染
 */
function startLoop(scene) {
  // 记录上一帧的时间点，用来算这一帧过了多久
  var last = Date.now();

  // 每帧要做的事情
  function frame() {
    // 当前时间
    var now = Date.now();

    // 两帧之间的间隔，单位换成秒
    var delta = (now - last) / 1000;

    // 钳制最大间隔，防止切后台再回来时间差几十秒导致方块瞬移
    var dt = Math.min(delta, 0.05);

    // 更新上一帧时间点
    last = now;

    // 让方块按速度移动一步，撞到边缘就反向
    moveBox(scene, dt);

    // 统计并刷新 FPS 文字
    refreshFps(scene, now);

    // 提交这一帧的渲染，cax 内部会清屏并重画整棵对象树
    scene.stage.update();

    // 请求下一帧，形成循环
    requestAnimationFrame(frame);
  }

  // 立刻启动第一帧
  frame();
}

/**
 * 让方块移动一步，撞到边缘就反向
 */
function moveBox(scene, dt) {
  // 取方块引用，后面几行都要用
  var box = scene.box;

  // 取方块边长，判断边界要用
  var size = scene.size;

  // 横向按速度前进，速度单位是像素/秒，乘上秒数就是这一帧走多远
  box.x += scene.vx * dt;

  // 纵向同样按速度前进
  box.y += scene.vy * dt;

  // 撞到左边界：贴住边界并把横向速度反向
  if (box.x < 0) { box.x = 0; scene.vx = -scene.vx; }

  // 撞到右边界：贴住边界并把横向速度反向
  if (box.x > scene.width - size) { box.x = scene.width - size; scene.vx = -scene.vx; }

  // 撞到上边界：贴住边界并把纵向速度反向
  if (box.y < 0) { box.y = 0; scene.vy = -scene.vy; }

  // 撞到下边界：贴住边界并把纵向速度反向
  if (box.y > scene.height - size) { box.y = scene.height - size; scene.vy = -scene.vy; }
}

/**
 * 每 500 毫秒更新一次 FPS 文字
 */
function refreshFps(scene, now) {
  // 这一帧先记一次数
  scene.frames++;

  // 距离上次刷新过了多久
  var elapsed = now - scene.fpsTime;

  // 不到 500 毫秒就先不刷新，直接返回
  if (elapsed < 500) return;

  // 用这段时间内的帧数算出每秒帧数
  scene.fps = Math.round((scene.frames * 1000) / elapsed);

  // 帧数清零，重新开始统计下一轮
  scene.frames = 0;

  // 记录这一轮刷新的时间点
  scene.fpsTime = now;

  // 把新数字写进文字对象，下一帧渲染时就会显示出来
  scene.label.text = scene.fps + ' fps';
}

/* ============================================================
 * 兜底：任何异常都直接画在屏幕上
 * 否则一旦启动失败，用户只会看到微信启动页一直转圈，完全不知道原因
 * ============================================================ */
function showError(error) {
  // 拼出可读的错误文本，优先用调用栈，其次用消息，最后强转字符串
  var msg = (error && (error.stack || error.message)) || String(error);

  // 同时往控制台打一份，方便在开发者工具里复制
  console.error('[game] 启动失败：' + msg);

  try {
    // 取屏幕信息，用来建一块能画字的画布
    var info = wx.getSystemInfoSync();

    // 设备像素比
    var dpr = info.pixelRatio || 1;

    // 逻辑宽度
    var w = info.windowWidth || 375;

    // 逻辑高度
    var h = info.windowHeight || 667;

    // 建画布（如果前面已经建过，这里拿到的是离屏画布，但依然能用来显示错误）
    var canvas = wx.createCanvas();

    // 设置画布的物理像素宽
    canvas.width = Math.floor(w * dpr);

    // 设置画布的物理像素高
    canvas.height = Math.floor(h * dpr);

    // 拿 2D 上下文准备写字
    var ctx = canvas.getContext('2d');

    // 整体缩放，之后按逻辑像素写坐标即可
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 深红底色，一眼就能看出是报错界面
    ctx.fillStyle = '#1a0000';

    // 铺满整个屏幕
    ctx.fillRect(0, 0, w, h);

    // 文字用亮红色
    ctx.fillStyle = '#ff6b6b';

    // 等宽字体，方便看堆栈里的路径
    ctx.font = '13px monospace';

    // 文字左对齐
    ctx.textAlign = 'left';

    // 把错误文本按换行拆成多行
    var lines = String(msg).split('\n');

    // 最多显示 26 行，防止超出屏幕
    for (var i = 0; i < lines.length && i < 26; i++) {
      // 每行截断到 42 个字符，防止一行太长看不见后面
      ctx.fillText(lines[i].slice(0, 42), 12, 30 + i * 20);
    }
  } catch (e) {
    // 连错误界面都画不出来时，只能往控制台打一行，没有别的办法了
    console.error('[game] 连错误都画不出来：' + (e && e.message));
  }
}
