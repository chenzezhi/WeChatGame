// 道具：随路程生成的补给品 + 小怪掉落。
//   clone  分身
//   speed  攻速
//   multi  散射
//   spread 弹道夹角（变窄）
//   heal   血瓶
//   coin   金币
//   damage 伤害
//   ammo   弹药（立即补若干发）
//   reload 快速装填（装填距离变短）
// 只维护数据，绘制在 drawPickup.js。

const cfg = require('./config.js');

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function create() {
  return {
    list: [],
    nextSpawnDist: 0,
    spawned: 0,
    lastKind: null,
  };
}

function gapRangeForDistance(dist) {
  const shrink = dist * cfg.ITEM_GAP_DECAY;

  let max = cfg.ITEM_GAP_MAX_START_M - shrink;
  let min = cfg.ITEM_GAP_MIN_START_M - shrink * 0.6;

  if (max < cfg.ITEM_GAP_MAX_MIN_M) max = cfg.ITEM_GAP_MAX_MIN_M;
  if (min < cfg.ITEM_GAP_MIN_MIN_M) min = cfg.ITEM_GAP_MIN_MIN_M;
  if (min > max) min = max;

  return { min: min, max: max };
}

function powerForDistance(dist) {
  const n = cfg.CLONE_HP_BASE + Math.floor(dist / cfg.CLONE_HP_STEP_M);
  return n > cfg.CLONE_HP_MAX ? cfg.CLONE_HP_MAX : n;
}

function healForDistance(dist) {
  const n = cfg.HEAL_BASE + Math.floor(dist / cfg.HEAL_STEP_M) * cfg.HEAL_GAIN_PER_STEP;
  return n > cfg.HEAL_MAX ? cfg.HEAL_MAX : n;
}

// 弹药道具补充的发数：随距离提升
function ammoGainForDistance(dist) {
  const n = cfg.AMMO_ITEM_BASE +
    Math.floor(dist / cfg.AMMO_ITEM_STEP_M) * cfg.AMMO_ITEM_GAIN_PER_STEP;
  return n > cfg.AMMO_ITEM_MAX ? cfg.AMMO_ITEM_MAX : n;
}

function nextDistFrom(dist) {
  const g = gapRangeForDistance(dist);
  return dist + randRange(g.min, g.max);
}

// 小怪掉率：10% 起，每 1km +2%，封顶 80%
function dropChanceForDistance(dist) {
  const steps = Math.floor(dist / cfg.DROP_CHANCE_STEP_M);
  const v = cfg.DROP_CHANCE_BASE + steps * cfg.DROP_CHANCE_STEP;
  return v > cfg.DROP_CHANCE_MAX ? cfg.DROP_CHANCE_MAX : v;
}

function pickKind(level) {
  const kinds = ['clone', 'speed', 'multi', 'heal', 'coin', 'damage', 'ammo', 'reload', 'spread'];
  const base = [
    cfg.ITEM_WEIGHT_CLONE,
    cfg.ITEM_WEIGHT_SPEED,
    cfg.ITEM_WEIGHT_MULTI,
    cfg.ITEM_WEIGHT_HEAL,
    cfg.ITEM_WEIGHT_COIN,
    cfg.ITEM_WEIGHT_DAMAGE,
    cfg.ITEM_WEIGHT_AMMO,
    cfg.ITEM_WEIGHT_RELOAD,
    cfg.ITEM_WEIGHT_SPREAD,
  ];

  let total = 0;
  const w = [];

  for (let i = 0; i < kinds.length; i++) {
    let v = base[i];
    if (kinds[i] === level.lastKind) v *= cfg.ITEM_REPEAT_FACTOR;
    w.push(v);
    total += v;
  }

  let r = Math.random() * total;
  for (let i = 0; i < kinds.length; i++) {
    r -= w[i];
    if (r <= 0) return kinds[i];
  }

  return kinds[kinds.length - 1];
}

function reset(level, dist) {
  level.list.length = 0;
  level.spawned = 0;
  level.lastKind = null;
  level.nextSpawnDist = dist + cfg.ITEM_FIRST_M + randRange(0, 60);
}

function createOne(level, kind, x, y, dist, now, coinValue) {
  const size = cfg.ITEM_SIZE;

  let amount = healForDistance(dist);
  if (kind === 'coin') amount = coinValue || cfg.COIN_VALUE_BASE;
  else if (kind === 'ammo') amount = ammoGainForDistance(dist);

  level.list.push({
    kind: kind,
    x: x,
    y: y,
    w: size,
    h: size,
    power: powerForDistance(dist),
    amount: amount,
    bobPhase: Math.random(),
    bornAt: now,
  });

  level.lastKind = kind;
}

function spawnAhead(level, playerX, dist, now, coinValue) {
  let guard = 0;

  while (dist >= level.nextSpawnDist && guard < 3) {
    guard++;

    const at = level.nextSpawnDist;
    const kind = pickKind(level);
    const x = playerX + cfg.WIDTH * (0.35 + Math.random() * 0.5);
    const y = cfg.GROUND_Y - cfg.ITEM_SIZE * (1.5 + Math.random() * 1.6);

    createOne(level, kind, x, y, at, now, coinValue);
    level.spawned += 1;
    level.nextSpawnDist = nextDistFrom(at);
  }
}

// Boss 大爆：一次散出 count 个道具
function spawnBurst(level, centerX, dist, now, count, coinValue) {
  const n = Math.max(1, count | 0);

  for (let i = 0; i < n; i++) {
    const kind = pickKind(level);
    const x = centerX + (Math.random() - 0.5) * cfg.WIDTH * 0.9;
    const y = cfg.GROUND_Y - cfg.ITEM_SIZE * (1.4 + Math.random() * 2.2);

    createOne(level, kind, x, y, dist, now, coinValue);
    level.spawned += 1;
  }
}

// 小怪掉落：在死亡位置按权重掉 1 个道具
function dropAt(level, centerX, dist, now, coinValue) {
  const kind = pickKind(level);
  const y = cfg.GROUND_Y - cfg.ITEM_SIZE * (1.5 + Math.random() * 1.2);

  createOne(level, kind, centerX, y, dist, now, coinValue);
  level.spawned += 1;

  return kind;
}

function update() {}

function cull(level, cameraX) {
  const minX = cameraX - cfg.WIDTH * 0.6;
  let i = 0;

  while (i < level.list.length) {
    const it = level.list[i];
    if (it.x + it.w < minX) level.list.splice(i, 1);
    else i++;
  }
}

function hitTest(level, x, y, w, h) {
  const list = level.list;

  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (it.x < x + w && it.x + it.w > x && it.y < y + h && it.y + it.h > y) return it;
  }

  return null;
}

function take(level, item) {
  for (let i = 0; i < level.list.length; i++) {
    if (level.list[i] === item) {
      level.list.splice(i, 1);
      return true;
    }
  }
  return false;
}

module.exports = {
  create: create,
  reset: reset,
  spawnAhead: spawnAhead,
  spawnBurst: spawnBurst,
  dropAt: dropAt,
  update: update,
  cull: cull,
  hitTest: hitTest,
  take: take,
  gapRangeForDistance: gapRangeForDistance,
  powerForDistance: powerForDistance,
  healForDistance: healForDistance,
  ammoGainForDistance: ammoGainForDistance,
  dropChanceForDistance: dropChanceForDistance,
  pickKind: pickKind,
};
