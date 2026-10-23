// 敌人模块：随关卡深入生成的怪物。
//
// 规则：
//   生成间隔：一开始每 100 米一波，越深入越密（最低 40 米）。
//   每波数量：每 500 米 +1 个（最多 ENEMY_MAX_COUNT 个）。
//   敌人血量：每 500 米 +1（初始 1 点）。
//   自动开火：按固定间隔朝玩家当前位置射击。
//
// 只维护数据，绘制在 view.js。

const cfg = require('./config.js');
const bullets = require('./bullets.js');

function create() {
  return {
    list: [],
    nextSpawnDist: cfg.ENEMY_GAP_START_M, // 下一次生成的「米数」
    spawned: 0,
  };
}

// 依据已跑距离算这一波的敌人血量
function hpForDistance(dist) {
  const steps = Math.floor(dist / cfg.ENEMY_HP_STEP_M);
  return 1 + steps;
}

// 依据已跑距离算这一波的敌人数量
function countForDistance(dist) {
  const steps = Math.floor(dist / cfg.ENEMY_COUNT_STEP_M);
  const n = 1 + steps;
  return n > cfg.ENEMY_MAX_COUNT ? cfg.ENEMY_MAX_COUNT : n;
}

// 依据已跑距离算「下一波」的间隔（米）
function gapForDistance(dist) {
  const g = cfg.ENEMY_GAP_START_M - dist * cfg.ENEMY_GAP_DECAY;
  return g < cfg.ENEMY_GAP_MIN_M ? cfg.ENEMY_GAP_MIN_M : g;
}

// 重置（新开一局 / 读档）
function reset(level, dist) {
  level.list.length = 0;
  level.spawned = 0;
  level.nextSpawnDist = dist + gapForDistance(dist);
}

function spawnOne(level, x, hp, now) {
  const w = Math.round(cfg.PLAYER_W * 1.02);
  const h = Math.round(cfg.PLAYER_H * 0.92);

  level.list.push({
    x: x,
    y: cfg.GROUND_Y - h,
    w: w,
    h: h,
    hp: hp,
    maxHp: hp,
    hurtAt: 0,                              // 受击闪白的时间点
    bornAt: now,
    bobPhase: Math.random(),                // 上下浮动相位，避免整齐划一
    nextFireAt: now + cfg.ENEMY_FIRE_MS * (0.35 + Math.random() * 0.9),
  });
}

// 玩家跑到一定米数就在右侧屏幕外生成一波敌人
function spawnAhead(level, playerX, dist, now) {
  let guard = 0;

  while (dist >= level.nextSpawnDist && guard < 3) {
    guard++;

    const at = level.nextSpawnDist;
    const count = countForDistance(at);
    const hp = hpForDistance(at);
    const baseX = playerX + cfg.WIDTH * 0.9;

    for (let i = 0; i < count; i++) {
      spawnOne(level, baseX + i * cfg.PLAYER_W * 1.9, hp, now);
    }

    level.spawned += count;
    level.nextSpawnDist = at + gapForDistance(at);
  }
}

// 每帧：受击闪白计时 + 自动开火
function update(level, dt, now, player, eBullets) {
  const list = level.list;

  for (let i = 0; i < list.length; i++) {
    const e = list[i];

    if (e.hurtAt && now - e.hurtAt > 150) e.hurtAt = 0;

    if (!player || !player.alive) continue;

    const fromX = e.x + e.w / 2;
    const fromY = e.y + e.h * 0.40;
    const toX = player.x + player.w / 2;
    const toY = player.y + player.h * 0.45;

    // 只在附近才开火，避免屏幕外互相乱射
    if (Math.abs(fromX - toX) > cfg.WIDTH * 1.15) continue;

    if (now < e.nextFireAt) continue;
    e.nextFireAt = now + cfg.ENEMY_FIRE_MS * (0.85 + Math.random() * 0.4);

    bullets.spawn(eBullets, fromX, fromY, toX, toY, cfg.ENEMY_BULLET_SPEED, cfg.BULLET_R * 0.95);
  }
}

// 删除已经跑出屏幕左侧的敌人
function cull(level, cameraX) {
  const minX = cameraX - cfg.WIDTH * 0.8;
  let i = 0;

  while (i < level.list.length) {
    if (level.list[i].x + level.list[i].w < minX) level.list.splice(i, 1);
    else i++;
  }
}

// 玩家子弹命中检测：返回被击中的敌人（没有则 null）
function hitTest(level, x, y, r) {
  const list = level.list;

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const nx = x < e.x ? e.x : (x > e.x + e.w ? e.x + e.w : x);
    const ny = y < e.y ? e.y : (y > e.y + e.h ? e.y + e.h : y);
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy <= r * r) return e;
  }

  return null;
}

// 扣血：扣到 0 就移除，返回「是否被打死」
function damage(level, e, amount, now) {
  e.hp -= amount;
  e.hurtAt = now;

  if (e.hp > 0) return false;

  for (let i = 0; i < level.list.length; i++) {
    if (level.list[i] === e) {
      level.list.splice(i, 1);
      break;
    }
  }

  return true;
}

module.exports = {
  create: create,
  reset: reset,
  spawnAhead: spawnAhead,
  update: update,
  cull: cull,
  hitTest: hitTest,
  damage: damage,
  gapForDistance: gapForDistance,
  hpForDistance: hpForDistance,
  countForDistance: countForDistance,
};
