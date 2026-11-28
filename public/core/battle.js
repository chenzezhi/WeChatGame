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

  // 走到篝火旁边后停下持续攻击
  this.attacking = false;
  this.atkTimer = rec.atkCd || 1000;
}

// 单颗子弹
// def - 武器表里那一行（含 level / color / kind / damage）
// x, y - 出生坐标
// tx, ty - 目标偏移量，多发时错开落点，看起来才像一束
// target - 追踪的怪物对象
function Bullet(def, x, y, target, ox, oy) {
  this.def = def;
  this.x = x;
  this.y = y;
  this.ox = ox || 0;
  this.oy = oy || 0;
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
  this._shotQueue = [];   // 待发射的子弹（多发时间隔发出）

  // 调试计数：已发射多少发、命中多少次、上一次到格没开火的原因
  this.shotCount = 0;
  this.hitCount = 0;
  this.fireNote = '';

  // 外部回调
  this.onWaveStart = null;
  this.onWaveEnd = null;
  this.onOver = null;

  // 当前选中的商品 { name, level, price, slot }；null 表示用第一把 1 级
  this.selected = null;

  // 已经刷新过几次，用来算刷新价
  this.refreshCount = 0;

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

// 往格子放武器：空格直接放，同名同等级就合成升一级
// cell - Board 里的 Cell 对象
// sel - 选中的商品 { name, level, price, slot }；不传就用第一把 1 级
// 返回 true 表示放上了
Battle.prototype.placeWeapon = function (cell, sel) {
  if (!cell) return false;

  const item = sel || this.defaultItem();
  if (!item) return false;

  const maxLevel = this.tpl.maxLevel || 4;
  let targetLevel;

  if (cell.card) {
    // 合成：必须同名同等级，且没满级
    if (cell.card.name !== item.name) return false;
    if (cell.card.level !== item.level) return false;
    if (cell.card.level >= maxLevel) return false;
    targetLevel = cell.card.level + 1;
  } else {
    targetLevel = item.level;
  }

  const def = this.weaponDef(item.name, targetLevel);
  if (!def) {
    console.warn('[battle] 武器表里没有 ' + item.name + ' 的 ' + targetLevel + ' 级');
    return false;
  }

  const price = item.price || 0;
  if (this.coins < price) {
    console.log('[battle] 银币不够：要 ' + price + '，现有 ' + this.coins);
    return false;
  }

  this.coins -= price;
  cell.card = { name: item.name, level: targetLevel, def: def };
  cell.lastFire = -99999;

  // 商品从卡槽里拿走
  if (item.slot) item.slot.sold = true;
  else this._consumeSlot(item.name);

  return true;
};

// 没选中商品时的默认项：第一把武器的 1 级
// 返回 { name, level, price, slot } 或 null
Battle.prototype.defaultItem = function () {
  const name = this.weaponNames()[0];
  if (!name) return null;

  const def = this.weaponDef(name, 1);
  if (!def) return null;

  return { name: name, level: 1, price: def.cost || 0, slot: null };
};

// 选中商店里的某个卡槽
// slot - Shop 的槽位对象
// 返回选中的商品，槽位空了则返回 null
Battle.prototype.selectSlot = function (slot) {
  if (!slot || slot.sold || !slot.weapon) {
    this.selected = null;
    return null;
  }

  this.selected = {
    name: slot.weapon.name,
    level: slot.level || Number(slot.weapon.level) || 1,
    price: slot.price || 0,
    slot: slot,
  };
  return this.selected;
};

/* ---------------- 商店 ---------------- */

// 按权重随机挑一把武器名
Battle.prototype._pickWeapon = function () {
  const names = this.weaponNames();
  if (!names.length) return null;

  const w = this.tpl.weaponWeights || {};
  let total = 0;
  for (let i = 0; i < names.length; i++) total += w[names[i]] || 1;
  if (total <= 0) return names[0];

  let r = Math.random() * total;
  for (let i = 0; i < names.length; i++) {
    r -= w[names[i]] || 1;
    if (r <= 0) return names[i];
  }
  return names[names.length - 1];
};

// 按权重随机挑一个等级，返回 1~maxLevel
Battle.prototype._pickLevel = function () {
  const weights = this.tpl.levelWeights || [70, 25, 5, 0];
  const max = Math.min(this.tpl.maxLevel || 4, weights.length);

  let total = 0;
  for (let i = 0; i < max; i++) total += weights[i] || 0;
  if (total <= 0) return 1;

  let r = Math.random() * total;
  for (let i = 0; i < max; i++) {
    r -= weights[i] || 0;
    if (r <= 0) return i + 1;
  }
  return 1;
};

// 商店里卖这个等级要多少钱：1 级按表价，2 级以上加价
// def - 武器表里的一行
// 返回价格，单位银币
Battle.prototype.shopPrice = function (def) {
  if (!def) return 0;

  const base = def.cost || 0;
  if (Number(def.level) <= 1) return base;

  const mul = this.tpl.buyMarkup == null ? 1.2 : this.tpl.buyMarkup;
  return Math.round(base * mul);
};

// 把商店卡槽填满：随机武器 + 随机等级
Battle.prototype.fillShop = function () {
  const shop = this.shop;
  if (!shop || !shop.slots || !this.weaponNames().length) return;

  for (let i = 0; i < shop.slots.length; i++) {
    const name = this._pickWeapon();
    const level = this._pickLevel();
    const def = this.weaponDef(name, level);

    shop.slots[i].weapon = def;
    shop.slots[i].level = def ? Number(def.level) : 1;
    shop.slots[i].price = this.shopPrice(def);
    shop.slots[i].sold = false;
  }
};

// 当前刷新价格：第一次 base，每刷一次涨 step
// 返回价格，单位银币
Battle.prototype.refreshPrice = function () {
  const base = this.tpl.refreshCostBase == null ? 15 : this.tpl.refreshCostBase;
  const step = this.tpl.refreshCostStep == null ? 1 : this.tpl.refreshCostStep;
  return base + this.refreshCount * step;
};

// 刷新商店：花银币重新随机卡槽
// 返回 true 表示刷新成功
Battle.prototype.refreshShop = function () {
  const cost = this.refreshPrice();

  if (this.coins < cost) {
    console.log('[battle] 刷新要 ' + cost + ' 银币，现有 ' + this.coins);
    return false;
  }

  this.coins -= cost;
  this.refreshCount += 1;
  this.selected = null;
  this.fillShop();
  return true;
};

// 把一个槽位标成已卖（没有指定槽位时，按武器名找第一个）
// weaponName - 武器名
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

// 从某点看向最近怪物的角度（给画图用：武器要转过去对准）
// x, y - 参照点
// 返回弧度值，没有目标时返回 null
Battle.prototype.aimAt = function (x, y) {
  const m = this._nearestMonster(x, y);
  if (!m) return null;
  return Math.atan2(m.y - y, m.x - x);
};

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

// 从某个格子朝最近的怪物发一轮子弹
// cell - 有武器的格子
// 返回本次发了几发
Battle.prototype._fireFrom = function (cell) {
  const card = cell.card;
  if (!card || !card.def) return 0;

  const def = card.def;
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;

  const target = this._nearestMonster(cx, cy);
  if (!target) return 0;   // 屏幕上没怪就不开火

  // 这一级一次发几发：1 / 2 / 4 / 8
  const shots = Math.max(1, def.shots || 1);
  const gap = this.tpl.shotGapMs || 60;

  // 不一次性全吐出去，排进队列按间隔陆续发
  for (let i = 0; i < shots; i++) {
    this._shotQueue.push({
      def: def,
      x: cx,
      y: cy,
      target: target,
      at: this._time + i * gap,
      ring: cell.w * 0.16,
      index: i,
      total: shots,
    });
  }

  cell.lastFire = this._time;
  return shots;
};

// 把到时间的待发射子弹真的发出去
// 一发一个间隔，看起来就是连续的
Battle.prototype._flushShots = function () {
  if (!this._shotQueue.length) return;

  const keep = [];
  for (let i = 0; i < this._shotQueue.length; i++) {
    const s = this._shotQueue[i];

    // 还没到时间，留到下一帧
    if (s.at > this._time) {
      keep.push(s);
      continue;
    }

    // 目标已经死了，这一发就不发了
    if (!s.target || !s.target.alive) continue;

    // 多发时散开一点，不要完全重叠
    const a = (Math.PI * 2 * s.index) / Math.max(1, s.total);
    const ox = Math.cos(a) * s.ring;
    const oy = Math.sin(a) * s.ring;
    const tx = Math.cos(a) * (this.tpl.hitRadius || 20) * 0.6;
    const ty = Math.sin(a) * (this.tpl.hitRadius || 20) * 0.6;

    this.bullets.push(new Bullet(s.def, s.x + ox, s.y + oy, s.target, tx, ty));
    this.shotCount += 1;
  }

  this._shotQueue = keep;
};

/* ---------------- 主循环 ---------------- */

// 推进一帧
// dt - 距上一帧的毫秒数
Battle.prototype.update = function (dt) {
  this._time += dt;

  // 只有战斗中才推进一切；布阵和结束都直接返回
  if (this.state !== 'battle') return;

  // 1. 人物刚踏进一个格子：这格有武器就发一轮
  // 只在「到格」这一瞬间触发，不会在格子之间重复开火
  if (this.player && this.player.entered) {
    const cell = this.player.current;
    if (cell) {
      if (!cell.card) {
        this.fireNote = '无武器';
      } else {
        const n = this._fireFrom(cell);
        this.fireNote = n ? '发射 ' + n : '无目标';
      }
    }
  }

  // 1. 把到时间的子弹发出去（多发就是这样一发一发出来的）
  this._flushShots();

  // 2. 按间隔生成
  if (this._plan.length) {
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnOne();
      this._spawnTimer = this._gapMs;
    }
  }

  // 2. 怪物朝篝火走；走到旁边就停下，按间隔持续攻击
  for (let i = 0; i < this.monsters.length; i++) {
    const m = this.monsters[i];
    if (!m.alive) continue;

    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // 进到篝火攻击范围，停下开打
    if (len <= this.campfire.r) m.attacking = true;

    if (m.attacking) {
      m.atkTimer -= dt;
      if (m.atkTimer <= 0) {
        m.atkTimer = m.rec.atkCd || 1000;
        this.hp -= m.rec.damage || 0;

        if (this.hp <= 0) {
          this.hp = 0;
          this.state = 'over';
          this.bullets = [];
          this._shotQueue = [];
          if (this.onOver) this.onOver();
          return;
        }
      }

      // 攻击中不再移动
      continue;
    }

    const speedMul = Math.pow(this.tpl.speedGrowth || 1, this.wave - 1);
    const step = (m.rec.speed || 0) * speedMul * (dt / 1000);

    m.x += (dx / len) * step;
    m.y += (dy / len) * step;
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

    const dx = t.x + b.ox - b.x;
    const dy = t.y + b.oy - b.y;
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
      this.hitCount += 1;
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

  // 5. 这一波打完了：自动刷新商店，回到布阵
  if (!this._plan.length && this.monsters.length === 0) {
    this.state = 'build';
    this.bullets = [];
    this._shotQueue = [];
    this.fillShop();          // 每波结束免费补满卡槽
    if (this.onWaveEnd) this.onWaveEnd(this.wave);
  }
};

// 重新开始一局：清空棋盘上的武器，数值和波次全部回到开局
Battle.prototype.restart = function () {
  this.coins = this.tpl.coins || 0;
  this.hp = this.tpl.cellHp || 0;
  this.wave = 0;
  this.state = 'build';

  this.monsters = [];
  this.bullets = [];
  this._plan = [];
  this._shotQueue = [];
  this._spawnTimer = 0;
  this._time = 0;

  this.refreshCount = 0;
  this.selected = null;

  // 棋盘上的武器全部清掉
  if (this.board && this.board.cells) {
    for (let i = 0; i < this.board.cells.length; i++) {
      this.board.cells[i].card = null;
    }
  }

  this.fillShop();
};

// 当前状态快照，给 HUD 用
Battle.prototype.status = function () {
  return {
    coins: this.coins,
    hp: this.hp,
    wave: this.wave,
    state: this.state,
    alive: this.monsters.length,
    shots: this.shotCount,
    hits: this.hitCount,
    note: this.fireNote,
  };
};

module.exports = { create: create, Battle: Battle };
