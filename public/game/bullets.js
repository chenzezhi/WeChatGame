// 子弹模块：生成、飞行、回收。只维护数据，绘制在 view.js。

const cfg = require('./config.js');

function create() {
  return { list: [] };
}

// 从 (ox, oy) 朝 (tx, ty) 打一发
function spawn(level, ox, oy, tx, ty) {
  let dx = tx - ox;
  let dy = ty - oy;

  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) {
    dx = 1;
    dy = 0;
  } else {
    dx /= len;
    dy /= len;
  }

  level.list.push({
    x: ox,
    y: oy,
    vx: dx * cfg.BULLET_SPEED,
    vy: dy * cfg.BULLET_SPEED,
    r: cfg.BULLET_R,
    life: cfg.BULLET_LIFE_MS,
    age: 0,
  });
}

function update(level, dt) {
  const list = level.list;

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    b.age += dt;
  }
}

// 回收：寿命到 / 跑出可视范围
function cull(level, cameraX) {
  const list = level.list;
  const minX = cameraX - 360;
  const maxX = cameraX + cfg.WIDTH + 360;

  let i = 0;
  while (i < list.length) {
    const b = list[i];
    if (b.life <= 0 || b.x < minX || b.x > maxX || b.y < -360 || b.y > cfg.HEIGHT + 360) {
      list.splice(i, 1);
    } else {
      i++;
    }
  }
}

module.exports = {
  create: create,
  spawn: spawn,
  update: update,
  cull: cull,
};
