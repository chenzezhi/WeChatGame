// 子弹模块：生成、飞行、回收。只维护数据，绘制在 view.js。
// 玩家子弹与敌人子弹各用一个容器（create() 出来的对象互不影响）。

const cfg = require('./config.js');

function create() {
  return { list: [] };
}

// 从 (ox, oy) 朝 (tx, ty) 打一发；speed / radius 可选
function spawn(level, ox, oy, tx, ty, speed, radius) {
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

  const v = typeof speed === 'number' ? speed : cfg.BULLET_SPEED;

  level.list.push({
    x: ox,
    y: oy,
    vx: dx * v,
    vy: dy * v,
    r: typeof radius === 'number' ? radius : cfg.BULLET_R,
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

// 圆形子弹与某个 AABB 是否相交
function hitsRect(b, x, y, w, h) {
  const nx = b.x < x ? x : (b.x > x + w ? x + w : b.x);
  const ny = b.y < y ? y : (b.y > y + h ? y + h : b.y);
  const dx = b.x - nx;
  const dy = b.y - ny;
  return dx * dx + dy * dy <= b.r * b.r;
}

module.exports = {
  create: create,
  spawn: spawn,
  update: update,
  cull: cull,
  hitsRect: hitsRect,
};
