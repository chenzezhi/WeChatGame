'use strict';

/* ==================== 功能 ====================
 * PlayerView —— 人物的渲染接线
 *
 * 把 Player（算位置和朝向）接到 cax 舞台上：
 *   每帧 → 推进 Player → 按朝向换动画 → 把坐标写给 Sprite
 * 自己不算移动、不算法向，只做「逻辑 → 画面」的转接。
 * ==============================================*/

/* ==================== 用法 ====================
 * const PlayerView = require('./player-view.js');
 * const PLAYER = require('../config/player.js');
 *
 * const view = PlayerView.create({ stage, am, board, config: PLAYER });
 * view.player.dir;      // 当前朝向，想联动别的东西时用
 * ==============================================*/

/* ==================== 注意 ====================
 * 换了朝向要换图，这里不去 remove 旧 Sprite（cax 的移除行为不确定），
 * 而是把旧的挪到屏幕外 x = -99999，任何渲染器都吃这一招。
 *
 * 人物高度由 config.sizeRatio × 格子高 决定，只在创建时算一次。
 * ==============================================*/

const Player = require('./player.js');
const Ticker = require('./ticker.js');

// 创建人物并挂到舞台上，同时登记每帧更新
// options - { stage, am, board, config }
//   stage  舞台
//   am     AnimMap 实例（动画连接器）
//   board  Board 实例，用来取格子坐标和格子大小
//   config public/config/player.js
// 返回 { player, 拿到当前 Sprite 的方法 }，失败时返回 null
function create(options) {
  const opt = options || {};
  const stage = opt.stage;
  const am = opt.am;
  const board = opt.board;
  const cfg = opt.config || {};

  if (!stage || !am || !board || !board.path || !board.path.length) {
    console.warn('[player] 缺少 stage / am / board，人物没有创建');
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

  // 人物显示高度 = 格子高 × 比例，单位 px
  const height = board.cellH * (cfg.sizeRatio == null ? 0.8 : cfg.sizeRatio);

  // 当前挂着的 Sprite 和它用的动画名
  let sprite = null;
  let curClip = null;

  // 按朝向取动画名，没配就用 down 兜底
  function clipOf(dir) {
    const clips = cfg.clips || {};
    return clips[dir] || clips.down || 'nf1';
  }

  // 确保当前 Sprite 用的是这个动画；换动画就新建一个，旧的挪出屏幕
  function useClip(clip) {
    if (clip === curClip && sprite) return;
    if (sprite) sprite.x = -99999;
    sprite = am.add(stage, clip, 0, 0, height);
    curClip = clip;
  }

  // 2. 先摆一次，避免第一帧出现在原点
  useClip(clipOf(player.dir));
  applyPosition();

  // 把 Player 的坐标写给 Sprite
  function applyPosition() {
    const pos = player.position();
    sprite.x = pos.x + (cfg.offsetX || 0);
    sprite.y = pos.y + (cfg.offsetY || 0);
  }

  // 3. 每帧：推进逻辑 → 换动画 → 写坐标
  Ticker.onFrame(function (dt) {
    player.update(dt);
    useClip(clipOf(player.dir));
    applyPosition();
  });

  console.log('[player] 已创建，路线 ' + player.route.length + ' 格，速度 ' + player.speed + ' 格/秒');

  return {
    player: player,
    // 当前 Sprite，想调层级或加特效时用
    get sprite() {
      return sprite;
    },
  };
}

module.exports = { create: create };
