// 游戏控制器：配置 / 人物 / 敌人 / 子弹 / 道具 / 分身 / 经验 / 绘制。

const cfg = require('./config.js');
const input = require('./input.js');
const playerKit = require('./player.js');
const bullets = require('./bullets.js');
const enemies = require('./enemies.js');
const pickups = require('./pickups.js');
const clones = require('./clones.js');
const view = require('./view.js');
const audio = require('../core/audio.js');

const scenes = require('../core/scenes.js');
const storage = require('../core/storage.js');
const profile = require('../core/profile.js');

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
  coins: 0,
  coinValue: cfg.COIN_VALUE_BASE,
  paused: false,
  deadAt: 0,
  playerHitAt: 0,

  level: 1,
  xp: 0,
  xpNeed: cfg.XP_BASE,
  fireMs: cfg.PLAYER_FIRE_MS_START,
  multishot: cfg.PLAYER_MULTI_START,
  damage: cfg.PLAYER_DAMAGE_START,

  joy: null,
  aimStick: null,
  firing: false,
  aimAngle: 0,
  nextFireAt: 0,

  bossAlive: false,

  // 游戏内菜单（暂停弹窗）
  menuOpen: false,
  pausePanel: null,
  pauseButtons: [],
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

// ---------------- 暂停弹窗布局 ----------------
function buildPauseLayout() {
  const w = Math.min(cfg.WIDTH * 0.74, 300);
  const labelH = 52;
  const padY = 16;
  const bh = 52;
  const gap = 14;
  const padBottom = 22;

  const totalH = labelH + padY + bh * 3 + gap * 2 + padBottom;
  const x = (cfg.WIDTH - w) / 2;
  const y = Math.max(40, (cfg.HEIGHT - totalH) / 2);

  const bw = w - 44;
  const bx = x + 22;
  const first = y + labelH + padY;

  const ids = ['resume', 'menu', 'exit'];
  const labels = ['返回游戏', '返回主菜单', '退出游戏'];

  const buttons = [];
  for (let i = 0; i < ids.length; i++) {
    buttons.push({
      id: ids[i],
      label: labels[i],
      x: bx,
      y: first + i * (bh + gap),
      w: bw,
      h: bh,
    });
  }

  return { panel: { x: x, y: y, w: w, h: totalH }, buttons: buttons };
}

function openPause() {
  const lay = buildPauseLayout();

  state.pausePanel = lay.panel;
  state.pauseButtons = lay.buttons;
  state.menuOpen = true;

  state.aimStick = null;
  state.firing = false;
  state.joy = null;

  input.reset();
}

function closePause() {
  state.menuOpen = false;
  state.pausePanel = null;
  state.pauseButtons = [];

  state.aimStick = null;
  state.firing = false;
  state.joy = null;

  input.reset();
}

function hitPauseButton(x, y) {
  const list = state.pauseButtons || [];

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }

  return null;
}

function hitMenuButton(x, y) {
  return x >= cfg.MENU_BTN_X && x <= cfg.MENU_BTN_X + cfg.MENU_BTN_W &&
         y >= cfg.MENU_BTN_Y && y <= cfg.MENU_BTN_Y + cfg.MENU_BTN_H;
}

function exitApp() {
  if (typeof wx.exitMiniProgram === 'function') {
    try { wx.exitMiniProgram({}); return; } catch (e) { /* 不支持 */ }
  }
  try { wx.showToast({ title: '当前环境不支持退出', icon: 'none' }); } catch (e) { /* 忽略 */ }
}

// 进度存档（可被死亡删除）
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
  state.aimStick = null;
  state.firing = false;
  state.aimAngle = 0;
  state.nextFireAt = 0;
  state.deadAt = 0;
  state.playerHitAt = 0;
  state.bossAlive = false;

  state.menuOpen = false;
  state.pausePanel = null;
  state.pauseButtons = [];

  state.level = 1;
  state.xp = 0;
  state.xpNeed = cfg.XP_BASE;
  state.fireMs = cfg.PLAYER_FIRE_MS_START;
  state.multishot = cfg.PLAYER_MULTI_START;
  state.damage = cfg.PLAYER_DAMAGE_START;
}

// 伤害保留一位小数，避免浮点误差累积
function roundDamage(v) {
  const n = Math.round(v * 10) / 10;
  return n > cfg.PLAYER_DAMAGE_MAX ? cfg.PLAYER_DAMAGE_MAX : n;
}

// 开局套用玩家资产：永久升级 + 本局已购道具（用完即扣）
function applyProfileAssets() {
  const prof = profile.read();

  state.coins = prof.coins;
  state.coinValue = Math.min(
    cfg.COIN_VALUE_MAX,
    cfg.COIN_VALUE_BASE + prof.bossKills * cfg.COIN_VALUE_GROWTH
  );

  const p = state.player;

  const hpLv = prof.upgrades.hp || 0;
  if (hpLv > 0 && p) {
    p.maxHp = Math.min(cfg.LEVEL_HP_MAX, p.maxHp + hpLv * 2);
    p.hp = p.maxHp;
  }

  const fireLv = prof.upgrades.fire || 0;
  if (fireLv > 0) {
    let f = Math.round(state.fireMs * Math.pow(0.92, fireLv));
    if (f < cfg.PLAYER_FIRE_MS_MIN) f = cfg.PLAYER_FIRE_MS_MIN;
    state.fireMs = f;
  }

  const multiLv = prof.upgrades.multi || 0;
  if (multiLv > 0) {
    state.multishot = Math.min(cfg.PLAYER_MULTI_MAX, state.multishot + multiLv);
  }

  const damageLv = prof.upgrades.damage || 0;
  if (damageLv > 0) {
    state.damage = roundDamage(state.damage + damageLv * cfg.DAMAGE_SHOP_GAIN);
  }

  const items = prof.items || {};
  let used = false;

  if (items.heal > 0 && p) {
    p.maxHp = Math.min(cfg.LEVEL_HP_MAX, p.maxHp + 3 * items.heal);
    p.hp = p.maxHp;
    used = true;
  }

  if (items.speed > 0) {
    let f = Math.round(state.fireMs * Math.pow(cfg.SPEED_ITEM_RATIO, items.speed));
    if (f < cfg.PLAYER_FIRE_MS_MIN) f = cfg.PLAYER_FIRE_MS_MIN;
    state.fireMs = f;
    used = true;
  }

  if (items.multi > 0) {
    state.multishot = Math.min(cfg.PLAYER_MULTI_MAX, state.multishot + items.multi);
    used = true;
  }

  if (items.damage > 0) {
    state.damage = roundDamage(state.damage + items.damage * cfg.DAMAGE_ITEM_GAIN);
    used = true;
  }

  if (items.clone > 0 && p) {
    for (let i = 0; i < items.clone; i++) {
      clones.spawn(state.clones, p, cfg.CLONE_HP_BASE, 0);
    }
    used = true;
  }

  if (used) {
    prof.items = { heal: 0, speed: 0, multi: 0, clone: 0, damage: 0 };
    profile.write(prof);
  }
}

function enter(payload) {
  payload = payload || {};

  input.reset();

  state.phase = 'playing';
  state.paused = false;
  state.best = readBest();
  state.joy = input.getJoystick();
  state.aimStick = input.getAimStick();
  state.firing = false;

  const save = storage.read();

  if (payload.mode === 'load' && save && typeof save.x === 'number') {
    resetWorld(Math.max(cfg.START_X, save.x));
  } else {
    resetWorld(cfg.START_X);
  }

  applyProfileAssets();
  audio.playBgm();
}

function exit() {
  if (state.phase === 'playing') saveProgress();
  input.reset();
  state.paused = false;
  state.menuOpen = false;
}

// ---------- 金币 ----------
function addCoins(n) {
  if (!(n > 0)) return;

  state.coins += n;

  const prof = profile.read();
  prof.coins = state.coins;
  profile.write(prof);
}

// ---------- 升级：血量 / 攻速 / 子弹数一起成长，并且回满血 ----------
function applyLevelUp() {
  state.level += 1;
  state.xpNeed = cfg.XP_BASE + cfg.XP_STEP * (state.level - 1);

  const p = state.player;

  if (p) {
    p.maxHp = Math.min(cfg.LEVEL_HP_MAX, p.maxHp + cfg.LEVEL_HP_GAIN);
    p.hp = p.maxHp;   // 升级回满血
  }

  let f = Math.round(state.fireMs * cfg.LEVEL_FIRE_RATIO);
  if (f < cfg.PLAYER_FIRE_MS_MIN) f = cfg.PLAYER_FIRE_MS_MIN;
  state.fireMs = f;

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
  if (!dead) {
    audio.play('hurt');
    return;
  }

  state.phase = 'dead';
  state.deadAt = now;
  state.firing = false;
  state.aimStick = null;
  state.bossAlive = false;
  state.menuOpen = false;

  audio.play('hurt');

  // 死亡：删掉进度存档（玩家资产 profile.json 不受影响）
  storage.clear();
}

// 右摇杆方向 = 子弹方向
function fireUpdate(now) {
  const p = state.player;
  const s = state.aimStick;

  state.firing = !!(s && s.active);

  if (!p || !p.alive || !state.firing) return;

  const angle = Math.atan2(s.dy, s.dx);
  state.aimAngle = angle;

  if (Math.cos(angle) >= 0) p.facing = 1;
  else p.facing = -1;

  if (now < state.nextFireAt) return;
  state.nextFireAt = now + state.fireMs;

  audio.play('shoot');

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h * 0.45;

  const n = Math.max(1, state.multishot);
  const step = (cfg.MULTI_SPREAD_DEG * Math.PI) / 180;

  for (let i = 0; i < n; i++) {
    const a = angle + (i - (n - 1) / 2) * step;
    const mx = cx + Math.cos(a) * p.w * 0.75;
    const my = cy + Math.sin(a) * p.w * 0.75;

    bullets.spawn(state.bullets, mx, my, cx + Math.cos(a) * 900, cy + Math.sin(a) * 900);
  }
}

// 我方子弹 ↔ 敌方子弹：相交则两发一起消失
function resolveBulletCollisions() {
  const mine = state.bullets.list;
  const theirs = state.eBullets.list;

  let i = 0;

  while (i < mine.length) {
    const a = mine[i];
    let hit = false;

    for (let k = 0; k < theirs.length; k++) {
      const b = theirs[k];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const rr = a.r + b.r;

      if (dx * dx + dy * dy > rr * rr) continue;

      theirs.splice(k, 1);
      hit = true;
      break;
    }

    if (hit) {
      mine.splice(i, 1);
      continue;
    }

    i++;
  }
}

function resolvePlayerBullets(now) {
  const list = state.bullets.list;
  const dmg = Math.max(0.1, state.damage || 1);
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
      audio.play('hit');

      const killed = enemies.damage(state.enemies, e, dmg, now);

      if (killed) {
        gainXp(xp);

        if (wasBoss) {
          state.bossAlive = false;

          const prof = profile.read();
          prof.bossKills = (prof.bossKills || 0) + 1;
          prof.coins = state.coins;
          profile.write(prof);

          state.coinValue = Math.min(
            cfg.COIN_VALUE_MAX,
            cfg.COIN_VALUE_BASE + prof.bossKills * cfg.COIN_VALUE_GROWTH
          );

          const count = cfg.BOSS_DROP_BASE + cfg.BOSS_DROP_STEP * (stage - 1) + Math.floor(state.distance / 1000);
          const n = count > cfg.BOSS_DROP_MAX ? cfg.BOSS_DROP_MAX : count;
          pickups.spawnBurst(state.pickups, bossX, state.distance, now, n, state.coinValue);

          audio.play('pickup');
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
    audio.play('pickup');
    return;
  }

  if (it.kind === 'multi') {
    if (state.multishot < cfg.PLAYER_MULTI_MAX) state.multishot += 1;
    audio.play('pickup');
    return;
  }

  if (it.kind === 'damage') {
    state.damage = roundDamage(state.damage + cfg.DAMAGE_ITEM_GAIN);
    audio.play('pickup');
    return;
  }

  if (it.kind === 'heal') {
    const p = state.player;
    if (p) p.hp = Math.min(p.maxHp, p.hp + (it.amount || 1));
    audio.play('pickup');
    return;
  }

  if (it.kind === 'coin') {
    addCoins(it.amount || state.coinValue);
    audio.play('coin');
    return;
  }

  clones.spawn(state.clones, state.player, it.power, now);
  audio.play('pickup');
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

// Boss 登场提示音（同屏出现新 Boss 时播一次）
function trackBoss() {
  let has = false;
  const list = state.enemies.list;

  for (let i = 0; i < list.length; i++) {
    if (list[i].isBoss) {
      has = true;
      break;
    }
  }

  if (has && !state.bossAlive) audio.play('boss');
  state.bossAlive = has;
}

function update(dt, now) {
  if (state.phase !== 'playing' || state.paused || !state.player) {
    state.aimStick = null;
    state.firing = false;
    state.joy = null;
    return;
  }

  // 菜单打开时冻结游戏
  if (state.menuOpen) {
    state.aimStick = null;
    state.firing = false;
    state.joy = null;
    return;
  }

  state.joy = input.getJoystick();
  state.aimStick = input.getAimStick();

  if (input.consumeJump()) playerKit.requestJump(state.player, now);

  playerKit.update(state.player, input.getDir(), now, dt);

  state.cameraX = cameraTargetOf(state.player.x);

  const d = distanceOf(state.player.x);
  if (d > state.distance) state.distance = d;

  enemies.spawnAhead(state.enemies, state.player.x, state.distance, now);
  enemies.update(state.enemies, dt, now, state.player, state.eBullets, state.distance);
  enemies.cull(state.enemies, state.cameraX);

  trackBoss();

  pickups.spawnAhead(state.pickups, state.player.x, state.distance, now, state.coinValue);
  pickups.update(state.pickups, dt, now);
  pickups.cull(state.pickups, state.cameraX);

  clones.update(state.clones, dt, now, state.player, state.enemies, state.bullets, {
    fireMs: state.fireMs,
    multishot: state.multishot,
  });
  clones.cull(state.clones, state.cameraX);

  fireUpdate(now);

  if (!state.firing) {
    state.aimAngle = state.player.facing >= 0 ? 0 : Math.PI;
  }

  bullets.update(state.bullets, dt);
  bullets.cull(state.bullets, state.cameraX);

  bullets.update(state.eBullets, dt);
  bullets.cull(state.eBullets, state.cameraX);

  resolveBulletCollisions();
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

  const p = e.touches && e.touches[0];

  // 弹窗打开：只响应弹窗按钮
  if (state.menuOpen) {
    if (!p) return;

    const b = hitPauseButton(p.x, p.y);
    if (!b) return;

    if (b.id === 'resume') {
      closePause();
      return;
    }

    if (b.id === 'menu') {
      closePause();
      saveProgress();
      scenes.switchTo('menu');
      return;
    }

    if (b.id === 'exit') exitApp();
    return;
  }

  // 右上角菜单按钮
  if (p && hitMenuButton(p.x, p.y)) {
    openPause();
    return;
  }

  input.touchStart(e);
}

function touchMove(e) {
  if (state.menuOpen) return;
  if (state.phase !== 'playing') return;
  input.touchMove(e);
}

function touchEnd(e) {
  if (state.menuOpen) return;
  input.touchEnd(e);
}

if (typeof wx.onHide === 'function') {
  wx.onHide(function () {
    if (state.phase === 'playing' && !state.menuOpen) {
      state.paused = true;
      saveProgress();
    }
    audio.pauseBgm();
  });
}

if (typeof wx.onShow === 'function') {
  wx.onShow(function () {
    state.paused = false;
    input.reset();
    audio.playBgm();
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
