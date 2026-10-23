// 人物：状态 + 物理积分 + 动画状态机（不含绘制）。
// 手感接近冒险岛：加速/摩擦明显，跳跃带缓冲和土狼时间。
// 另外维护随机眨眼计时器，以及「按实际位移推进」的跑步相位（驱动手脚摆动）。

const cfg = require('./config.js');

const NEVER = -99999;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function randBlinkDelay() {
  return cfg.BLINK_MIN_MS + Math.random() * (cfg.BLINK_MAX_MS - cfg.BLINK_MIN_MS);
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
    runPhase: 0,     // 0~1 循环，1 = 迈完一整套步（左右各一步）
    lastGroundAt: NEVER,
    jumpQueuedAt: NEVER,
    alive: true,
    anim: 'idle',

    // 血量
    hp: cfg.PLAYER_MAX_HP,
    maxHp: cfg.PLAYER_MAX_HP,
    hurtAt: 0,       // 最近一次受伤的时间点（用于闪红）

    // 眨眼状态
    blinking: false,
    blinkUntil: 0,
    nextBlinkAt: 0, // 0 = 首次 update 时随机安排
  };
}

// 登记一次跳跃意图（真正起跳由 update 判断，带缓冲）
function requestJump(p, now) {
  p.jumpQueuedAt = now;
}

// 眨眼：到点闭眼一小会儿，然后重新安排下一次
function updateBlink(p, now) {
  if (!p.nextBlinkAt) {
    p.nextBlinkAt = now + randBlinkDelay();
    return;
  }

  if (p.blinking) {
    if (now >= p.blinkUntil) {
      p.blinking = false;
      p.nextBlinkAt = now + randBlinkDelay();
    }
    return;
  }

  if (now >= p.nextBlinkAt) {
    p.blinking = true;
    p.blinkUntil = now + cfg.BLINK_DURATION_MS;
  }
}

function update(p, dir, now, dt) {
  if (!p.alive) return;

  // ---------- 眨眼 ----------
  updateBlink(p, now);

  // ---------- 受伤闪红计时 ----------
  if (p.hurtAt && now - p.hurtAt > 220) p.hurtAt = 0;

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

  // ---------- 跑步相位：按实际位移推进，走得越快迈得越快 ----------
  // stride = 迈完一整套步（左右各一步）走过的距离
  if (p.anim === 'run') {
    const stride = Math.max(20, p.h * 1.8);
    p.runPhase += (Math.abs(p.vx) * dt) / stride;
    p.runPhase -= Math.floor(p.runPhase);
  }
}

// 受伤：扣血，扣到 0 就死亡。返回「是否被打死」
function damage(p, amount, now) {
  if (!p.alive) return false;

  p.hp -= amount;
  p.hurtAt = now;

  if (p.hp > 0) return false;

  p.hp = 0;
  kill(p);
  return true;
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
  damage: damage,
  kill: kill,
};
