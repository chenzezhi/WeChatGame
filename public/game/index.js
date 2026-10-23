// 游戏模块控制器：组合 配置 / 人物 / 操作 / 绘制。
// 对外只暴露场景接口：enter / update / render / touchStart / touchMove / touchEnd

const cfg = require('./config.js');
const input = require('./input.js');
const playerKit = require('./player.js');
const view = require('./view.js');

const storage = require('../core/storage.js');

const state = {
  phase: 'idle',   // idle | playing
  player: null,
  cameraX: 0,
  distance: 0,
  best: 0,
  paused: false,
};

function distanceOf(x) {
  const d = Math.floor((x - cfg.START_X) / cfg.DISTANCE_PER_UNIT);
  return d > 0 ? d : 0;
}

function readBest() {
  const save = storage.read();
  return (save && typeof save.best === 'number') ? save.best : 0;
}

// 存档：最佳距离 + 当前世界位置（供「读取游戏」续玩）
function saveProgress() {
  if (!state.player) return;

  const best = Math.max(state.best, state.distance);
  storage.write({
    best: best,
    x: state.player.x,
    distance: state.distance,
    updatedAt: Date.now(),
  });
  state.best = best;
}

// 相机跟随：人物始终停在屏幕 CAMERA_ANCHOR 处（向前向后都一样）
function cameraTargetOf(playerX) {
  const target = playerX - cfg.WIDTH * cfg.CAMERA_ANCHOR;
  return target > 0 ? target : 0;
}

function resetWorld(startX) {
  state.player = playerKit.create(startX);
  state.cameraX = cameraTargetOf(state.player.x);
  state.distance = distanceOf(state.player.x);
}

function enter(payload) {
  payload = payload || {};

  input.reset();

  state.phase = 'playing';
  state.paused = false;
  state.best = readBest();

  const save = storage.read();

  if (payload.mode === 'load' && save && typeof save.x === 'number') {
    // 读档：回到上次的位置继续跑
    resetWorld(Math.max(cfg.START_X, save.x));
  } else {
    resetWorld(cfg.START_X);
  }
}

function exit() {
  saveProgress();
  input.reset();
  state.paused = false;
}

function update(dt, now) {
  if (state.phase !== 'playing') return;
  if (state.paused) return;
  if (!state.player) return;

  // ---------- 操作 ----------
  if (input.consumeJump()) playerKit.requestJump(state.player, now);

  // ---------- 人物物理 ----------
  playerKit.update(state.player, input.getDir(), now, dt);

  // ---------- 相机：前后都跟随，往回走画面也跟着回来 ----------
  state.cameraX = cameraTargetOf(state.player.x);

  // ---------- 计分 ----------
  const d = distanceOf(state.player.x);
  if (d > state.distance) state.distance = d;
}

function render(ctx, now) {
  view.draw(ctx, state, now);
}

function touchStart(e, now) {
  input.touchStart(e);
}

function touchMove(e) {
  if (state.phase !== 'playing') return;
  input.touchMove(e);
}

function touchEnd(e) {
  input.touchEnd(e);
}

// 切后台：暂停 + 存档；回前台：继续
if (typeof wx.onHide === 'function') {
  wx.onHide(function () {
    if (state.phase === 'playing') {
      state.paused = true;
      saveProgress();
    }
  });
}

if (typeof wx.onShow === 'function') {
  wx.onShow(function () {
    state.paused = false;
  });
}

module.exports = {
  enter: enter,
  exit: exit,
  update: update,
  render: render,
  touchStart: touchStart,
  touchMove: touchMove,
  touchEnd: touchEnd,
};
