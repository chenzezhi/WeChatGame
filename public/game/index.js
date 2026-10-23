// 游戏控制器：配置 / 人物 / 敌人 / 子弹 / 道具 / 分身 / 经验 / 绘制。

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

const DEAD_TAP_DELAY = 420;

const state = {
  phase: 'idle',
  player: null,
  bullets: bullets.create(),
  eBullets: bullets.create(),
  enemies: enemies.create(),
  pickups: pickups.create(),
  clones: clones.create(),
  cameraX: 0,
  distance: 0,
  best: 0,
  paused: false,
  deadAt: 0,
  playerHitAt: 0,

  level: 1,
  xp: 0,
  xpNeed: cfg.XP_BASE,
  fireMs: cfg.PLAYER_FIRE_MS_START,
  multishot: cfg.PLAYER_MULTI_START,

  joy: null,
  aim: null,
  aimAngle: 0,
  nextFireAt: 0,
};

function distanceOf(x) {
  const d = Math.floor((x - cfg.START_X) / cfg.DISTANCE_PER_UNIT);
  return d > 0 ? d : 0;
}

function readBest() {
  const save = storage.read();
  return (save && typeof save.best === 'number') ? save.best : 0;
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

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

  state.level = 1;
  state.xp = 0;
  state.xpNeed = cfg.XP_BASE;
  state.fireMs = cfg.PLAYER_FIRE_MS_START;
  state.multishot = cfg.PLAYER_MULTI_START;
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

// ---------- 升级：血量 / 攻速 / 子弹数一起成长 ----------
function applyLevelUp() {
  state.level += 1;
  state.xpNeed = cfg.XP_BASE + cfg.XP_STEP * (state.level - 1);

  const p = state.player;

  // 血量
  if (p) {
    p.maxHp = Math.min(cfg.LEVEL_HP_MAX, p.maxHp + cfg.LEVEL_HP_GAIN);
    p.hp = Math.min(p.maxHp, p.hp + cfg.LEVEL_HP_GAIN);
  }

  // 攻速
  let f = Math.round(state.fireMs * cfg.LEVEL_FIRE_RATIO);
  if (f < cfg.PLAYER_FIRE_MS_MIN) f = cfg.PLAYER_FIRE_MS_MIN;
  state.fireMs = f;

  // 子弹数量
  if (state.level % cfg.LEVEL_MULTI_EVERY === 0 && state.multishot < cfg.PLAYER_MULTI_MAX) {
    state.multishot += 1;
  }
}

function gainXp(amount) {
  if (!(amount > 0)) return;

  state.xp += amount;

  while (state.xp >= state.xpNeed) {
    state.xp -= state.xpNeed;
    applyLevelUp();
  }
}

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

  if (Math.abs(tx - cx) > p.w * 0.15) p.facing = tx > cx ? 1 : -1;

  if (now < state.nextFireAt) return;
  state.nextFireAt = now + state.fireMs;

  const n = Math.max(1, state.multishot);
  const step = (cfg.MULTI_SPREAD_DEG * Math.PI) / 180;

  for (let i = 0; i < n; i++) {
    const a = angle + (i - (n - 1) / 2) * step;
    const mx = cx + Math.cos(a) * p.w * 0.75;
    const my = cy + Math.sin(a) * p.w * 0.75;

    bullets.spawn(state.bullets, mx, my, cx + Math.cos(a) * 900, cy + Math.sin(a) * 900);
  }
}

function resolvePlayerBullets(now) {
  const list = state.bullets.list;
  let i = 0;

  while (i < list.length) {
    const b = list[i];
    const e = enemies.hitTest(state.enemies, b.x, b.y, b.r);

    if (e) {
      const wasBoss = !!e.isBoss;
      const bossX = e.x + e.w / 2;
      const xp = e.xp || 1;
      const stage = e.stage || 1;

      list.splice(i, 1);

      const killed = enemies.damage(state.enemies, e, 1, now);

      if (killed) {
        gainXp(xp);

        if (wasBoss) {
          const count = cfg.BOSS_DROP_BASE + cfg.BOSS_DROP_STEP * (stage - 1) + Math.floor(state.distance / 1000);
          const n = count > cfg.BOSS_DROP_MAX ? cfg.BOSS_DROP_MAX : count;
          pickups.spawnBurst(state.pickups, bossX, state.distance, now, n);
        }
      }

      continue;
    }

    i++;
  }
}

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

function resolveContacts(now) {
  const p = state.player;
  const clist = state.clones.list;
  const list = state.enemies.list;

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const dmg = e.dmg || cfg.ENEMY_DAMAGE;

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

function applyPickup(it, now) {
  if (it.kind === 'speed') {
    const next = Math.round(state.fireMs * cfg.SPEED_ITEM_RATIO);
    state.fireMs = next < cfg.PLAYER_FIRE_MS_MIN ? cfg.PLAYER_FIRE_MS_MIN : next;
    return;
  }

  if (it.kind === 'multi') {
    if (state.multishot < cfg.PLAYER_MULTI_MAX) state.multishot += 1;
    return;
  }

  if (it.kind === 'heal') {
    const p = state.player;
    if (p) p.hp = Math.min(p.maxHp, p.hp + (it.amount || 1));
    return;
  }

  clones.spawn(state.clones, state.player, it.power, now);
}

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
  applyPickup(it, now);
}

function update(dt, now) {
  if (state.phase !== 'playing' || state.paused || !state.player) {
    state.aim = null;
    state.joy = null;
    return;
  }

  state.joy = input.getJoystick();
  state.aim = input.getFireTarget();

  if (input.consumeJump()) playerKit.requestJump(state.player, now);

  playerKit.update(state.player, input.getDir(), now, dt);

  state.cameraX = cameraTargetOf(state.player.x);

  const d = distanceOf(state.player.x);
  if (d > state.distance) state.distance = d;

  enemies.spawnAhead(state.enemies, state.player.x, state.distance, now);
  enemies.update(state.enemies, dt, now, state.player, state.eBullets, state.distance);
  enemies.cull(state.enemies, state.cameraX);

  pickups.spawnAhead(state.pickups, state.player.x, state.distance, now);
  pickups.update(state.pickups, dt, now);
  pickups.cull(state.pickups, state.cameraX);

  // 分身：射速与子弹数跟主体同步
  clones.update(state.clones, dt, now, state.player, state.enemies, state.bullets, {
    fireMs: state.fireMs,
    multishot: state.multishot,
  });
  clones.cull(state.clones, state.cameraX);

  fireUpdate(now);

  if (!state.aim) {
    state.aimAngle = state.player.facing >= 0 ? 0 : Math.PI;
  }

  bullets.update(state.bullets, dt);
  bullets.cull(state.bullets, state.cameraX);

  bullets.update(state.eBullets, dt);
  bullets.cull(state.eBullets, state.cameraX);

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
