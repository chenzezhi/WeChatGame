'use strict';

/* ==================== 功能 ====================
 * Battle —— 一局的战斗逻辑
 *
 * 只管数和规则：银币、法阵耐久、怪物、子弹、波次。
 * 一行渲染代码都没有——坐标算出来交给 battle-view 去画。
 * ==============================================*/

/* ==================== 用法 ====================
 * const Battle = require('./battle.js');
 *
 * const battle = Battle.create({ board, player, width: w, height: h, config: COMBAT });
 * battle.placeWeapon(cell);    // 点格子放一把武器，返回 true/false
 * battle.startWave();          // 开始下一波
 * battle.update(dt);           // 每帧推进，dt 单位毫秒
 * battle.status();             // { coins, hp, wave, state, alive }
 * ==============================================*/

/* ==================== 注意 ====================
 * 坐标单位 px，速度单位 px/秒，时间单位毫秒。
 * 状态机：build（布阵）→ battle（战斗）→ build 或 over（耐久归零）。
 * 子弹不做弹道物理：每帧朝目标当前位置直线飞，距离小于 hitRadius 就命中。
 * ==============================================*/

const Records = require('./records.js');

// 单只怪物
// rec - 怪物表里的一行 { name, hp, speed, damage, asset }
// x, y - 出生坐标，单位 px
// tx, ty - 目标点（法阵中心）
function Monster(rec, x, y, tx, ty) {
  this.rec = rec;
  this.x = x;
  this.y = y;
  this.tx = tx;
  this.ty = ty;
  this.hp = rec.hp;
  this.maxHp = rec.hp;
  this.alive = true;
  this.asset = rec.asset;
}

// 单颗子弹
// weapon - 武器表里的一行
// x, y - 出生坐标
// target - 追踪的怪物对象
function Bullet(weapon, x, y, target) {
  this.weapon = weapon;
  this.x = x;
  this.y = y;
  this.target = target;
  this.life = 0;
  this.alive = true;
  this.asset = weapon.asset;
}

// 一局战斗
// deps - { board, player, width, height, config }
//   board  Board 对象，提供格子坐标和法阵中心
//   player Player 对象，用来判断人物走进了哪个格子
//   width/height 画布物理像素尺寸
//   config public/config/combat.js
function Battle(deps) {
  const d = deps || {};
  const cfg = d.config || {};
  const tpl = cfg.template || {};
  const files = cfg.files || {};

  this.cfg = cfg;
  this.tpl = tpl;
  this.board = d.board || null;
  this.player = d.player || null;
  this.shop = d.shop || null;
  this.width = d.width || 0;
  this.height = d.height || 0;

  // 三张表，读不到就是空数组，游戏照样能起
  this.weapons = safeLoad(files.weapons, '武器');
  this.monsterRecs = safeLoad(files.monsters, '怪物');
  this.waves = safeLoad(files.waves, '波次');

  // 数值状态
  this.coins = tpl.coins || 0;
  this.hp = tpl.cellHp || 0;
  this.wave = 0;
  this.state = 'build';   // build | battle | over

  // 运行时对象
  this.monsters = [];
  this.bullets = [];

  // 法阵中心，怪物朝这里走
  this.cx = this.board ? this.board.originX + this.board.width / 2 : this.width / 2;
  this.cy = this.board ? this.board.originY + this.board.height / 2 : this.height / 2;

  // 篝火：怪物要攻打的目栙，也是防守目标
  // x, y - 中心坐标，单位 px
  // r - 到达判定半径，单位 px（进这个范围就算攻到）
  const campR = tpl.campfireRadiusRatio == null ? 0.45 : tpl.campfireRadiusRatio;
  this.campfire = {
    x: this.cx,
    y: this.cy,
    r: (this.board ? this.board.cellW : 80) * campR,
  };

  this._time = 0;          // 累计毫秒
  this._spawnLeft = 0;     // 这一波还剩几只没生成
  this._spawnTimer = 0;    // 距离下一只生成还要多久，单位毫秒
  this._fireTimer = 0;     // 开火冷却计时

  // 外部回调，view 用它们触发提示
  this.onWaveStart = null;
  this.onWaveEnd = null;
  this.onOver = null;

  // 当前选中的武器名；null 表示用武器表第一把
  this.selectedWeapon = null;

  // 开局把商店卡槽填满
  this.fillShop();
}

// 读一张表，出错时打日志并返回空数组
// path - 文件路径
// label - 出错提示里的中文名
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
// deps - 见上面 Battle 的说明
// 返回 Battle 对象
function create(deps) {
  return new Battle(deps);
}

// 往格子上放一把武器，扣银币
// cell - Board 里的 Cell 对象
// weaponName - 要放哪把武器（武器表里的 name）；不传就用第一把
// 返回 true 表示放上了，false 表示银币不够 / 格子已有武器 / 找不到武器
Battle.prototype.placeWeapon = function (cell, weaponName) {
  if (!cell) return false;

  // 已经有了就不覆盖
  if (cell.card) return false;

  const cost = this.tpl.weaponCost || 0;
  if (this.coins < cost) {
    console.log('[battle] 银币不够，还差 ' + (cost - this.coins));
    return false;
  }

  const weapon = weaponName
    ? Records.find(this.weapons, 'name', weaponName)
    : this.weapons[0] || null;

  if (!weapon) {
    console.warn('[battle] 找不到武器：' + (weaponName || '（武器表为空）'));
    return false;
  }

  this.coins -= cost;
  cell.card = weapon;
  cell.lastFire = -99999;

  // 卡槽里的这张卡被拿走了，槽位变空
  this._consumeSlot(weapon.name);

  return true;
};

// 把商店卡槽重新填满：按顺序分配给每个槽位
Battle.prototype.fillShop = function () {
  const shop = this.shop;
  if (!shop || !shop.slots || !this.weapons.length) return;

  for (let i = 0; i < shop.slots.length; i++) {
    const slot = shop.slots[i];
    slot.weapon = this.weapons[i % this.weapons.length] || null;
    slot.sold = false;
  }
};

// 刷新商店：花银币把卡槽补满
// 返回 true 表示刷新成功
Battle.prototype.refreshShop = function () {
  const cost = this.tpl.refreshCost || 0;

  if (this.coins < cost) {
    console.log('[battle] 刷新要 ' + cost + ' 银币，现在只有 ' + this.coins);
    return false;
  }

  this.coins -= cost;
  this.fillShop();
  return true;
};

// 把一个槽位标成已卖（同名武器取第一个未卖的）
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

// 开始下一波
// 返回 true 表示真的开始了
Battle.prototype.startWave = function () {
  if (this.state !== 'build') return false;

  const next = this.wave + 1;
  const row = Records.find(this.waves, 'wave', next);
  if (!row) {
    console.log('[battle] 没有第 ' + next + ' 波了，全部打完');
    return false;
  }

  const rec = Records.find(this.monsterRecs, 'name', row.monster);
  if (!rec) {
    console.warn('[battle] 波次表引用了不存在的怪物：' + row.monster);
    return false;
  }

  this.wave = next;
  this.state = 'battle';
  this._spawnLeft = row.count || 1;
  this._spawnTimer = 0;
  this._waveRec = row;
  this._monsterRec = rec;

  if (this.onWaveStart) this.onWaveStart(next);
  return true;
};

// 在屏幕四边随机挑一点当出生位置
// 返回 { x, y }
Battle.prototype._spawnPoint = function () {
  const m = this.tpl.spawnMargin || 0;
  const side = Math.floor(Math.random() * 4);
  const w = this.width;
  const h = this.height;

  if (side === 0) return { x: Math.random() * w, y: -m };          // 上
  if (side === 1) return { x: w + m, y: Math.random() * h };       // 右
  if (side === 2) return { x: Math.random() * w, y: h + m };       // 下
  return { x: -m, y: Math.random() * h };                          // 左
};

// 生成一只怪物
Battle.prototype._spawn = function () {
  const p = this._spawnPoint();
  const m = new Monster(this._monsterRec, p.x, p.y, this.cx, this.cy);
  this.monsters.push(m);
};

// 找离某点最近的活着的怪物
// x, y - 参照点
// 返回 Monster 或 null
Battle.prototype._nearestMonster = function (x, y) {
  let best = null;
  let bestD = Infinity;

  for (let i = 0; i < this.monsters.length; i++) {
    const m = this.monsters[i];
    if (!m.alive) continue;
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
  const weapon = cell.card;
  if (!weapon) return;

  if (this._time - (cell.lastFire || -99999) < (weapon.cdMs || 0)) return;

  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;

  const target = this._nearestMonster(cx, cy);
  if (!target) return;

  cell.lastFire = this._time;
  this.bullets.push(new Bullet(weapon, cx, cy, target));
  this._fireTimer = this.tpl.fireCooldownMs || 0;
};

// 推进一帧
// dt - 距上一帧的毫秒数
Battle.prototype.update = function (dt) {
  this._time += dt;
  if (this._fireTimer > 0) this._fireTimer -= dt;

  // 人物所在格子上有武器就尝试开火，每格用自己的 cd 限制
  // 不只看「刚走进来的那一刻」，站在格子上也会继续开火
  if (this.player && this.player.current) {
    const cell = this.player.current;
    if (cell && cell.card) this._fireFrom(cell);
  }

  if (this.state !== 'battle') return;

  // 1. 按间隔生成怪物
  if (this._spawnLeft > 0) {
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawn();
      this._spawnLeft -= 1;
      this._spawnTimer = this._waveRec.gapMs || 1000;
    }
  }

  // 2. 怪物朝法阵中心走
  for (let i = 0; i < this.monsters.length; i++) {
    const m = this.monsters[i];
    if (!m.alive) continue;

    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = (m.rec.speed || 0) * (dt / 1000);

    m.x += (dx / len) * step;
    m.y += (dy / len) * step;

    // 走到篝火：扣耐久，怪物消失
    if (len <= this.campfire.r) {
      m.alive = false;
      this.hp -= m.rec.damage || 0;
      if (this.hp <= 0) {
        this.hp = 0;
        this.state = 'over';
        if (this.onOver) this.onOver();
        return;
      }
    }
  }

  // 3. 子弹朝目标飞
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
    const step = (b.weapon.speed || 0) * (dt / 1000);

    b.x += (dx / len) * step;
    b.y += (dy / len) * step;

    b.life += dt;
    if (b.life > (this.tpl.bulletLifeMs || 5000)) {
      b.alive = false;
      continue;
    }

    // 命中
    if (len <= (this.tpl.hitRadius || 20) + step) {
      t.hp -= b.weapon.damage || 0;
      b.alive = false;
      if (t.hp <= 0) {
        t.alive = false;

        // 击杀奖励：按怪物表的 coins 加银币
        const reward = t.rec.coins || 0;
        if (reward) {
          this.coins += reward;
          console.log('[battle] 杀一只 ' + t.rec.name + '，+' + reward + ' 银币（共 ' + this.coins + '）');
        }
      }
    }
  }

  // 4. 清掉死掉的对象，留出内存
  this.monsters = this.monsters.filter((m) => m.alive);
  this.bullets = this.bullets.filter((b) => b.alive);

  // 5. 这一波打完了：回到布阵状态
  if (this._spawnLeft <= 0 && this.monsters.length === 0) {
    this.state = 'build';
    this.bullets = [];
    if (this.onWaveEnd) this.onWaveEnd(this.wave);
  }
};

// 当前状态快照，给 HUD 用
// 返回 { coins, hp, wave, state, alive }
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
