'use strict';

/* ==================== 功能 ====================
 * Player —— 人物移动
 *
 * 按一条「格子序号路线」在棋盘上走，算出每帧的位置和朝向。
 * 只算位置和方向，不碰渲染、不碰图片。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Player = require('./player.js');
 *
 * const cfg = Player.load('src/data/player.txt');   // { speed, pauseMs, route }
 * const p = new Player(cfg, board.path);            // board.path 是 Cell 数组
 *
 * p.update(dt);        // 每帧喂一次 dt，单位毫秒
 * p.position();        // { x, y } 当前像素坐标
 * p.dir;               // 'up' | 'down' | 'left' | 'right'
 * ==============================================*/

/* ==================== 注意 ====================
 * 路线里的序号是 Cell.index，不是行列。空洞不占序号。
 * 路线走完自动从头循环，不会停。
 * 朝向由「当前格 → 下一格」的坐标差算出：横向差大就是左右，纵向差大就是上下。
 * ==============================================*/

// 读人物数据文件并解析
// path - 任意文本文件路径
// 返回 { speed, pauseMs, route: number[] }
//   speed   - 每秒走多少格
//   pauseMs - 每格停留毫秒
//   route   - 格子序号数组
function load(path) {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
    throw new Error('[player] 当前环境读不了包内文件：' + path);
  }
  const text = wx.getFileSystemManager().readFileSync(path, 'utf8');
  return parse(text);
}

// 解析「字段 = 值」格式的人物数据
// text - 文件内容
// 返回 { speed, pauseMs, route }，缺的字段给默认值
function parse(text) {
  const out = { speed: 1, pauseMs: 0, route: [] };

  const lines = String(text || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行和注释行跳过
    if (!line || line[0] === '#') continue;

    const eq = line.indexOf('=');
    if (eq < 0) continue;

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();

    if (key === 'speed') out.speed = Number(value) || 0;
    else if (key === 'pauseMs') out.pauseMs = Number(value) || 0;
    else if (key === 'route') out.route = value.split(/\s+/).map(Number).filter((n) => !isNaN(n));
  }

  return out;
}

// 由两格的坐标算出朝向
// from, to - Cell 对象，取 x / y
// 返回 'up' | 'down' | 'left' | 'right'，算不出时返回 'down'
function directionOf(from, to) {
  if (!from || !to) return 'down';

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // 横向移动更多就是左右，否则算上下
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

// 人物：沿路线循环移动
// cfg - parse/load 得到的 { speed, pauseMs, route }
// cells - Board.path，用 route 里的序号去取对应的格子
class Player {
  constructor(cfg, cells) {
    const list = cells || [];

    // 把序号换成格子对象，序号越界的丢掉
    this.route = (cfg.route || []).map((i) => list[i]).filter(Boolean);

    this.speed = cfg.speed || 0;      // 每秒走多少格
    this.pauseMs = cfg.pauseMs || 0;  // 每格停留毫秒

    this.i = 0;      // 当前在路线上的第几个格子
    this.t = 0;      // 段内进度，0 到 1
    this.pause = 0;  // 还要停留多少毫秒

    // 刚踏进格子的标记：只在一帧为 true，battle 靠它决定何时开火
    this.entered = false;

    // 跳跃动画：计时（毫秒）与时长
    this.jumpT = 99999;
    this.jumpMs = cfg.jumpMs || 220;

    // 到格判定误差：离目标格中心小于这个距离就算到了，单位 px
    // 0 就是必须走到格心；给一点误差提前触发，跑起来更顺
    const w = this.route.length ? this.route[0].w : 0;
    this.arriveTolerance = (cfg.arriveToleranceRatio || 0) * w;
  }

  // 跳跃动画的抬升比例 0~1：0 在地上，1 在最高点
  get jumpRatio() {
    const ms = this.jumpMs || 1;
    if (this.jumpT >= ms) return 0;
    return Math.sin(Math.PI * (this.jumpT / ms));
  }

  // 当前所在格子
  get current() {
    return this.route[this.i] || null;
  }

  // 下一个格子（走完一圈回到开头）
  get next() {
    if (!this.route.length) return null;
    return this.route[(this.i + 1) % this.route.length];
  }

  // 当前朝向
  get dir() {
    return directionOf(this.current, this.next);
  }

  // 推进时间
  // dt - 距上一帧的毫秒数
  update(dt) {
    // 每帧先清标记，只有真到格时才重新置 true
    this.entered = false;
    this.jumpT += dt;

    if (!this.route.length) return;

    // 还在停留：先扣停留时间，扣完这一帧就不走了
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause > 0) return;
      this.pause = 0;
    }

    // 按速度推进段内进度
    this.t += (dt / 1000) * this.speed;

    // 走过一格就换到下一格；一帧跨过好几格也能追上
    while (this.t >= 1) {
      this.t -= 1;
      this.i = (this.i + 1) % this.route.length;

      // 到格：标记一次，并开始跳一下
      this.entered = true;
      this.jumpT = 0;

      // 到站停留
      if (this.pauseMs > 0) {
        this.t = 0;
        this.pause = this.pauseMs;
        break;
      }
    }

    // 误差判定：离下一格中心很近了也算到达，不用恰好踩在格心
    if (this.arriveTolerance > 0) {
      const a = this.current;
      const b = this.next;

      if (a && b) {
        const px = a.x + (b.x - a.x) * this.t;
        const py = a.y + (b.y - a.y) * this.t;
        const dx = b.x - px;
        const dy = b.y - py;

        if (Math.sqrt(dx * dx + dy * dy) <= this.arriveTolerance) {
          this.i = (this.i + 1) % this.route.length;
          this.t = 0;
          this.entered = true;
          this.jumpT = 0;
        }
      }
    }
  }

  // 当前的像素位置
  // 返回 { x, y }，取格子左上角；停留时就是当前格子的位置
  position() {
    const a = this.current;
    const b = this.next;
    if (!a) return { x: 0, y: 0 };
    if (!b) return { x: a.x, y: a.y };

    // 停留中不插值，直接站在格子上
    const t = this.pause > 0 ? 0 : this.t;

    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }
}

module.exports = { Player: Player, load: load, parse: parse, directionOf: directionOf };
