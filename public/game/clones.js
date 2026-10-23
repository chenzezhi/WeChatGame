// 分身（复制体）模块：玩家吃到「分身」道具后生成一个客体。
//
// 行为：找最近的敌人 → 靠近到射程内站住并朝它开枪；会随机跳跃；
//       有独立血量，被敌人子弹 / 身体碰撞打到也会掉血，血量归零就消失。
// 物理与动画完全复用 player.js（playerKit），所以动作和主体一模一样。

const cfg = require('./config.js');
const playerKit = require('./player.js');
const bullets = require('./bullets.js');

function create() {
  return { list: [] };
}

function reset(level) {
  level.list.length = 0;
}

// 找离 x 最近的敌人（超出一定范围就不算目标）
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

// 生成一个分身：hp 来自道具强度
function spawn(level, owner, hp, now) {
  const ox = owner ? owner.x : cfg.START_X;
  const c = playerKit.create(Math.max(0, ox - cfg.PLAYER_W * 1.4));

  c.isClone = true;
  c.hp = hp;
  c.maxHp = hp;
  c.aimAngle = 0;
  c.bornAt = now;
  c.nextFireAt = now + cfg.CLONE_FIRE_MS;
  c.nextJumpAt = now + cfg.CLONE_JUMP_MIN_MS;

  if (level.list.length >= cfg.CLONE_MAX) level.list.shift();
  level.list.push(c);

  return c;
}

function update(level, dt, now, owner, enemies, playerBullets) {
  const list = level.list;

  let i = 0;
  while (i < list.length) {
    const c = list[i];

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
      const dx = tx - cx;

      if (Math.abs(dx) > c.w * 3) dir = dx > 0 ? 1 : -1;
      else if (Math.abs(dx) < c.w * 1.4) dir = dx > 0 ? -1 : 1;

      const angle = Math.atan2(target.y + target.h * 0.45 - cy, dx);
      c.aimAngle = angle;

      if (now >= c.nextFireAt) {
        c.nextFireAt = now + cfg.CLONE_FIRE_MS;

        const mx = cx + Math.cos(angle) * c.w * 0.75;
        const my = cy + Math.sin(angle) * c.w * 0.75;

        bullets.spawn(playerBullets, mx, my, tx, target.y + target.h * 0.45);
      }
    } else {
      // 没有目标就跟着主体，别掉队太远
      if (owner && owner.alive) {
        const dx = owner.x - c.x;
        if (Math.abs(dx) > c.w * 3.2) dir = dx > 0 ? 1 : -1;
      }
      c.aimAngle = c.facing >= 0 ? 0 : Math.PI;
    }

    // 随机跳跃
    if (now >= c.nextJumpAt) {
      c.nextJumpAt = now + cfg.CLONE_JUMP_MIN_MS + Math.random() * (cfg.CLONE_JUMP_MAX_MS - cfg.CLONE_JUMP_MIN_MS);
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
