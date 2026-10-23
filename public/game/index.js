// 游戏模块控制器：组合 配置 / 人物 / 敌人 / 子弹 / 道具 / 分身 / 操作 / 绘制。
// 对外只暴露场景接口：enter / update / render / touchStart / touchMove / touchEnd

const cfg = require('./config.js');
const input = require('./input.js');
const playerKit = require('./player.js');
const bullets = require('./bullets.js');
const enemies = require('./enemies.js');
const pickups = require('./pickups.js');
const clones = require('./clones.js');
const view = require('./view.js');

const scenes = require('../core/scenes.js');
const storage = require('../core/storage.js');

const DEAD_TAP_DELAY = 420; // 死亡后多久才接受「点击返回」

const state = {
  phase: 'idle',   // idle | playing | dead
  player: null,
  bullets: bullets.create(),   // 玩家子弹（分身也往里打）
  eBullets: bullets.create(),  // 敌人子弹
  enemies: enemies.create(),
  pickups: pickups.create(),
  clones: clones.create(),
  cameraX: 0,
  distance: 0,
  best: 0,
  paused: false,
  deadAt: 0,
  playerHitAt: 0,   // 主体最近一次被碰撞打中的时间

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

// 两个 AABB 是否相交
function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
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
  state.pickups = pickups.create();
  state.clones = clones.create();
  state.cameraX = cameraTargetOf(state.player.x);
  state.distance = distanceOf(state.player.x);
  enemies.reset(state.enemies, state.distance);
  pickups.reset(state.pickups, state.distance);
  clones.reset(state.clones);
  state.aim = null;
  state.aimAngle = 0;
  state.nextFireAt = 0;
  state.deadAt = 0;
  state.playerHitAt = 0;
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

// 主体受伤（统一处理死亡结算）
function damagePlayer(amount, now) {
  const p = state.player;
  if (!p || !p.alive) return;

  const dead = playerKit.damage(p, amount, now);
  if (!dead) return;

  state.phase = 'dead';
  state.deadAt = now;
  state.aim = null;
  saveProgress();
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

// 玩家（及分身）子弹 → 敌人：命中扣 1 血，扣光就死
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

// 敌人子弹 → 玩家 / 分身：命中扣 1 血
function resolveEnemyBullets(now) {
  const p = state.player;
  const clist = state.clones.list;

  const list = state.eBullets.list;
  let i = 0;

  while (i < list.length) {
    const b = list[i];

    if (p && p.alive) {
      const px = p.x + p.w * 0.22;
      const py = p.y + p.h * 0.14;
      const pw = p.w * 0.56;
      const ph = p.h * 0.76;

      if (bullets.hitsRect(b, px, py, pw, ph)) {
        list.splice(i, 1);
        damagePlayer(1, now);
        continue;
      }
    }

    let hitClone = false;
    for (let k = 0; k < clist.length; k++) {
      const c = clist[k];
      if (!c.alive) continue;

      const cx = c.x + c.w * 0.22;
      const cy = c.y + c.h * 0.14;
      const cw = c.w * 0.56;
      const ch = c.h * 0.76;

      if (!bullets.hitsRect(b, cx, cy, cw, ch)) continue;

      playerKit.damage(c, 1, now);
      hitClone = true;
      break;
    }

    if (hitClone) {
      list.splice(i, 1);
      continue;
    }

    i++;
  }
}

// 身体碰撞：敌人撞到玩家 / 分身会扣血（伤害 = 敌人 dmg 属性）
function resolveContacts(now) {
  const p = state.player;
  const clist = state.clones.list;
  const list = state.enemies.list;

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const dmg = e.dmg || cfg.ENEMY_DAMAGE;

    // ---------- 主体 ----------
    if (p && p.alive) {
      const px = p.x + p.w * 0.22;
      const py = p.y + p.h * 0.14;
      const pw = p.w * 0.56;
      const ph = p.h * 0.76;

      if (overlap(px, py, pw, ph, e.x, e.y, e.w, e.h)) {
        if (now - state.playerHitAt >= cfg.ENEMY_CONTACT_COOLDOWN_MS) {
          state.playerHitAt = now;
          damagePlayer(dmg, now);
        }
      }
    }

    // ---------- 分身 ----------
    for (let k = 0; k < clist.length; k++) {
      const c = clist[k];
      if (!c.alive) continue;

      if (!overlap(c.x, c.y, c.w, c.h, e.x, e.y, e.w, e.h)) continue;
      if (now - (c.hitAt || 0) < cfg.ENEMY_CONTACT_COOLDOWN_MS) continue;

      c.hitAt = now;
      playerKit.damage(c, dmg, now);
    }
  }
}

// 吃道具：主体碰到就转化成分身（数量受 CLONE_MAX 限制）
function resolvePickups(now) {
  const p = state.player;
  if (!p || !p.alive) return;

  const it = pickups.hitTest(
    state.pickups,
    p.x + p.w * 0.1,
    p.y + p.h * 0.1,
    p.w * 0.8,
    p.h * 0.8
  );

  if (!it) return;

  pickups.take(state.pickups, it);
  clones.spawn(state.clones, p, it.power, now);
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
  enemies.update(state.enemies, dt, now, state.player, state.eBullets, state.distance);
  enemies.cull(state.enemies, state.cameraX);

  // ---------- 道具 ----------
  pickups.spawnAhead(state.pickups, state.player.x, state.distance, now);
  pickups.update(state.pickups, dt, now);
  pickups.cull(state.pickups, state.cameraX);

  // ---------- 分身（子弹打进玩家子弹容器，对怪物同样生效） ----------
  clones.update(state.clones, dt, now, state.player, state.enemies, state.bullets);
  clones.cull(state.clones, state.cameraX);

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
  resolveContacts(now);
  resolvePickups(now);
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
