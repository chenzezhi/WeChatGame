// 商店控制器：升级（主体 / 分身） + 购买道具 + 永久分身。
// 只认「点击」：按下不动、在同一行松手才生效；按住或滑动都不触发。

const scenes = require('../core/scenes.js');
const profile = require('../core/profile.js');
const buttons = require('./buttons.js');
const view = require('./view.js');

const TAP_SLOP = 14;

const state = {
  built: null,
  data: null,
  coins: 0,
  tab: 'player',   // player | clone | items

  downId: -1,
  downX: 0,
  downY: 0,
  downBtn: null,
  moved: false,
};

function toast(title) {
  try { wx.showToast({ title: title, icon: 'none' }); } catch (e) { /* 忽略 */ }
}

function refresh() {
  state.data = profile.read();
  state.coins = state.data.coins;
  state.built = buttons.build(state.data, state.tab);
}

function resetDown() {
  state.downId = -1;
  state.downBtn = null;
  state.moved = false;
}

function spend(cost) {
  if (state.data.coins < cost) {
    toast('金币不足');
    return false;
  }

  state.data.coins -= cost;
  return true;
}

function upgradeStore(isClone) {
  if (!state.data.cloneUpgrades) {
    state.data.cloneUpgrades = { hp: 0, fire: 0, multi: 0, damage: 0 };
  }

  return isClone ? state.data.cloneUpgrades : state.data.upgrades;
}

function doUpgrade(id, isClone) {
  const store = upgradeStore(isClone);
  const lv = store[id] || 0;
  const cost = buttons.costOf(id, lv, isClone);

  if (!spend(cost)) return;

  store[id] = lv + 1;
  profile.write(state.data);
  refresh();

  toast((isClone ? '分身' : '主体') + '升级成功 · Lv.' + (lv + 1));
}

function findRow(kind, id) {
  const rows = (state.built && state.built.rows) || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].kind !== kind) continue;
    if (id && rows[i].id !== id) continue;
    return rows[i];
  }
  return null;
}

function doBuy(id) {
  const row = findRow('item', id);
  if (!row) return;
  if (!spend(row.cost)) return;

  state.data.items[id] = (state.data.items[id] || 0) + 1;
  profile.write(state.data);
  refresh();

  toast('购买成功');
}

function doBuyPermClone() {
  const row = findRow('perm-clone', null);
  if (!row) return;
  if (!spend(row.cost)) return;

  state.data.permClones = (state.data.permClones || 0) + 1;
  profile.write(state.data);
  refresh();

  toast('获得 1 个永久分身');
}

function act(b) {
  if (!b) return;

  if (b.kind === 'back') {
    scenes.switchTo('menu');
    return;
  }

  if (b.kind === 'tab') {
    if (state.tab === b.id) return;
    state.tab = b.id;
    refresh();
    return;
  }

  if (b.kind === 'upgrade') { doUpgrade(b.id, false); return; }
  if (b.kind === 'clone-upgrade') { doUpgrade(b.id, true); return; }
  if (b.kind === 'perm-clone') { doBuyPermClone(); return; }
  if (b.kind === 'item') { doBuy(b.id); }
}

function enter() {
  resetDown();
  refresh();
}

function exit() {
  resetDown();
  profile.write(state.data);
}

function update() {
  // 无动画
}

function render(ctx) {
  view.draw(ctx, state);
}

function touchStart(e) {
  const p = e.touches && e.touches[0];
  if (!p) return;

  state.downId = p.id;
  state.downX = p.x;
  state.downY = p.y;
  state.moved = false;
  state.downBtn = buttons.hit(state.built, p.x, p.y);
}

function touchMove(e) {
  if (state.downId < 0) return;

  const list = e.touches || [];
  let p = null;

  for (let i = 0; i < list.length; i++) {
    if (list[i].id === state.downId) { p = list[i]; break; }
  }

  if (!p) return;

  const dx = p.x - state.downX;
  const dy = p.y - state.downY;

  if (dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) state.moved = true;
}

function touchEnd(e) {
  if (state.downId < 0) return;

  const changed = e.changed || [];
  let p = null;

  for (let i = 0; i < changed.length; i++) {
    if (changed[i].id === state.downId) { p = changed[i]; break; }
  }

  const x = p ? p.x : state.downX;
  const y = p ? p.y : state.downY;

  const down = state.downBtn;
  const moved = state.moved;

  resetDown();

  if (!down || moved) return;

  const up = buttons.hit(state.built, x, y);
  if (!up || up.kind !== down.kind || up.id !== down.id) return;

  act(up);
}

module.exports = {
  enter: enter,
  exit: exit,
  update: update,
  render: render,
  touchStart: touchStart,
  touchMove: touchMove,
  touchEnd: touchEnd,
};
