// 商店模块控制器：升级属性（主体 / 分身） + 购买道具。对外只暴露场景接口。

const scenes = require('../core/scenes.js');
const profile = require('../core/profile.js');
const buttons = require('./buttons.js');
const view = require('./view.js');

const state = {
  built: null,
  data: null,
  coins: 0,
  tab: 'player',   // player | clone
};

function toast(title) {
  try { wx.showToast({ title: title, icon: 'none' }); } catch (e) { /* 忽略 */ }
}

function refresh() {
  state.data = profile.read();
  state.coins = state.data.coins;
  state.built = buttons.build(state.data, state.tab);
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

function doBuy(id) {
  const row = findItemRow(id);
  if (!row) return;

  if (!spend(row.cost)) return;

  state.data.items[id] = (state.data.items[id] || 0) + 1;
  profile.write(state.data);
  refresh();

  toast('购买成功');
}

function findItemRow(id) {
  const rows = (state.built && state.built.rows) || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].kind === 'item' && rows[i].id === id) return rows[i];
  }
  return null;
}

function enter() {
  refresh();
}

function exit() {
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

  const b = buttons.hit(state.built, p.x, p.y);
  if (!b) return;

  if (b.kind === 'back') {
    scenes.switchTo('menu');
    return;
  }

  if (b.kind === 'tab') {
    state.tab = b.id;
    refresh();
    return;
  }

  if (b.kind === 'upgrade') {
    doUpgrade(b.id, false);
    return;
  }

  if (b.kind === 'clone-upgrade') {
    doUpgrade(b.id, true);
    return;
  }

  if (b.kind === 'item') {
    doBuy(b.id);
  }
}

module.exports = {
  enter: enter,
  exit: exit,
  update: update,
  render: render,
  touchStart: touchStart,
};
