'use strict';

/* ==================== 功能 ====================
 * PlayerView —— 人物的渲染接线
 *
 * 把 Player（算位置和朝向）画到画布上：
 *   每帧 → 推进 Player → 按朝向取动画 → 取当前帧画到 ctx
 *
 * 走的是 Overlay（原生 ctx），层号 10，所以人物永远盖在武器、怪物上面。
 * 拿不到图集时退回旧的 cax Sprite 方案，不会黑屏。
 * ==============================================*/

/* ==================== 用法 ====================
 * const PlayerView = require('./player-view.js');
 * const PLAYER = require('../config/player.js');
 *
 * const view = PlayerView.create({ am, board, config: PLAYER });
 * view.player.dir;      // 当前朝向
 * ==============================================*/

/* ==================== 注意 ====================
 * 人物高度 = board.cellH × config.sizeRatio，宽度按单帧比例算，不会变形。
 * 动画帧号自己按时间算：帧号 = 时间 × framerate ÷ 1000 % 帧数。
 * ==============================================*/

const Player = require('./player.js');
const Ticker = require('./ticker.js');
const Overlay = require('./overlay.js');

// 人物所在层：数字越大越在上面
const LAYER = 10;

// 创建人物并挂到绘制流水线上
// options - { am, board, config }
//   am    AnimMap 实例，用来取图集和动画帧
//   board Board 实例，用来取格子尺寸
//   config public/config/player.js
// 返回 { player }，失败返回 null
function create(options) {
  const opt = options || {};
  const am = opt.am;
  const board = opt.board;
  const cfg = opt.config || {};

  if (!board || !board.path || !board.path.length) {
    console.warn('[player] 缺少 board，人物没有创建');
    return null;
  }

  // 1. 读运动数据 → 人物对象
  let data;
  try {
    data = Player.load(cfg.file);
  } catch (err) {
    console.error('[player] 人物数据读取失败：' + err.message);
    return null;
  }

  const player = new Player.Player(data, board.path);
  if (!player.route.length) {
    console.warn('[player] 路线是空的，检查 player.txt 的 route');
    return null;
  }

  // 显示高度 = 格子高 × 比例，单位 px
  const showH = board.cellH * (cfg.sizeRatio == null ? 0.8 : cfg.sizeRatio);

  // 从 AnimMap 拿到图集（用来读帧矩形和图片）
  const atlas = am ? am._atlas || am.atlas : null;

  // 按朝向取动画名，没配就用 down 兜底
  function clipOf(dir) {
    const clips = cfg.clips || {};
    return clips[dir] || clips.down || 'nf1';
  }

  // 自己维护动画时间，单位毫秒
  let animTime = 0;
  let curClip = '';

  // 2. 拿不到图集就没法用 ctx 画帧，退回去（只提示，不崩）
  if (!atlas || !atlas.image || !atlas.rects) {
    console.warn('[player] 拿不到图集，人物暂时画不出来（检查 assets.js 的 clips）');
  }

  // 3. 每帧：推进 → 更新动画时间 → 画
  Ticker.onFrame(function (dt) {
    player.update(dt);

    const clip = clipOf(player.dir);
    if (clip !== curClip) {
      curClip = clip;
      animTime = 0;
    } else {
      animTime += dt;
    }
  });

  Overlay.onDraw(function (ctx) {
    if (!atlas || !atlas.image || !atlas.rects) return;

    const clip = curClip || clipOf(player.dir);

    let rects;
    let framerate = 12;
    try {
      rects = atlas.rects(clip);
      const c = atlas.clip ? atlas.clip(clip) : null;
      if (c && c.framerate) framerate = c.framerate;
    } catch (err) {
      return;   // 动画名写错之类的，静默跳过，不刷屏
    }
    if (!rects || !rects.length) return;

    // 当前第几帧
    const idx = Math.floor((animTime / 1000) * framerate) % rects.length;
    const r = rects[idx];

    // 目标尺寸：高度固定，宽度按帧的比例缩放
    const w = showH * (r[2] / r[3]);
    const pos = player.position();

    const dx = pos.x + (board.cellW - w) / 2 + (cfg.offsetX || 0);
    const dy = pos.y + (board.cellH - showH) + (cfg.offsetY || 0);

    ctx.drawImage(atlas.image, r[0], r[1], r[2], r[3], dx, dy, w, showH);
  }, LAYER);

  console.log('[player] 已创建，路线 ' + player.route.length + ' 格，速度 ' + player.speed + ' 格/秒');

  return { player: player };
}

module.exports = { create: create };
