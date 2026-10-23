// 道具模块：随路程生成的补给品（目前只有「分身」一种）。
//
// 规则：
//   出现位置：在一段「随机区间」内跳动（不是固定米数）。
//   出现频率：随距离推进，区间整体收窄 → 出现得越来越勤。
//   道具强度：随距离推进而变强（分身血量更多、更耐打）。
//
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
  };
}

// 当前距离下「两次道具之间」的随机间隔范围（米），随距离收窄
function gapRangeForDistance(dist) {
  const shrink = dist * cfg.ITEM_GAP_DECAY;

  let max = cfg.ITEM_GAP_MAX_START_M - shrink;
  let min = cfg.ITEM_GAP_MIN_START_M - shrink * 0.6;

  if (max < cfg.ITEM_GAP_MAX_MIN_M) max = cfg.ITEM_GAP_MAX_MIN_M;
  if (min < cfg.ITEM_GAP_MIN_MIN_M) min = cfg.ITEM_GAP_MIN_MIN_M;
  if (min > max) min = max;

  return { min: min, max: max };
}

// 道具强度：随距离推进变强（分身血量 / 耐打程度）
function powerForDistance(dist) {
  const n = cfg.CLONE_HP_BASE + Math.floor(dist / cfg.CLONE_HP_STEP_M);
  return n > cfg.CLONE_HP_MAX ? cfg.CLONE_HP_MAX : n;
}

// 下一次出现的米数 = 当前米数 + 区间内随机值
function nextDistFrom(dist) {
  const g = gapRangeForDistance(dist);
  return dist + randRange(g.min, g.max);
}

function reset(level, dist) {
  level.list.length = 0;
  level.spawned = 0;
  level.nextSpawnDist = dist + cfg.ITEM_FIRST_M + randRange(0, 40);
}

function createOne(level, x, dist, now) {
  const size = cfg.ITEM_SIZE;

  level.list.push({
    kind: 'clone',                       // 目前只有分身
    x: x,
    y: cfg.GROUND_Y - size * 1.9,        // 悬浮在地面上方
    w: size,
    h: size,
    power: powerForDistance(dist),
    bobPhase: Math.random(),
    bornAt: now,
  });
}

// 玩家跑到一定米数就在前方随机落点生成道具
function spawnAhead(level, playerX, dist, now) {
  let guard = 0;

  while (dist >= level.nextSpawnDist && guard < 3) {
    guard++;

    const at = level.nextSpawnDist;
    const x = playerX + cfg.WIDTH * (0.35 + Math.random() * 0.5);

    createOne(level, x, at, now);
    level.spawned += 1;
    level.nextSpawnDist = nextDistFrom(at);
  }
}

// 浮动动画在绘制时按 now 计算，这里留空以保持模块接口一致
function update() {}

// 回收：已经跑出屏幕左侧的道具
function cull(level, cameraX) {
  const minX = cameraX - cfg.WIDTH * 0.6;
  let i = 0;

  while (i < level.list.length) {
    const it = level.list[i];
    if (it.x + it.w < minX) level.list.splice(i, 1);
    else i++;
  }
}

// 目标 AABB 是否吃到道具：返回道具对象（没有则 null）
function hitTest(level, x, y, w, h) {
  const list = level.list;

  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (it.x < x + w && it.x + it.w > x && it.y < y + h && it.y + it.h > y) return it;
  }

  return null;
}

// 吃掉 / 移除
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
  update: update,
  cull: cull,
  hitTest: hitTest,
  take: take,
  gapRangeForDistance: gapRangeForDistance,
  powerForDistance: powerForDistance,
};
