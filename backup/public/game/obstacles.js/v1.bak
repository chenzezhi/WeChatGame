// 障碍：目前只有石头。负责生成、回收、碰撞检测。

const cfg = require('./config.js');

function create() {
  return {
    rocks: [],
    nextSpawnX: cfg.START_X + cfg.WIDTH * 1.1,
  };
}

// 相机右侧提前生成
function spawnAhead(level, cameraX) {
  const limit = cameraX + cfg.WIDTH * (1 + cfg.ROCK_SPAWN_AHEAD);
  let guard = 0;

  while (level.nextSpawnX < limit && guard < 40) {
    guard++;

    const rw = cfg.PLAYER_W * cfg.ROCK_W_RATIO;
    const rh = cfg.PLAYER_W * cfg.ROCK_H_RATIO * (0.85 + Math.random() * 0.45);
    const x = level.nextSpawnX;

    level.rocks.push({
      x: x,
      y: cfg.GROUND_Y - rh,
      w: rw,
      h: rh,
    });

    const gap = cfg.ROCK_MIN_GAP + Math.random() * (cfg.ROCK_MAX_GAP - cfg.ROCK_MIN_GAP);
    level.nextSpawnX = x + rw + gap;
  }
}

// 删除已经跑出屏幕左侧的石头
function cull(level, cameraX) {
  const minX = cameraX - cfg.WIDTH * 0.6;
  let i = 0;

  while (i < level.rocks.length) {
    if (level.rocks[i].x + level.rocks[i].w < minX) level.rocks.splice(i, 1);
    else i++;
  }
}

// 与人物做 AABB 检测（略微收缩人物碰撞盒，避免擦边就死）
function hitTest(level, p) {
  const px = p.x + p.w * 0.18;
  const py = p.y + p.h * 0.12;
  const pw = p.w * 0.64;
  const ph = p.h * 0.82;

  for (let i = 0; i < level.rocks.length; i++) {
    const r = level.rocks[i];
    if (px + pw > r.x && px < r.x + r.w && py + ph > r.y && py < r.y + r.h) {
      return r;
    }
  }
  return null;
}

module.exports = {
  create: create,
  spawnAhead: spawnAhead,
  cull: cull,
  hitTest: hitTest,
};
