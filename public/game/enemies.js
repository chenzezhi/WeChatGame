// 敌人：小怪 + 每 BOSS_EVERY_M 米一个 Boss。只维护数据，绘制在 drawEnemy.js。

const cfg = require('./config.js');
const bullets = require('./bullets.js');

const NEVER = -99999;

function create() {
  return {
    list: [],
    nextSpawnDist: cfg.ENEMY_GAP_START_M,
    nextBossDist: cfg.BOSS_EVERY_M,
    bossCount: 0,
    spawned: 0,
  };
}

function hpForDistance(dist) {
  return 1 + Math.floor(dist / cfg.ENEMY_HP_STEP_M);
}

function countForDistance(dist) {
  const n = 1 + Math.floor(dist / cfg.ENEMY_COUNT_STEP_M);
  return n > cfg.ENEMY_MAX_COUNT ? cfg.ENEMY_MAX_COUNT : n;
}

function gapForDistance(dist) {
  const g = cfg.ENEMY_GAP_START_M - dist * cfg.ENEMY_GAP_DECAY;
  return g < cfg.ENEMY_GAP_MIN_M ? cfg.ENEMY_GAP_MIN_M : g;
}

// 行为决策间隔：一开始很迟钝，越深入越频繁
function moveIntervalForDistance(dist) {
  const v = cfg.ENEMY_MOVE_MS_START - dist * cfg.ENEMY_MOVE_DECAY;
  return v < cfg.ENEMY_MOVE_MS_MIN ? cfg.ENEMY_MOVE_MS_MIN : v;
}

function fireIntervalForDistance(dist) {
  const v = cfg.ENEMY_FIRE_MS - dist * cfg.ENEMY_FIRE_DECAY;
  return v < cfg.ENEMY_FIRE_MS_MIN ? cfg.ENEMY_FIRE_MS_MIN : v;
}

// 追击概率：开局低，随距离提高
function chaseChanceForDistance(dist) {
  const steps = Math.floor(dist / cfg.ENEMY_CHASE_STEP_M);
  const v = cfg.ENEMY_CHASE_BASE + steps * cfg.ENEMY_CHASE_GAIN;
  return v > cfg.ENEMY_CHASE_MAX ? cfg.ENEMY_CHASE_MAX : v;
}

function contactDamageForDistance(dist) {
  const n = cfg.ENEMY_DAMAGE + Math.floor(dist / cfg.ENEMY_CONTACT_DMG_STEP_M);
  return n > cfg.ENEMY_CONTACT_DMG_MAX ? cfg.ENEMY_CONTACT_DMG_MAX : n;
}

function bossHpMult(stage) {
  return Math.round(cfg.BOSS_HP_MULT_START * (1 + cfg.BOSS_HP_MULT_GROWTH * (stage - 1)));
}

function bossFireMult(stage) {
  return cfg.BOSS_FIRE_MULT_START * (1 + cfg.BOSS_FIRE_MULT_GROWTH * (stage - 1));
}

function bossBulletCount(stage) {
  const n = cfg.BOSS_BULLET_BASE + cfg.BOSS_BULLET_STEP * (stage - 1);
  return n > cfg.BOSS_BULLET_MAX ? cfg.BOSS_BULLET_MAX : n;
}

function reset(level, dist) {
  level.list.length = 0;
  level.spawned = 0;
  level.bossCount = Math.floor(dist / cfg.BOSS_EVERY_M);
  level.nextSpawnDist = dist + gapForDistance(dist);
  level.nextBossDist = (level.bossCount + 1) * cfg.BOSS_EVERY_M;
}

function spawnOne(level, x, hp, dmg, now, dist) {
  const w = Math.round(cfg.PLAYER_W * 1.02);
  const h = Math.round(cfg.PLAYER_H * 0.92);
  const d = typeof dist === 'number' ? dist : 0;

  level.list.push({
    x: x,
    y: cfg.GROUND_Y - h,
    w: w,
    h: h,
    hp: hp,
    maxHp: hp,
    dmg: dmg,
    xp: 1,
    isBoss: false,
    vx: 0,
    vy: 0,
    onGround: true,
    dir: 0,
    speed: 0,
    hurtAt: 0,
    bornAt: now,
    bobPhase: Math.random(),
    nextMoveAt: now + moveIntervalForDistance(d) * (0.6 + Math.random() * 0.8),
    jumpQueuedAt: NEVER,
    nextFireAt: now + cfg.ENEMY_FIRE_MS * (0.6 + Math.random() * 1.2),
  });
}

function spawnBoss(level, playerX, dist, now) {
  const stage = level.bossCount + 1;
  const mult = bossHpMult(stage);
  const hp = hpForDistance(dist) * mult;

  const w = Math.round(cfg.PLAYER_W * 1.02 * cfg.BOSS_SCALE);
  const h = Math.round(cfg.PLAYER_H * 0.92 * cfg.BOSS_SCALE);

  let fireMs = Math.round(fireIntervalForDistance(dist) / bossFireMult(stage));
  if (fireMs < cfg.BOSS_FIRE_MS_MIN) fireMs = cfg.BOSS_FIRE_MS_MIN;

  const shrink = (stage - 1) * cfg.BOSS_MINION_SHRINK_MS;
  let mMin = cfg.BOSS_MINION_MIN_MS - shrink;
  let mMax = cfg.BOSS_MINION_MAX_MS - shrink;
  if (mMin < 700) mMin = 700;
  if (mMax < mMin + 600) mMax = mMin + 600;

  level.bossCount = stage;

  level.list.push({
    x: playerX + cfg.WIDTH * 0.95,
    y: cfg.GROUND_Y - h,
    w: w,
    h: h,
    hp: hp,
    maxHp: hp,
    dmg: Math.min(cfg.ENEMY_CONTACT_DMG_MAX, contactDamageForDistance(dist) * 2),
    xp: mult,
    isBoss: true,
    stage: stage,
    hpMult: mult,
    vx: 0,
    vy: 0,
    onGround: true,
    dir: -1,
    speed: cfg.ENEMY_MOVE_SPEED * 0.55,
    fireMs: fireMs,
    bulletCount: bossBulletCount(stage),
    // 召唤计时：等玩家到场后才开始
    minionArmed: false,
    nextMinionAt: NEVER,
    minionMin: mMin,
    minionMax: mMax,
    hurtAt: 0,
    bornAt: now,
    bobPhase: Math.random(),
    nextMoveAt: now + 400,
    jumpQueuedAt: NEVER,
    nextFireAt: now + fireMs * (0.8 + Math.random() * 0.6),
  });
}

function spawnAhead(level, playerX, dist, now) {
  let guard = 0;

  while (dist >= level.nextSpawnDist && guard < 3) {
    guard++;

    const at = level.nextSpawnDist;
    const count = countForDistance(at);
    const hp = hpForDistance(at);
    const dmg = contactDamageForDistance(at);
    const baseX = playerX + cfg.WIDTH * 0.9;

    for (let i = 0; i < count; i++) {
      spawnOne(level, baseX + i * cfg.PLAYER_W * 1.9, hp, dmg, now, at);
    }

    level.spawned += count;
    level.nextSpawnDist = at + gapForDistance(at);
  }

  if (dist >= level.nextBossDist) {
    let hasBoss = false;
    for (let i = 0; i < level.list.length; i++) {
      if (level.list[i].isBoss) {
        hasBoss = true;
        break;
      }
    }

    if (!hasBoss) {
      spawnBoss(level, playerX, level.nextBossDist, now);
      level.nextBossDist += cfg.BOSS_EVERY_M;
    }
  }
}

// 行为决策：追击 / 游走 / 发呆 / 起跳
function decideMove(e, now, player, dist) {
  const cx = e.x + e.w / 2;
  const px = player ? player.x + player.w / 2 : cx;
  const toward = px >= cx ? 1 : -1;

  if (e.isBoss) {
    e.dir = Math.random() < 0.85 ? toward : (Math.random() < 0.5 ? -1 : 1);
    e.speed = cfg.ENEMY_MOVE_SPEED * 0.55;
    if (e.onGround && Math.random() < 0.25) e.jumpQueuedAt = now;
    return;
  }

  const chase = chaseChanceForDistance(dist);

  if (Math.random() < chase) {
    e.dir = toward;
    e.speed = cfg.ENEMY_MOVE_SPEED * (0.6 + Math.random() * 0.5);
  } else if (Math.random() < cfg.ENEMY_IDLE_CHANCE) {
    e.dir = 0;
    e.speed = 0;
  } else {
    e.dir = Math.random() < 0.5 ? -1 : 1;
    e.speed = cfg.ENEMY_MOVE_SPEED * (0.35 + Math.random() * 0.5);
  }

  if (!e.onGround) return;

  const near = player && Math.abs(px - cx) < e.w * 2.4;
  const chance = near ? cfg.ENEMY_JUMP_CHANCE : cfg.ENEMY_JUMP_CHANCE * 0.4;

  if (Math.random() < chance) e.jumpQueuedAt = now;
}

function shootAt(eBullets, fromX, fromY, ang, speed, radius) {
  bullets.spawn(
    eBullets,
    fromX,
    fromY,
    fromX + Math.cos(ang) * 600,
    fromY + Math.sin(ang) * 600,
    speed,
    radius
  );
}

function update(level, dt, now, player, eBullets, dist) {
  const list = level.list;
  const d = typeof dist === 'number' ? dist : 0;
  const moveMs = moveIntervalForDistance(d);
  const fireMs = fireIntervalForDistance(d);
  const smallHp = hpForDistance(d);
  const smallDmg = contactDamageForDistance(d);

  for (let i = 0; i < list.length; i++) {
    const e = list[i];

    if (e.hurtAt && now - e.hurtAt > 150) e.hurtAt = 0;

    if (now >= e.nextMoveAt) {
      const scale = e.isBoss ? 2.2 : 1;
      e.nextMoveAt = now + moveMs * scale * (0.7 + Math.random() * 0.6);
      decideMove(e, now, player, d);
    }

    if (e.onGround && now - e.jumpQueuedAt <= 80) {
      e.vy = e.isBoss ? cfg.ENEMY_JUMP_V * 0.85 : cfg.ENEMY_JUMP_V;
      e.onGround = false;
      e.jumpQueuedAt = NEVER;
    }

    e.vx = e.dir * e.speed;
    e.vy += cfg.GRAVITY * dt;
    if (e.vy > cfg.MAX_FALL) e.vy = cfg.MAX_FALL;

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    const floor = cfg.GROUND_Y - e.h;
    if (e.y >= floor) {
      e.y = floor;
      e.vy = 0;
      e.onGround = true;
    } else {
      e.onGround = false;
    }

    if (player) {
      const backLimit = player.x - cfg.WIDTH * 0.65;
      const frontLimit = player.x + cfg.WIDTH * 1.5;

      if (e.x < backLimit) {
        e.x = backLimit;
        if (e.dir < 0) e.dir = 1;
      } else if (e.x > frontLimit) {
        e.x = frontLimit;
        if (e.dir > 0) e.dir = -1;
      }

      if (e.x < 0) e.x = 0;
    }

    if (!player || !player.alive) continue;

    const fromX = e.x + e.w / 2;
    const fromY = e.y + e.h * 0.40;
    const toX = player.x + player.w / 2;
    const toY = player.y + player.h * 0.45;
    const near = Math.abs(fromX - toX) <= cfg.WIDTH * (e.isBoss ? 1.9 : 1.15);

    // Boss 召唤小怪：进入交战范围才开始计时 → 到达后才召唤
    if (e.isBoss && near && !e.minionArmed) {
      e.minionArmed = true;
      e.nextMinionAt = now + e.minionMin + Math.random() * (e.minionMax - e.minionMin);
    }

    if (e.isBoss && e.minionArmed && near && now >= e.nextMinionAt) {
      e.nextMinionAt = now + e.minionMin + Math.random() * (e.minionMax - e.minionMin);

      const mx = e.x + e.w * (Math.random() < 0.5 ? -0.35 : 0.35);
      spawnOne(level, mx, smallHp, smallDmg, now, d);
    }

    if (!near) continue;
    if (now < e.nextFireAt) continue;

    if (e.isBoss) {
      e.nextFireAt = now + e.fireMs * (0.85 + Math.random() * 0.3);

      const ang = Math.atan2(toY - fromY, toX - fromX);
      const n = e.bulletCount || 1;
      const spread = (cfg.BOSS_BULLET_SPREAD_DEG * Math.PI) / 180;

      for (let k = 0; k < n; k++) {
        const a = ang + (k - (n - 1) / 2) * spread;
        shootAt(eBullets, fromX, fromY, a, cfg.ENEMY_BULLET_SPEED * 1.1, cfg.BULLET_R * 1.15);
      }
      continue;
    }

    e.nextFireAt = now + fireMs * (0.85 + Math.random() * 0.4);
    bullets.spawn(eBullets, fromX, fromY, toX, toY, cfg.ENEMY_BULLET_SPEED, cfg.BULLET_R * 0.95);
  }
}

function cull(level, cameraX) {
  const minX = cameraX - cfg.WIDTH * 0.8;
  let i = 0;

  while (i < level.list.length) {
    const e = level.list[i];
    if (!e.isBoss && e.x + e.w < minX) level.list.splice(i, 1);
    else i++;
  }
}

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
  spawnOne: spawnOne,
  spawnBoss: spawnBoss,
  update: update,
  cull: cull,
  hitTest: hitTest,
  damage: damage,
  gapForDistance: gapForDistance,
  hpForDistance: hpForDistance,
  countForDistance: countForDistance,
  moveIntervalForDistance: moveIntervalForDistance,
  fireIntervalForDistance: fireIntervalForDistance,
  chaseChanceForDistance: chaseChanceForDistance,
  contactDamageForDistance: contactDamageForDistance,
  bossHpMult: bossHpMult,
  bossFireMult: bossFireMult,
  bossBulletCount: bossBulletCount,
};
