// 游戏控制器：配置 / 人物 / 敌人 / 子弹 / 道具 / 分身 / 主动道具 / 经验 / 弹夹 / 里程奖励 / 绘制。

const cfg = require('./config.js');
const input = require('./input.js');
const playerKit = require('./player.js');
const bullets = require('./bullets.js');
const enemies = require('./enemies.js');
const pickups = require('./pickups.js');
const clones = require('./clones.js');
const activeKit = require('./active.js');
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
  coinMilestone: 0,
  paused: false,
  deadAt: 0,
  playerHitAt: 0,

  level: 1,
  xp: 0,
  xpNeed: cfg.XP_BASE,

  fireMs: cfg.PLAYER_FIRE_MS_START,
  multishot: cfg.PLAYER_MULTI_START,
  damage: cfg.PLAYER_DAMAGE_START,
  spreadDeg: cfg.MULTI_SPREAD_DEG,        // 主体弹道夹角（度，相邻两发）

  ammoMax: cfg.PLAYER_AMMO_START,
  ammo: cfg.PLAYER_AMMO_START,
  reloadM: cfg.RELOAD_M_START,
  lastReloadDist: 0,

  cloneFireMs: cfg.PLAYER_FIRE_MS_START,
  cloneMultishot: cfg.PLAYER_MULTI_START,
  cloneDamage: cfg.PLAYER_DAMAGE_START,
  cloneSpreadDeg: cfg.MULTI_SPREAD_DEG,   // 分身弹道夹角（与主体完全独立）
  cloneHpBonus: 0,
  cloneLifeMs: cfg.CLONE_LIFE_BASE_MS,

  // 主动道具
  activeItems: { shield: 0, grow: 0 },    // 剩余个数
  activeUpgrades: { shield: 0, grow: 0 }, // 时长等级
  shieldUntil: 0,                         // 护盾到期时间（0 = 未开）
  growUntil: 0,                           // 变大到期时间（0 = 未开）

  joy: null,
  aimStick: null,
  firing: false,
  aimAngle: 0,
  nextFireAt: 0,

  bossAlive: false,

  menuOpen: false,
  pausePanel: null,
  pauseButtons: [],
};

function toast(title) {
  try { wx.showToast({ title: title, icon: 'none' }); } catch (e) { /* 忽略 */ }
}

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

function milestoneOf(dist) {
  const step = cfg.COIN_REWARD_M > 0 ? cfg.COIN_REWARD_M : 100;
  return Math.floor(dist / step);
}

// ---------------- 暂停弹窗 ----------------
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

function roundDamage(v) {
  const n = Math.round(v * 10) / 10;
  return n > cfg.PLAYER_DAMAGE_MAX ? cfg.PLAYER_DAMAGE_MAX : n;
}

function fireMsFrom(startMs, level, ratio) {
  const lv = level > 0 ? level : 0;
  let f = Math.round(startMs * Math.pow(ratio, lv));
  if (f < cfg.PLAYER_FIRE_MS_MIN) f = cfg.PLAYER_FIRE_MS_MIN;
  return f;
}

function clampMulti(n) {
  const v = Math.max(1, n);
  return v > cfg.PLAYER_MULTI_MAX ? cfg.PLAYER_MULTI_MAX : v;
}

function clampAmmoMax(n) {
  const v = Math.max(1, n);
  return v > cfg.PLAYER_AMMO_MAX ? cfg.PLAYER_AMMO_MAX : v;
}

function clampReloadM(m) {
  return m < cfg.RELOAD_M_MIN ? cfg.RELOAD_M_MIN : m;
}

// ---------------- 弹道夹角 ----------------
// 下限保护：0 是合法值（所有子弹完全平行）
function clampSpread(deg) {
  let v = (typeof deg === 'number' && isFinite(deg)) ? deg : cfg.MULTI_SPREAD_DEG;
  if (v < cfg.SPREAD_MIN_DEG) v = cfg.SPREAD_MIN_DEG;
  if (v > cfg.MULTI_SPREAD_DEG) v = cfg.MULTI_SPREAD_DEG;
  return v;
}

// 每级「直接减 stepDeg 度」（加法，能真正收敛到下限）
function spreadReduce(base, levels, stepDeg) {
  const lv = levels > 0 ? levels : 0;
  if (lv <= 0) return clampSpread(base);

  const step = (typeof stepDeg === 'number' && stepDeg > 0) ? stepDeg : 0;
  return clampSpread(base - step * lv);
}

// 已购买等级算出的「最小夹角」
function spreadBaseOf(level) {
  return spreadReduce(cfg.MULTI_SPREAD_DEG, level, cfg.SPREAD_SHOP_STEP_DEG);
}

// 最终生效夹角 = 已购买的最小夹角 + 滑块偏移（0 ~ 初始夹角之间的可调范围）
function spreadOf(level, adj) {
  const base = spreadBaseOf(level);
  const range = cfg.MULTI_SPREAD_DEG - base;

  let a = (typeof adj === 'number' && isFinite(adj) && adj > 0) ? adj : 0;
  if (a > range) a = range;

  return clampSpread(base + a);
}

// 相邻两发的角度差（弧度）
function spreadStepRad(spreadDeg) {
  return (clampSpread(spreadDeg) * Math.PI) / 180;
}

// ---------------- 主动道具 ----------------
function activeDurationOf(id) {
  const lv = (state.activeUpgrades && state.activeUpgrades[id]) || 0;

  if (id === 'shield') {
    const ms = cfg.SHIELD_DURATION_MS + lv * cfg.SHIELD_STEP_MS;
    return ms > cfg.ACTIVE_DURATION_MAX_MS ? cfg.ACTIVE_DURATION_MAX_MS : ms;
  }

  const ms = cfg.GROW_DURATION_MS + lv * cfg.GROW_STEP_MS;
  return ms > cfg.ACTIVE_DURATION_MAX_MS ? cfg.ACTIVE_DURATION_MAX_MS : ms;
}

function isActiveNow(id, now) {
  const until = (id === 'shield') ? state.shieldUntil : state.growUntil;
  return !!until && now < until;
}

// 变大：开时按比例翻倍，结束时按同样比例还原（乘除而不是快照，升级途中也不丢属性）
function applyGrow(on) {
  const p = state.player;

  if (on) {
    state.fireMs = Math.max(cfg.PLAYER_FIRE_MS_MIN, Math.round(state.fireMs / 2));
    state.damage = Math.round(state.damage * 2 * 10) / 10;
    state.multishot = Math.max(1, state.multishot * 2);
    state.ammoMax = Math.max(1, Math.round(state.ammoMax * 2));
    state.reloadM = clampReloadM(Math.round(state.reloadM / 2 * 10) / 10);
    state.ammo = state.ammoMax;

    if (p) {
      const oldH = p.h;
      p.w = Math.round(p.w * cfg.GROW_SCALE);
      p.h = Math.round(p.h * cfg.GROW_SCALE);
      p.y = p.y + oldH - p.h;
    }

    return;
  }

  state.fireMs = Math.max(cfg.PLAYER_FIRE_MS_MIN, Math.round(state.fireMs * 2));
  state.damage = roundDamage(state.damage / 2);
  state.multishot = Math.max(1, Math.round(state.multishot / 2));
  state.ammoMax = Math.max(1, Math.round(state.ammoMax / 2));
  state.reloadM = clampReloadM(Math.round(state.reloadM * 2 * 10) / 10);
  if (state.ammo > state.ammoMax) state.ammo = state.ammoMax;

  if (p) {
    const oldH = p.h;
    p.w = cfg.PLAYER_W;
    p.h = cfg.PLAYER_H;
    p.y = p.y + oldH - p.h;
  }
}

function useActive(id, now) {
  const p = state.player;
  if (!p || !p.alive) return;

  const label = activeKit.LABEL[id] || '道具';

  if (isActiveNow(id, now)) {
    toast(label + ' 还在生效中');
    return;
  }

  const count = (state.activeItems && state.activeItems[id]) || 0;
  if (count <= 0) {
    toast('没有 ' + label + ' 了');
    return;
  }

  state.activeItems[id] = count - 1;

  if (id === 'shield') {
    state.shieldUntil = now + activeDurationOf('shield');
  } else {
    state.growUntil = now + activeDurationOf('grow');
    applyGrow(true);
  }

  // 立刻落盘，避免退出丢数量
  const prof = profile.read();
  prof.activeItems = state.activeItems;
  profile.write(prof);

  audio.play('pickup');
}

function stopActive() {
  if (state.growUntil) {
    state.growUntil = 0;
    applyGrow(false);
  }
  state.shieldUntil = 0;
}

function updateActive(now) {
  if (state.shieldUntil && now >= state.shieldUntil) state.shieldUntil = 0;

  if (state.growUntil && now >= state.growUntil) {
    state.growUntil = 0;
    applyGrow(false);
  }
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
  state.spreadDeg = cfg.MULTI_SPREAD_DEG;

  state.ammoMax = cfg.PLAYER_AMMO_START;
  state.ammo = cfg.PLAYER_AMMO_START;
  state.reloadM = cfg.RELOAD_M_START;
  state.lastReloadDist = state.distance;

  state.cloneFireMs = cfg.PLAYER_FIRE_MS_START;
  state.cloneMultishot = cfg.PLAYER_MULTI_START;
  state.cloneDamage = cfg.PLAYER_DAMAGE_START;
  state.cloneSpreadDeg = cfg.MULTI_SPREAD_DEG;
  state.cloneHpBonus = 0;
  state.cloneLifeMs = cfg.CLONE_LIFE_BASE_MS;

  state.activeItems = { shield: 0, grow: 0 };
  state.activeUpgrades = { shield: 0, grow: 0 };
  state.shieldUntil = 0;
  state.growUntil = 0;

  // 读档续跑不补发已走过的里程
  state.coinMilestone = milestoneOf(state.distance);
}

function applyProfileAssets() {
  const prof = profile.read();

  state.coins = prof.coins;
  state.coinValue = Math.min(
    cfg.COIN_VALUE_MAX,
    cfg.COIN_VALUE_BASE + prof.bossKills * cfg.COIN_VALUE_GROWTH
  );

  const p = state.player;
  const pu = prof.upgrades || {};
  const cu = prof.cloneUpgrades || {};

  if (pu.hp > 0 && p) {
    p.maxHp = Math.min(cfg.LEVEL_HP_MAX, p.maxHp + pu.hp * cfg.SHOP_HP_GAIN);
    p.hp = p.maxHp;
  }

  if (pu.fire > 0) {
    state.fireMs = fireMsFrom(state.fireMs, pu.fire, cfg.SHOP_FIRE_RATIO);
  }

  if (pu.multi > 0) {
    state.multishot = clampMulti(state.multishot + pu.multi * cfg.SHOP_MULTI_GAIN);
  }

  if (pu.damage > 0) {
    state.damage = roundDamage(state.damage + pu.damage * cfg.SHOP_DAMAGE_GAIN);
  }

  if (pu.ammo > 0) {
    state.ammoMax = clampAmmoMax(state.ammoMax + pu.ammo * cfg.SHOP_AMMO_GAIN);
  }

  if (pu.reload > 0) {
    state.reloadM = clampReloadM(state.reloadM - pu.reload * cfg.RELOAD_SHOP_STEP_M);
  }

  if (pu.cloneLife > 0) {
    let life = cfg.CLONE_LIFE_BASE_MS + pu.cloneLife * cfg.CLONE_LIFE_STEP_MS;
    if (life > cfg.CLONE_LIFE_MAX_MS) life = cfg.CLONE_LIFE_MAX_MS;
    state.cloneLifeMs = life;
  }

  if (cu.fire > 0) {
    state.cloneFireMs = fireMsFrom(state.cloneFireMs, cu.fire, cfg.SHOP_FIRE_RATIO);
  }

  if (cu.multi > 0) {
    state.cloneMultishot = clampMulti(state.cloneMultishot + cu.multi * cfg.SHOP_MULTI_GAIN);
  }

  if (cu.damage > 0) {
    state.cloneDamage = roundDamage(state.cloneDamage + cu.damage * cfg.SHOP_DAMAGE_GAIN);
  }

  if (cu.hp > 0) {
    state.cloneHpBonus = cu.hp * cfg.SHOP_HP_GAIN;
  }

  // 弹道夹角：主体 / 分身各自独立，各自带自己的滑块偏移（spreadAdj）
  state.spreadDeg = spreadOf(pu.spread || 0, pu.spreadAdj || 0);
  state.cloneSpreadDeg = spreadOf(cu.spread || 0, cu.spreadAdj || 0);

  // 主动道具数量与时长等级
  state.activeItems = {
    shield: (prof.activeItems && prof.activeItems.shield) || 0,
    grow: (prof.activeItems && prof.activeItems.grow) || 0,
  };
  state.activeUpgrades = {
    shield: (prof.activeUpgrades && prof.activeUpgrades.shield) || 0,
    grow: (prof.activeUpgrades && prof.activeUpgrades.grow) || 0,
  };

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
    state.multishot = clampMulti(state.multishot + items.multi);
    used = true;
  }

  if (items.damage > 0) {
    state.damage = roundDamage(state.damage + items.damage * cfg.DAMAGE_ITEM_GAIN);
    used = true;
  }

  if (items.spread > 0) {
    state.spreadDeg = spreadReduce(state.spreadDeg, items.spread, cfg.SHOP_ITEM_SPREAD_STEP_DEG);
    state.cloneSpreadDeg = spreadReduce(state.cloneSpreadDeg, items.spread, cfg.SHOP_ITEM_SPREAD_STEP_DEG);
    used = true;
  }

  if (items.reload > 0) {
    let m = state.reloadM;
    for (let i = 0; i < items.reload; i++) m = m * cfg.RELOAD_ITEM_RATIO;
    state.reloadM = clampReloadM(Math.round(m * 10) / 10);
    used = true;
  }

  if (used) {
    prof.items = { heal: 0, speed: 0, multi: 0, clone: 0, damage: 0, ammo: 0, reload: 0, spread: 0 };
    profile.write(prof);
  }

  state.ammo = state.ammoMax;
  state.lastReloadDist = state.distance;

  if (p) {
    const hp = cfg.CLONE_HP_BASE + state.cloneHpBonus;

    const perm = prof.permClones || 0;
    for (let i = 0; i < perm; i++) {
      clones.spawn(state.clones, p, hp, 0, 0);
    }

    const bought = (prof.items && prof.items.clone) || 0;
    for (let i = 0; i < bought; i++) {
      clones.spawn(state.clones, p, hp, 0, 0);
    }
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
  stopActive();
  input.reset();
  state.paused = false;
  state.menuOpen = false;
}

function addCoins(n) {
  if (!(n > 0)) return;

  state.coins += n;

  const prof = profile.read();
  prof.coins = state.coins;
  profile.write(prof);
}

// 里程奖励：每前进 COIN_REWARD_M 米固定给金币
function rewardUpdate() {
  const now = milestoneOf(state.distance);
  if (now <= state.coinMilestone) return;

  const times = now - state.coinMilestone;
  state.coinMilestone = now;

  addCoins(times * cfg.COIN_REWARD_AMOUNT);
  audio.play('coin');
}

function applyLevelUp() {
  state.level += 1;
  state.xpNeed = cfg.XP_BASE + cfg.XP_STEP * (state.level - 1);

  const p = state.player;

  if (p) {
    p.maxHp = Math.min(cfg.LEVEL_HP_MAX, p.maxHp + cfg.LEVEL_HP_GAIN);
    p.hp = p.maxHp;
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

  // 护盾生效中：完全免疫
  if (state.shieldUntil && now < state.shieldUntil) return;

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

  stopActive();

  audio.play('hurt');
  storage.clear();
}

// 装填：只按前进距离补弹
function reloadUpdate() {
  const step = state.reloadM > 0 ? state.reloadM : cfg.RELOAD_M_START;

  if (state.ammo >= state.ammoMax) {
    state.lastReloadDist = state.distance;
    return;
  }

  let guard = 0;

  while (state.distance - state.lastReloadDist >= step && state.ammo < state.ammoMax && guard < 20) {
    guard++;
    state.lastReloadDist += step;
    state.ammo += 1;
  }

  if (state.ammo >= state.ammoMax) state.lastReloadDist = state.distance;
}

// 一次齐射：
//   角度：相邻两发相差 step（弧度），围绕瞄准方向对称展开
//   位置：沿「垂直弹道方向」错开，相邻两发刚好挨着（一颗子弹直径 + 1px）
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
  if (state.ammo <= 0) return;

  state.nextFireAt = now + state.fireMs;
  state.ammo -= 1;

  audio.play('shoot');

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h * 0.45;

  const n = Math.min(cfg.PLAYER_MULTI_MAX, Math.max(1, state.multishot));
  const step = spreadStepRad(state.spreadDeg);
  const muzzleGap = cfg.BULLET_R * 2 + 1;

  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  for (let i = 0; i < n; i++) {
    const mid = i - (n - 1) / 2;
    const a = angle + mid * step;
    const off = mid * muzzleGap;

    const mx = cx + Math.cos(a) * p.w * 0.75 + perpX * off;
    const my = cy + Math.sin(a) * p.w * 0.75 + perpY * off;

    bullets.spawn(
      state.bullets,
      mx, my,
      mx + Math.cos(a) * 900,
      my + Math.sin(a) * 900,
      undefined, undefined,
      state.damage
    );
  }
}

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
  let i = 0;

  while (i < list.length) {
    const b = list[i];
    const e = enemies.hitTest(state.enemies, b.x, b.y, b.r);

    if (e) {
      const wasBoss = !!e.isBoss;
      const ex = e.x + e.w / 2;
      const xp = e.xp || 1;
      const stage = e.stage || 1;
      const dmg = (b.dmg > 0) ? b.dmg : Math.max(0.1, state.damage || 1);

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
          pickups.spawnBurst(state.pickups, ex, state.distance, now, n, state.coinValue);

          audio.play('pickup');
        } else {
          // 小怪：按当前距离的掉率掷一次，命中就原地按权重掉一个道具
          const chance = pickups.dropChanceForDistance(state.distance);
          if (Math.random() < chance) {
            pickups.dropAt(state.pickups, ex, state.distance, now, state.coinValue);
            audio.play('pickup');
          }
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

  // 弹道夹角道具：主体 / 分身各减一次（各自独立）
  if (it.kind === 'spread') {
    state.spreadDeg = spreadReduce(state.spreadDeg, 1, cfg.SHOP_ITEM_SPREAD_STEP_DEG);
    state.cloneSpreadDeg = spreadReduce(state.cloneSpreadDeg, 1, cfg.SHOP_ITEM_SPREAD_STEP_DEG);
    audio.play('pickup');
    return;
  }

  if (it.kind === 'ammo') {
    const add = it.amount > 0 ? it.amount : cfg.AMMO_ITEM_BASE;
    state.ammo = Math.min(state.ammoMax, state.ammo + add);
    audio.play('coin');
    return;
  }

  if (it.kind === 'reload') {
    state.reloadM = clampReloadM(Math.round(state.reloadM * cfg.RELOAD_ITEM_RATIO * 10) / 10);
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

  clones.spawn(
    state.clones,
    state.player,
    (it.power || 1) + state.cloneHpBonus,
    now,
    state.cloneLifeMs
  );

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
  // 暂停 / 菜单打开时，主动道具的剩余时间跟着顺延，不会被“暂停偷走”
  if (state.phase === 'playing' && (state.paused || state.menuOpen)) {
    if (state.shieldUntil) state.shieldUntil += dt;
    if (state.growUntil) state.growUntil += dt;
  }

  if (state.phase !== 'playing' || state.paused || !state.player) {
    state.aimStick = null;
    state.firing = false;
    state.joy = null;
    return;
  }

  if (state.menuOpen) {
    state.aimStick = null;
    state.firing = false;
    state.joy = null;
    return;
  }

  updateActive(now);

  state.joy = input.getJoystick();
  state.aimStick = input.getAimStick();

  const jump = input.consumeJump();
  if (jump) playerKit.requestJump(state.player, now, jump.dir);

  playerKit.update(state.player, input.getDir(), now, dt);

  state.cameraX = cameraTargetOf(state.player.x);

  const d = distanceOf(state.player.x);
  if (d > state.distance) state.distance = d;

  rewardUpdate();

  enemies.spawnAhead(state.enemies, state.player.x, state.distance, now);
  enemies.update(state.enemies, dt, now, state.player, state.eBullets, state.distance);
  enemies.cull(state.enemies, state.cameraX);

  trackBoss();

  pickups.spawnAhead(state.pickups, state.player.x, state.distance, now, state.coinValue);
  pickups.update(state.pickups, dt, now);
  pickups.cull(state.pickups, state.cameraX);

  clones.update(state.clones, dt, now, state.player, state.enemies, state.bullets, {
    fireMs: state.cloneFireMs,
    multishot: state.cloneMultishot,
    damage: state.cloneDamage,
    spreadDeg: state.cloneSpreadDeg,
  });
  clones.cull(state.clones, state.cameraX);

  reloadUpdate();
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

  // 主动道具按钮（右上角）
  if (p) {
    const id = activeKit.hit(p.x, p.y);
    if (id) {
      useActive(id, now);
      return;
    }
  }

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
