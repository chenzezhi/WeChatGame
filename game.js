'use strict';

/* ============================================================================
 *  微信小游戏入口 —— 只做「装配 + 启动」，不写任何游戏逻辑
 * ============================================================================
 *
 *  一行一个步骤，从上往下就是启动顺序。
 *  真正的功能都在 public/ 里各自的模块里，这里只负责把它们接起来。
 * ==========================================================================*/

main();

function main() {
  try {
    // 1. 引擎：require 进来时会调 wx.createCanvas()，那一次就是唯一的上屏画布
    var cax = require('./libs/cax.js');

    // 2. 舞台：无参构造走小游戏分支，内部直接复用那块上屏画布
    var stage = createStage(cax);

    // 3. 铺底色，后面所有内容都画在它上面
    paintBackground(cax, stage);

    // 4. 切片示例：加载 src/assets/roll.png 并按网格切片平铺展示
    require('./public/core/sheet-demo.js').start({ cax: cax, stage: stage });

    // 5. 主循环
    startLoop(stage);

    // 打印启动成功，带上画布的物理像素尺寸
    console.log('[game] 启动，画布 ' + stage.canvas.width + 'x' + stage.canvas.height);
  } catch (e) {
    // 任何异常都把错误画到屏幕上，避免卡在微信启动页看不到原因
    showError(e);
  }
}

/**
 * 创建舞台。
 * 注意必须无参：传 (w, h, canvas) 会走 Web 分支，传 4 个参数会走小程序分支，都跑不起来。
 *
 * @param {Object} cax
 * @returns {Object} stage
 */
function createStage(cax) {
  var stage = new cax.Stage();

  // 命中测试用矩形，比像素级检测快很多，也够用
  stage.hitAABB = true;

  return stage;
}

/**
 * 铺底色：一个铺满整个画布的深色矩形。
 *
 * @param {Object} cax
 * @param {Object} stage
 */
function paintBackground(cax, stage) {
  stage.add(new cax.Rect(stage.canvas.width, stage.canvas.height, { fillStyle: '#fefeff' }));
}

/**
 * 主循环：每帧只做一件事 —— 提交渲染。
 * cax 内部会清屏并重画整棵对象树。
 *
 * @param {Object} stage
 */
function startLoop(stage) {
  function frame() {
    // 提交这一帧
    stage.update();

    // 请求下一帧，形成循环
    requestAnimationFrame(frame);
  }

  // 立刻启动第一帧
  frame();
}

/* ============================================================================
 *  兜底：任何异常都直接画在屏幕上
 *  否则一旦启动失败，用户只会看到微信启动页一直转圈，完全不知道原因
 * ==========================================================================*/

/**
 * @param {Error} error
 */
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
