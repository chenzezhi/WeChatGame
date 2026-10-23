// 道具：随路程生成的补给品。
//   clone  分身
//   speed  攻速
//   multi  散射
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

function nextDistFrom(dist) {
  const g = gapRangeForDistance(dist);
  return dist + randRange(g.min, g.max);
}

function pickKind(level) {
  const kinds = ['clone', 'speed', 'multi'];
  const base = [cfg.ITEM_WEIGHT_CLONE, cfg.ITEM_WEIGHT_SPEED, cfg.ITEM_WEIGHT_MULTI];

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

function createOne(level, kind, x, y, dist, now) {
  const size = cfg.ITEM_SIZE;

  level.list.push({
    kind: kind,
    x: x,
    y: y,
    w: size,
    h: size,
    power: powerForDistance(dist),
    bobPhase: Math.random(),
    bornAt: now,
  });

  level.lastKind = kind;
}

function spawnAhead(level, playerX, dist, now) {
  let guard = 0;

  while (dist >= level.nextSpawnDist && guard < 3) {
    guard++;

    const at = level.nextSpawnDist;
    const kind = pickKind(level);
    const x = playerX + cfg.WIDTH * (0.35 + Math.random() * 0.5);
    const y = cfg.GROUND_Y - cfg.ITEM_SIZE * (1.5 + Math.random() * 1.6);

    createOne(level, kind, x, y, at, now);
    level.spawned += 1;
    level.nextSpawnDist = nextDistFrom(at);
  }
}

function spawnBurst(level, centerX, dist, now, count) {
  const n = Math.max(1, count | 0);

  for (let i = 0; i < n; i++) {
    const kind = pickKind(level);
    const x = centerX + (Math.random() - 0.5) * cfg.WIDTH * 0.9;
    const y = cfg.GROUND_Y - cfg.ITEM_SIZE * (1.4 + Math.random() * 2.2);

    createOne(level, kind, x, y, dist, now);
    level.spawned += 1;
  }
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
  update: update,
  cull: cull,
  hitTest: hitTest,
  take: take,
  gapRangeForDistance: gapRangeForDistance,
  powerForDistance: powerForDistance,
  pickKind: pickKind,
};
