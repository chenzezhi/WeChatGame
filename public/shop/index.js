// 商店控制器：升级（主体 / 分身） + 购买道具 + 永久分身 + 弹道夹角滑块。
// 点击：按下不动、在同一行松手才生效。
// 滑块：按住夹角行左侧的滑块上下拖动，实时生效（松手才落盘）。

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

  drag: null,      // 正在拖动的夹角滑块
};

function toast(title) {
  try { wx.showToast({ title: title, icon: 'none' }); } catch (e) { /* 忽略 */ }
}

// 只重建视图，不重新读盘（拖动时用）
function applyView() {
  state.coins = (state.data && state.data.coins) || 0;
  state.built = buttons.build(state.data, state.tab);
}

function refresh() {
  state.data = profile.read();
  applyView();
}

function resetDown() {
  state.downId = -1;
  state.downBtn = null;
  state.moved = false;
  state.drag = null;
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
    state.data.cloneUpgrades = { hp: 0, fire: 0, multi: 0, spread: 0, spreadAdj: 0, damage: 0 };
  }

  return isClone ? state.data.cloneUpgrades : state.data.upgrades;
}

function doUpgrade(id, isClone) {
  const store = upgradeStore(isClone);
  const lv = store[id] || 0;

  if (buttons.isMaxLevel(id, lv)) {
    toast('已经满级了');
    return;
  }

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

// ---------------- 夹角滑块 ----------------
function applyDrag(y) {
  const d = state.drag;
  if (!d || !(d.range > 0)) return;

  const h = d.rect.h > 1 ? d.rect.h : 1;
  let t = (y - d.rect.y) / h;
  if (t < 0) t = 0;
  if (t > 1) t = 1;

  const adj = Math.round((1 - t) * d.range * 10) / 10;
  const store = d.isClone ? state.data.cloneUpgrades : state.data.upgrades;
  if (!store) return;

  store.spreadAdj = adj;
  applyView();
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

  const sliderRow = buttons.hitSlider(state.built, p.x, p.y);

  if (sliderRow) {
    state.downId = p.id;
    state.downX = p.x;
    state.downY = p.y;
    state.moved = false;
    state.downBtn = null;
    state.drag = {
      id: p.id,
      rect: { x: sliderRow.slider.x, y: sliderRow.slider.y, w: sliderRow.slider.w, h: sliderRow.slider.h },
      range: sliderRow.sliderRange || 0,
      isClone: sliderRow.kind === 'clone-upgrade',
    };
    applyDrag(p.y);
    return;
  }

  state.drag = null;
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

  if (state.drag) {
    applyDrag(p.y);
    return;
  }

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

  // 拖动滑块结束：落盘并重建
  if (state.drag) {
    if (p) applyDrag(p.y);
    resetDown();
    profile.write(state.data);
    refresh();
    return;
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
