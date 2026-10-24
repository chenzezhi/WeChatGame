// 玩家资产（金币 / 商店升级 / 已购道具 / 永久分身 / 主动道具）：与游戏进度存档无关，永久保留。
// 进度存档是 save.json（可被死亡删除），资产存档是 profile.json（永不删除）。
//
// upgrades        主体属性升级
// cloneUpgrades   分身属性升级（独立计算，价格是主体的两倍）
// permClones      已拥有的永久分身数量（每局开局都会生成）
// activeItems     主动道具的剩余个数（护盾 / 变大），一次性消耗
// activeUpgrades  主动道具「持续时长」的升级等级
//
// spread     弹道夹角的等级（主体 / 分身各自独立）
// spreadAdj  弹道夹角的手动偏移（度）：在「已购买的夹角」到「初始夹角」之间自由调整

const FILE_NAME = 'profile.json';
const USER_DATA = (wx.env && wx.env.USER_DATA_PATH) || '';

let fs = null;
try { fs = wx.getFileSystemManager(); } catch (e) { fs = null; }

// ============ 开发期测试资产（上线前把这里改回 null） ============
// 仅在 profile.json 不存在时作为初始值使用；也可以在设置页点「重置游戏数据」重新写入。
const DEV_PROFILE = {
  coins: 99999,
  bossKills: 0,
  upgrades: { hp: 0, fire: 0, multi: 0, spread: 0, spreadAdj: 0, damage: 0, cloneLife: 0, ammo: 0, reload: 0 },
  cloneUpgrades: { hp: 0, fire: 0, multi: 0, spread: 0, spreadAdj: 0, damage: 0 },
  items: { heal: 0, speed: 0, multi: 0, clone: 0, damage: 0, ammo: 0, reload: 0, spread: 0 },
  activeItems: { shield: 5, grow: 3 },
  activeUpgrades: { shield: 0, grow: 0 },
  permClones: 0,
};
// ================================================================

function ready() {
  return !!fs && !!USER_DATA;
}

function filePath() {
  return USER_DATA + '/' + FILE_NAME;
}

function defaults() {
  if (DEV_PROFILE) {
    // 返回深拷贝，避免被调用方改坏测试常量
    return normalize(JSON.parse(JSON.stringify(DEV_PROFILE)));
  }

  return {
    coins: 0,
    bossKills: 0,
    upgrades: { hp: 0, fire: 0, multi: 0, spread: 0, spreadAdj: 0, damage: 0, cloneLife: 0, ammo: 0, reload: 0 },
    cloneUpgrades: { hp: 0, fire: 0, multi: 0, spread: 0, spreadAdj: 0, damage: 0 },
    items: { heal: 0, speed: 0, multi: 0, clone: 0, damage: 0, ammo: 0, reload: 0, spread: 0 },
    activeItems: { shield: 0, grow: 0 },
    activeUpgrades: { shield: 0, grow: 0 },
    permClones: 0,
  };
}

function int(v) {
  const n = (typeof v === 'number' && isFinite(v)) ? Math.floor(v) : 0;
  return n > 0 ? n : 0;
}

function num(v) {
  const n = (typeof v === 'number' && isFinite(v)) ? v : 0;
  return n > 0 ? n : 0;
}

function readUpgrades(src) {
  const u = src || {};
  return {
    hp: int(u.hp),
    fire: int(u.fire),
    multi: int(u.multi),
    spread: int(u.spread),
    spreadAdj: num(u.spreadAdj),
    damage: int(u.damage),
    cloneLife: int(u.cloneLife),
    ammo: int(u.ammo),
    reload: int(u.reload),
  };
}

function normalize(src) {
  const out = {
    coins: 0,
    bossKills: 0,
    upgrades: { hp: 0, fire: 0, multi: 0, spread: 0, spreadAdj: 0, damage: 0, cloneLife: 0, ammo: 0, reload: 0 },
    cloneUpgrades: { hp: 0, fire: 0, multi: 0, spread: 0, spreadAdj: 0, damage: 0 },
    items: { heal: 0, speed: 0, multi: 0, clone: 0, damage: 0, ammo: 0, reload: 0, spread: 0 },
    activeItems: { shield: 0, grow: 0 },
    activeUpgrades: { shield: 0, grow: 0 },
    permClones: 0,
  };

  if (!src || typeof src !== 'object') return out;

  out.coins = int(src.coins);
  out.bossKills = int(src.bossKills);
  out.permClones = int(src.permClones);

  out.upgrades = readUpgrades(src.upgrades);
  out.cloneUpgrades = readUpgrades(src.cloneUpgrades);

  const it = src.items || {};
  out.items.heal = int(it.heal);
  out.items.speed = int(it.speed);
  out.items.multi = int(it.multi);
  out.items.clone = int(it.clone);
  out.items.damage = int(it.damage);
  out.items.ammo = int(it.ammo);
  out.items.reload = int(it.reload);
  out.items.spread = int(it.spread);

  const ai = src.activeItems || {};
  out.activeItems.shield = int(ai.shield);
  out.activeItems.grow = int(ai.grow);

  const au = src.activeUpgrades || {};
  out.activeUpgrades.shield = int(au.shield);
  out.activeUpgrades.grow = int(au.grow);

  return out;
}

function read() {
  if (!ready()) return defaults();

  let raw = null;
  try { raw = fs.readFileSync(filePath(), 'utf8'); } catch (e) { return defaults(); }

  try { return normalize(JSON.parse(raw)); } catch (e) { return defaults(); }
}

function write(data) {
  const out = normalize(data);
  if (!ready()) return out;

  try { fs.writeFileSync(filePath(), JSON.stringify(out), 'utf8'); } catch (e) { /* 忽略 */ }
  return out;
}

function addCoins(n) {
  const data = read();
  data.coins = int(data.coins + int(n));
  return write(data);
}

module.exports = {
  read: read,
  write: write,
  addCoins: addCoins,
  defaults: defaults,
};
