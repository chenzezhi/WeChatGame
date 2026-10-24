// 分身（复制体）：玩家吃到「分身」道具 / 商店购买后生成一个客体。
//
// 物理与动画复用 player.js；射速 / 发数 / 伤害用的是「分身自己的属性」，与主体独立。
// 弹道夹角与主体共用同一个值（spreadDeg），保证分身和玩家永远一致。
// 生存时间：
//   spawn(..., lifeMs)  lifeMs > 0 → 存活这么多毫秒后消失
//                       lifeMs = 0 → 永久（直到血量归零）

const cfg = require('./config.js');
const playerKit = require('./player.js');
const bullets = require('./bullets.js');

function create() {
  return { list: [] };
}

function reset(level) {
  level.list.length = 0;
}

function nearestEnemy(enemies, x) {
  const list = (enemies && enemies.list) || [];
  let best = null;
  let bestD = cfg.WIDTH * 1.6;

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.hp <= 0) continue;

    const d = Math.abs(e.x + e.w / 2 - x);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }

  return best;
}

// hp：最大生命；lifeMs：0 = 永久，>0 = 剩余存活毫秒
function spawn(level, owner, hp, now, lifeMs) {
  const ox = owner ? owner.x : cfg.START_X;
  const c = playerKit.create(Math.max(0, ox - cfg.PLAYER_W * 1.4));

  c.isClone = true;
  c.hp = hp;
  c.maxHp = hp;
  c.aimAngle = 0;
  c.hitAt = 0;
  c.bornAt = now;
  c.nextFireAt = now + cfg.PLAYER_FIRE_MS_START;
  c.nextJumpAt = now + cfg.CLONE_JUMP_MIN_MS;

  const life = typeof lifeMs === 'number' ? lifeMs : 0;
  c.lifeTotal = life > 0 ? life : 0;
  c.lifeUntil = life > 0 ? now + life : 0;   // 0 = 永久

  if (level.list.length >= cfg.CLONE_MAX) level.list.shift();
  level.list.push(c);

  return c;
}

// stats: { fireMs, multishot, damage, spreadDeg } —— 分身的独立属性（夹角与主体共用）
function update(level, dt, now, owner, enemies, playerBullets, stats) {
  const list = level.list;

  const fireMs = (stats && stats.fireMs > 0) ? stats.fireMs : cfg.PLAYER_FIRE_MS_START;
  const multi = (stats && stats.multishot > 0) ? stats.multishot : 1;
  const dmg = (stats && stats.damage > 0) ? stats.damage : cfg.PLAYER_DAMAGE_START;

  let spreadDeg = (stats && stats.spreadDeg > 0) ? stats.spreadDeg : cfg.MULTI_SPREAD_DEG;
  if (spreadDeg < cfg.SPREAD_MIN_DEG) spreadDeg = cfg.SPREAD_MIN_DEG;

  const step = (spreadDeg * Math.PI) / 180;

  let i = 0;
  while (i < list.length) {
    const c = list[i];

    // 过期消失
    if (c.lifeUntil && now >= c.lifeUntil) {
      list.splice(i, 1);
      continue;
    }

    if (!c.alive) {
      list.splice(i, 1);
      continue;
    }

    const cx = c.x + c.w / 2;
    const cy = c.y + c.h * 0.45;
    const target = nearestEnemy(enemies, cx);

    let dir = 0;

    if (target) {
      const tx = target.x + target.w / 2;
      const ty = target.y + target.h * 0.45;
      const dx = tx - cx;

      if (Math.abs(dx) > c.w * 3) dir = dx > 0 ? 1 : -1;
      else if (Math.abs(dx) < c.w * 1.4) dir = dx > 0 ? -1 : 1;

      const angle = Math.atan2(ty - cy, dx);
      c.aimAngle = angle;

      if (now >= c.nextFireAt) {
        c.nextFireAt = now + fireMs;

        for (let k = 0; k < multi; k++) {
          const a = angle + (k - (multi - 1) / 2) * step;
          const mx = cx + Math.cos(a) * c.w * 0.75;
          const my = cy + Math.sin(a) * c.w * 0.75;

          bullets.spawn(
            playerBullets,
            mx, my,
            cx + Math.cos(a) * 900,
            cy + Math.sin(a) * 900,
            undefined, undefined,
            dmg
          );
        }
      }
    } else {
      if (owner && owner.alive) {
        const dx = owner.x - c.x;
        if (Math.abs(dx) > c.w * 3.2) dir = dx > 0 ? 1 : -1;
      }
      c.aimAngle = c.facing >= 0 ? 0 : Math.PI;
    }

    if (now >= c.nextJumpAt) {
      c.nextJumpAt = now + cfg.CLONE_JUMP_MIN_MS +
        Math.random() * (cfg.CLONE_JUMP_MAX_MS - cfg.CLONE_JUMP_MIN_MS);
      if (c.onGround && Math.random() < 0.7) playerKit.requestJump(c, now);
    }

    playerKit.update(c, dir, now, dt);
    i++;
  }
}

function cull(level, cameraX) {
  const minX = cameraX - cfg.WIDTH * 0.9;
  let i = 0;

  while (i < level.list.length) {
    const c = level.list[i];
    if (!c.alive || c.x + c.w < minX) level.list.splice(i, 1);
    else i++;
  }
}

module.exports = {
  create: create,
  reset: reset,
  spawn: spawn,
  update: update,
  cull: cull,
  nearestEnemy: nearestEnemy,
};
