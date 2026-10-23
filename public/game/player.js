// 人物：状态 + 物理积分 + 动画状态机（不含绘制）。
// 手感接近冒险岛：加速/摩擦明显，跳跃带缓冲和土狼时间。

const cfg = require('./config.js');

const NEVER = -99999;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function create(startX) {
  return {
    x: typeof startX === 'number' ? startX : cfg.START_X,
    y: cfg.GROUND_Y - cfg.PLAYER_H,
    vx: 0,
    vy: 0,
    w: cfg.PLAYER_W,
    h: cfg.PLAYER_H,
    onGround: true,
    facing: 1,
    runPhase: 0,
    lastGroundAt: NEVER,
    jumpQueuedAt: NEVER,
    alive: true,
    anim: 'idle',
  };
}

// 登记一次跳跃意图（真正起跳由 update 判断，带缓冲）
function requestJump(p, now) {
  p.jumpQueuedAt = now;
}

function update(p, dir, now, dt) {
  if (!p.alive) return;

  // ---------- 水平：加速 / 摩擦 ----------
  if (dir !== 0) {
    p.vx += dir * cfg.RUN_ACCEL * dt;
    p.vx = clamp(p.vx, -cfg.RUN_MAX, cfg.RUN_MAX);
    p.facing = dir > 0 ? 1 : -1;
  } else {
    const fr = (p.onGround ? cfg.GROUND_FRICTION : cfg.AIR_FRICTION) * dt;
    if (Math.abs(p.vx) <= fr) p.vx = 0;
    else p.vx -= p.vx > 0 ? fr : -fr;
  }

  // ---------- 跳跃（输入缓冲 + 土狼时间） ----------
  const wantJump = (now - p.jumpQueuedAt) <= cfg.JUMP_BUFFER_MS;
  const canJump = p.onGround || (now - p.lastGroundAt) <= cfg.COYOTE_MS;

  if (wantJump && canJump) {
    p.vy = cfg.JUMP_V;
    p.onGround = false;
    p.jumpQueuedAt = NEVER;
    p.lastGroundAt = NEVER;
  }

  // ---------- 重力 ----------
  p.vy += cfg.GRAVITY * dt;
  if (p.vy > cfg.MAX_FALL) p.vy = cfg.MAX_FALL;

  // ---------- 积分位移 ----------
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // ---------- 地面 ----------
  const floor = cfg.GROUND_Y - p.h;
  if (p.y >= floor) {
    p.y = floor;
    p.vy = 0;
    p.onGround = true;
    p.lastGroundAt = now;
  } else {
    p.onGround = false;
  }

  // ---------- 左边界 ----------
  if (p.x < 0) {
    p.x = 0;
    if (p.vx < 0) p.vx = 0;
  }

  // ---------- 动画状态 ----------
  if (!p.onGround) {
    p.anim = 'jump';
  } else if (Math.abs(p.vx) > cfg.RUN_MAX * 0.12) {
    p.anim = 'run';
  } else {
    p.anim = 'idle';
  }

  // 跑步相位：速度越快摆得越快
  p.runPhase += (Math.abs(p.vx) / cfg.RUN_MAX) * dt * 0.02;
}

function kill(p) {
  p.alive = false;
  p.vx = 0;
  p.vy = 0;
}

module.exports = {
  create: create,
  requestJump: requestJump,
  update: update,
  kill: kill,
};
