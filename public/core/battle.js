'use strict';

/* ==================== 功能 ====================
 * Battle —— 一局的战斗逻辑
 *
 * 只管数和规则：银币、篝火耐久、怪物、子弹、波次、武器合成。
 * 一行渲染代码都没有——坐标算出来交给 battle-view 去画。
 * ==============================================*/

/* ==================== 用法 ====================
 * const battle = Battle.create({ board, shop, player, width: w, height: h, config: COMBAT });
 * battle.placeWeapon(cell, 'arrow');   // 放武器或合成升级，返回 true/false
 * battle.startWave();                  // 开下一波（波次自动生成）
 * battle.refreshShop();                // 花银币补满卡槽
 * battle.update(dt);                   // 每帧推进，dt 单位毫秒
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位 px，速度 px/秒，时间毫秒。
 * 状态机：build（布阵）→ battle（战斗）→ build 或 over（耐久归零）。
 *
 * 武器用 { name, level, def } 表示，def 是武器表里对应等级的那一行。
 * 放到已有同名武器的格子上会升一级，满级后放不上。
 *
 * 子弹只追「屏幕内」的怪物，屏幕外的不算目标。
 * ==============================================*/

const Records = require('./records.js');

// 单只怪物
// rec - 怪物表里的一行
// x, y - 出生坐标，单位 px
// tx, ty - 目标点（篝火中心）
// hpMul - 波次血量倍率
function Monster(rec, x, y, tx, ty, hpMul) {
  this.rec = rec;
  this.x = x;
  this.y = y;
  this.tx = tx;
  this.ty = ty;
  this.hp = Math.round((rec.hp || 1) * (hpMul || 1));
  this.maxHp = this.hp;
  this.alive = true;
}

// 单颗子弹
// def - 武器表里那一行（含 level / color / kind）
// x, y - 出生坐标
// target - 追踪的怪物对象
function Bullet(def, x, y, target) {
  this.def = def;
  this.x = x;
  this.y = y;
  this.target = target;
  this.life = 0;
  this.alive = true;
}

// 一局战斗
// deps - { board, shop, player, width, height, config }
function Battle(deps) {
  const d = deps || {};
  const cfg = d.config || {};
  const tpl = cfg.template || {};
  const files = cfg.files || {};

  this.cfg = cfg;
  this.tpl = tpl;
  this.board = d.board || null;
  this.shop = d.shop || null;
  this.player = d.player || null;
  this.width = d.width || 0;
  this.height = d.height || 0;

  // 两张表，读不到就是空数组，游戏照样能起
  this.weaponDefs = safeLoad(files.weapons, '武器');
  this.monsterRecs = safeLoad(files.monsters, '怪物');

  // 数值状态
  this.coins = tpl.coins || 0;
  this.hp = tpl.cellHp || 0;
  this.wave = 0;
  this.state = 'build';   // build | battle | over

  // 运行时对象
  this.monsters = [];
  this.bullets = [];

  // 篝火：怪物要攻打的目标，也是防守目标
  this.cx = this.board ? this.board.originX + this.board.width / 2 : this.width / 2;
  this.cy = this.board ? this.board.originY + this.board.height / 2 : this.height / 2;

  const campR = tpl.campfireRadiusRatio == null ? 0.45 : tpl.campfireRadiusRatio;
  this.campfire = {
    x: this.cx,
    y: this.cy,
    r: (this.board ? this.board.cellW : 80) * campR,
  };

  this._time = 0;         // 累计毫秒
  this._plan = [];        // 这一波还没生成的怪物计划
  this._spawnTimer = 0;   // 距离下一只生成还要多久，单位毫秒
  this._gapMs = 1000;     // 生成间隔，单位毫秒

  // 外部回调
  this.onWaveStart = null;
  this.onWaveEnd = null;
  this.onOver = null;

  // 当前选中的武器名；null 表示第一把
  this.selectedWeapon = null;

  // 开局把商店卡槽填满
  this.fillShop();
}

// 读一张表，出错时打日志并返回空数组
function safeLoad(path, label) {
  if (!path) return [];
  try {
    return Records.load(path);
  } catch (err) {
    console.error('[battle] ' + label + '表读取失败：' + err.message);
    return [];
  }
}

// 创建一局
function create(deps) {
  return new Battle(deps);
}

/* ---------------- 武器 ---------------- */

// 所有武器名字（去重，按表里的顺序）
// 返回 ['arrow', 'axe', ...]
Battle.prototype.weaponNames = function () {
  const out = [];
  for (let i = 0; i < this.weaponDefs.length; i++) {
    const n = this.weaponDefs[i].name;
    if (out.indexOf(n) < 0) out.push(n);
  }
  return out;
};

// 取某个武器某个等级的定义
// name - 武器名
// level - 等级，从 1 开始
// 返回武器表里的一行，找不到返回 null
Battle.prototype.weaponDef = function (name, level) {
  for (let i = 0; i < this.weaponDefs.length; i++) {
    const d = this.weaponDefs[i];
    if (d.name === name && Number(d.level) === Number(level)) return d;
  }
  return null;
};

// 往格子放武器；格子已经有同名武器就升级
// cell - Board 里的 Cell 对象
// weaponName - 放哪把武器，不传用第一把
// 返回 true 表示成功了
Battle.prototype.placeWeapon = function (cell, weaponName) {
  if (!cell) return false;

  const name = weaponName || this.weaponNames()[0];
  if (!name) {
    console.warn('[battle] 武器表是空的');
    return false;
  }

  const maxLevel = this.tpl.maxLevel || 4;
  let targetLevel = 1;

  // 格子上已有武器：必须同名，且没满级，才合成
  if (cell.card) {
    if (cell.card.name !== name) return false;
    if (cell.card.level >= maxLevel) return false;
    targetLevel = cell.card.level + 1;
  }

  const def = this.weaponDef(name, targetLevel);
  if (!def) {
    console.warn('[battle] 武器表里没有 ' + name + ' 的 ' + targetLevel + ' 级');
    return false;
  }

  const cost = def.cost || 0;
  if (this.coins < cost) {
    console.log('[battle] 银币不够：要 ' + cost + '，现有 ' + this.coins);
    return false;
  }

  this.coins -= cost;
  cell.card = { name: name, level: targetLevel, def: def };
  cell.lastFire = -99999;

  // 卡槽里的这张卡被拿走了
  this._consumeSlot(name);

  return true;
};

/* ---------------- 商店 ---------------- */

// 把商店卡槽填满：按顺序轮流分配武器
Battle.prototype.fillShop = function () {
  const shop = this.shop;
  const names = this.weaponNames();
  if (!shop || !shop.slots || !names.length) return;

  for (let i = 0; i < shop.slots.length; i++) {
    const name = names[i % names.length];
    shop.slots[i].weapon = this.weaponDef(name, 1);   // 槽位里卖的是 1 级
    shop.slots[i].sold = false;
  }
};

// 刷新商店：花银币把卡槽补满
// 返回 true 表示刷新成功
Battle.prototype.refreshShop = function () {
  const cost = this.tpl.refreshCost || 0;

  if (this.coins < cost) {
    console.log('[battle] 刷新要 ' + cost + ' 银币，现有 ' + this.coins);
    return false;
  }

  this.coins -= cost;
  this.fillShop();
  return true;
};

// 把一个槽位标成已卖
Battle.prototype._consumeSlot = function (weaponName) {
  const shop = this.shop;
  if (!shop || !shop.slots) return;

  for (let i = 0; i < shop.slots.length; i++) {
    const slot = shop.slots[i];
    if (!slot.sold && slot.weapon && slot.weapon.name === weaponName) {
      slot.sold = true;
      return;
    }
  }
};

/* ---------------- 波次 ---------------- */

// 按波次号生成怪物计划（数量、种类、血量加成全自动）
// n - 第几波，从 1 开始
// 返回 [{ rec, hpMul }, ...]
Battle.prototype.buildWave = function (n) {
  const tpl = this.tpl;

  const normals = this.monsterRecs.filter((r) => (r.kind || 'normal') === 'normal');
  const elites = this.monsterRecs.filter((r) => r.kind === 'elite');
  const bosses = this.monsterRecs.filter((r) => r.kind === 'boss');

  if (!normals.length && !elites.length && !bosses.length) return [];

  // 血量倍率：每波累乘
  const hpMul = Math.pow(tpl.hpGrowth || 1.15, n - 1);

  // 数量：第 1 波 waveBase 只，之后每波加 waveAdd
  const base = tpl.waveBase == null ? 3 : tpl.waveBase;
  const add = tpl.waveAdd == null ? 1.4 : tpl.waveAdd;
  const count = Math.max(1, Math.round(base + (n - 1) * add));

  const plan = [];
  for (let i = 0; i < count; i++) {
    // 精英：到指定波数后，每三只里换一只
    const useElite = elites.length && n >= (tpl.eliteFrom || 3) && i % 3 === 2;
    const pool = useElite ? elites : normals.length ? normals : elites;
    const rec = pool[Math.floor(Math.random() * pool.length)];
    if (rec) plan.push({ rec: rec, hpMul: hpMul });
  }

  // 首领：每 bossEvery 波来一只
  if (bosses.length && tpl.bossEvery && n % tpl.bossEvery === 0) {
    plan.push({ rec: bosses[0], hpMul: hpMul });
  }

  return plan;
};

// 开始下一波
// 返回 true 表示真的开始了
Battle.prototype.startWave = function () {
  if (this.state !== 'build') return false;

  const n = this.wave + 1;
  const plan = this.buildWave(n);

  if (!plan.length) {
    console.warn('[battle] 怪物表是空的，开不了波次');
    return false;
  }

  this.wave = n;
  this.state = 'battle';
  this._plan = plan;
  this._spawnTimer = 0;

  // 生成间隔：波次越高越密，但不小于 400ms
  this._gapMs = Math.max(400, 1400 - (n - 1) * 90);

  if (this.onWaveStart) this.onWaveStart(n, plan.length);
  return true;
};

// 在屏幕四边随机挑一点当出生位置
Battle.prototype._spawnPoint = function () {
  const m = this.tpl.spawnMargin || 0;
  const side = Math.floor(Math.random() * 4);
  const w = this.width;
  const h = this.height;

  if (side === 0) return { x: Math.random() * w, y: -m };
  if (side === 1) return { x: w + m, y: Math.random() * h };
  if (side === 2) return { x: Math.random() * w, y: h + m };
  return { x: -m, y: Math.random() * h };
};

// 从计划里取一只生成
Battle.prototype._spawnOne = function () {
  const item = this._plan.shift();
  if (!item) return;

  const p = this._spawnPoint();
  this.monsters.push(new Monster(item.rec, p.x, p.y, this.cx, this.cy, item.hpMul));
};

/* ---------------- 开火 ---------------- */

// 找离某点最近、且已经在屏幕内的怪物
// x, y - 参照点
// 返回 Monster 或 null
Battle.prototype._nearestMonster = function (x, y) {
  let best = null;
  let bestD = Infinity;

  for (let i = 0; i < this.monsters.length; i++) {
    const m = this.monsters[i];
    if (!m.alive) continue;

    // 屏幕外的不算目标：还没进场就开火会很怪
    if (m.x < 0 || m.y < 0 || m.x > this.width || m.y > this.height) continue;

    const d = (m.x - x) * (m.x - x) + (m.y - y) * (m.y - y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
};

// 从某个格子朝最近的怪物发一颗子弹
Battle.prototype._fireFrom = function (cell) {
  const card = cell.card;
  if (!card || !card.def) return;

  const def = card.def;
  if (this._time - (cell.lastFire || -99999) < (def.cdMs || 0)) return;

  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;

  const target = this._nearestMonster(cx, cy);
  if (!target) return;   // 屏幕上没怪就不开火

  cell.lastFire = this._time;
  this.bullets.push(new Bullet(def, cx, cy, target));
};

/* ---------------- 主循环 ---------------- */

// 推进一帧
// dt - 距上一帧的毫秒数
Battle.prototype.update = function (dt) {
  this._time += dt;

  // 人物所在格子上有武器就尝试开火
  if (this.player && this.player.current) {
    const cell = this.player.current;
    if (cell && cell.card) this._fireFrom(cell);
  }

  if (this.state !== 'battle') return;

  // 1. 按间隔生成
  if (this._plan.length) {
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnOne();
      this._spawnTimer = this._gapMs;
    }
  }

  // 2. 怪物朝篝火走
  for (let i = 0; i < this.monsters.length; i++) {
    const m = this.monsters[i];
    if (!m.alive) continue;

    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const speedMul = Math.pow(this.tpl.speedGrowth || 1, this.wave - 1);
    const step = (m.rec.speed || 0) * speedMul * (dt / 1000);

    m.x += (dx / len) * step;
    m.y += (dy / len) * step;

    // 走到篝火：扣耐久，怪物消失
    if (len <= this.campfire.r) {
      m.alive = false;
      this.hp -= m.rec.damage || 0;
      if (this.hp <= 0) {
        this.hp = 0;
        this.state = 'over';
        this.bullets = [];
        if (this.onOver) this.onOver();
        return;
      }
    }
  }

  // 3. 子弹追踪
  for (let i = 0; i < this.bullets.length; i++) {
    const b = this.bullets[i];
    if (!b.alive) continue;

    const t = b.target;
    if (!t || !t.alive) {
      b.alive = false;
      continue;
    }

    const dx = t.x - b.x;
    const dy = t.y - b.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = (b.def.speed || 0) * (dt / 1000);

    b.x += (dx / len) * step;
    b.y += (dy / len) * step;

    b.life += dt;
    if (b.life > (this.tpl.bulletLifeMs || 6000)) {
      b.alive = false;
      continue;
    }

    // 命中
    if (len <= (this.tpl.hitRadius || 20) + step) {
      t.hp -= b.def.damage || 0;
      b.alive = false;

      if (t.hp <= 0) {
        t.alive = false;

        // 击杀奖励
        const reward = t.rec.coins || 0;
        if (reward) this.coins += reward;
      }
    }
  }

  // 4. 清掉死掉的
  this.monsters = this.monsters.filter((m) => m.alive);
  this.bullets = this.bullets.filter((b) => b.alive);

  // 5. 这一波打完了
  if (!this._plan.length && this.monsters.length === 0) {
    this.state = 'build';
    this.bullets = [];
    if (this.onWaveEnd) this.onWaveEnd(this.wave);
  }
};

// 当前状态快照，给 HUD 用
Battle.prototype.status = function () {
  return {
    coins: this.coins,
    hp: this.hp,
    wave: this.wave,
    state: this.state,
    alive: this.monsters.length,
  };
};

module.exports = { create: create, Battle: Battle };
