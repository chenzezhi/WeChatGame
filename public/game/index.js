// 游戏模块控制器：组合 配置 / 人物 / 敌人 / 子弹 / 操作 / 绘制。
// 对外只暴露场景接口：enter / update / render / touchStart / touchMove / touchEnd

const cfg = require('./config.js');
const input = require('./input.js');
const playerKit = require('./player.js');
const bullets = require('./bullets.js');
const enemies = require('./enemies.js');
const view = require('./view.js');

const scenes = require('../core/scenes.js');
const storage = require('../core/storage.js');

const DEAD_TAP_DELAY = 420; // 死亡后多久才接受「点击返回」

const state = {
  phase: 'idle',   // idle | playing | dead
  player: null,
  bullets: bullets.create(),   // 玩家子弹
  eBullets: bullets.create(),  // 敌人子弹
  enemies: enemies.create(),
  cameraX: 0,
  distance: 0,
  best: 0,
  paused: false,
  deadAt: 0,

  // 操作 / 瞄准相关（供绘制层只读）
  joy: null,        // 摇杆状态
  aim: null,        // 当前瞄准点（屏幕坐标），没有按住则为 null
  aimAngle: 0,      // 当前枪口角度（弧度）
  nextFireAt: 0,    // 下一次允许开火的时间
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
  state.bullets = bullets.create();
  state.eBullets = bullets.create();
  state.enemies = enemies.create();
  state.cameraX = cameraTargetOf(state.player.x);
  state.distance = distanceOf(state.player.x);
  enemies.reset(state.enemies, state.distance);
  state.aim = null;
  state.aimAngle = 0;
  state.nextFireAt = 0;
  state.deadAt = 0;
}

function enter(payload) {
  payload = payload || {};

  input.reset();

  state.phase = 'playing';
  state.paused = false;
  state.best = readBest();
  state.joy = input.getJoystick();

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

// 按住屏幕（摇杆以外）就按固定射速朝触摸点连发
function fireUpdate(now) {
  const p = state.player;
  const aim = state.aim;
  if (!p || !aim || !p.alive) return;

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h * 0.45;
  const tx = aim.x + state.cameraX;
  const ty = aim.y;

  const angle = Math.atan2(ty - cy, tx - cx);
  state.aimAngle = angle;

  // 朝向跟着准星走
  if (Math.abs(tx - cx) > p.w * 0.15) p.facing = tx > cx ? 1 : -1;

  if (now < state.nextFireAt) return;
  state.nextFireAt = now + cfg.BULLET_FIRE_MS;

  // 枪口位置：从身体中心朝射击方向偏出去一点
  const mx = cx + Math.cos(angle) * p.w * 0.75;
  const my = cy + Math.sin(angle) * p.w * 0.75;

  bullets.spawn(state.bullets, mx, my, tx, ty);
}

// 玩家子弹 → 敌人：命中扣 1 血，扣光就死
function resolvePlayerBullets(now) {
  const list = state.bullets.list;
  let i = 0;

  while (i < list.length) {
    const b = list[i];
    const e = enemies.hitTest(state.enemies, b.x, b.y, b.r);

    if (e) {
      list.splice(i, 1);
      enemies.damage(state.enemies, e, 1, now);
      continue;
    }

    i++;
  }
}

// 敌人子弹 → 玩家：命中扣 1 血，扣光就死亡结算
function resolveEnemyBullets(now) {
  const p = state.player;
  if (!p || !p.alive) return;

  const px = p.x + p.w * 0.22;
  const py = p.y + p.h * 0.14;
  const pw = p.w * 0.56;
  const ph = p.h * 0.76;

  const list = state.eBullets.list;
  let i = 0;

  while (i < list.length) {
    const b = list[i];

    if (bullets.hitsRect(b, px, py, pw, ph)) {
      list.splice(i, 1);

      const dead = playerKit.damage(p, 1, now);
      if (dead) {
        state.phase = 'dead';
        state.deadAt = now;
        state.aim = null;
        saveProgress();
        return;
      }

      continue;
    }

    i++;
  }
}

function update(dt, now) {
  if (state.phase !== 'playing' || state.paused || !state.player) {
    state.aim = null;
    state.joy = null;
    return;
  }

  // ---------- 操作 ----------
  state.joy = input.getJoystick();
  state.aim = input.getFireTarget();

  if (input.consumeJump()) playerKit.requestJump(state.player, now);

  // ---------- 人物物理 ----------
  playerKit.update(state.player, input.getDir(), now, dt);

  // ---------- 相机：前后都跟随，往回走画面也跟着回来 ----------
  state.cameraX = cameraTargetOf(state.player.x);

  // ---------- 计分 ----------
  const d = distanceOf(state.player.x);
  if (d > state.distance) state.distance = d;

  // ---------- 敌人 ----------
  enemies.spawnAhead(state.enemies, state.player.x, state.distance, now);
  enemies.update(state.enemies, dt, now, state.player, state.eBullets);
  enemies.cull(state.enemies, state.cameraX);

  // ---------- 射击 ----------
  fireUpdate(now);

  if (!state.aim) {
    // 没在瞄准时枪口朝人物面朝方向
    state.aimAngle = state.player.facing >= 0 ? 0 : Math.PI;
  }

  // ---------- 子弹 ----------
  bullets.update(state.bullets, dt);
  bullets.cull(state.bullets, state.cameraX);

  bullets.update(state.eBullets, dt);
  bullets.cull(state.eBullets, state.cameraX);

  // ---------- 碰撞 ----------
  resolvePlayerBullets(now);
  resolveEnemyBullets(now);
}

function render(ctx, now) {
  view.draw(ctx, state, now);
}

function touchStart(e, now) {
  if (state.phase === 'dead') {
    if (now - state.deadAt < DEAD_TAP_DELAY) return;
    scenes.switchTo('menu');
    return;
  }

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
    input.reset();
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
