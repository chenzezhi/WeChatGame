// 玩家资产（金币 / 商店升级 / 已购道具 / 永久分身）：与游戏进度存档无关，永久保留。
// 进度存档是 save.json（可被死亡删除），资产存档是 profile.json（永不删除）。
//
// upgrades      主体属性升级
// cloneUpgrades 分身属性升级（独立计算，价格是主体的两倍）
// permClones    已拥有的永久分身数量（每局开局都会生成）

const FILE_NAME = 'profile.json';
const USER_DATA = (wx.env && wx.env.USER_DATA_PATH) || '';

let fs = null;
try { fs = wx.getFileSystemManager(); } catch (e) { fs = null; }

function ready() {
  return !!fs && !!USER_DATA;
}

function filePath() {
  return USER_DATA + '/' + FILE_NAME;
}

function defaults() {
  return {
    coins: 0,
    bossKills: 0,
    upgrades: { hp: 0, fire: 0, multi: 0, damage: 0, cloneLife: 0 },
    cloneUpgrades: { hp: 0, fire: 0, multi: 0, damage: 0 },
    items: { heal: 0, speed: 0, multi: 0, clone: 0, damage: 0 },
    permClones: 0,
  };
}

function int(v) {
  const n = (typeof v === 'number' && isFinite(v)) ? Math.floor(v) : 0;
  return n > 0 ? n : 0;
}

function readUpgrades(src) {
  const u = src || {};
  return {
    hp: int(u.hp),
    fire: int(u.fire),
    multi: int(u.multi),
    damage: int(u.damage),
    cloneLife: int(u.cloneLife),
  };
}

function normalize(src) {
  const out = defaults();
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
