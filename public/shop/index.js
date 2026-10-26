// 商店控制器：升级（主体 / 分身） + 被动道具 + 主动道具（买 / 升时长） + 永久分身 + 夹角滑块。
//
// 坐标系：触摸点先经 core/ui.point() 转成设计坐标，之后所有命中检测 /
// 滚动 / 滑块计算都在设计坐标系里做，视觉与点击永远一致。
//
// 点击：按下不动、在同一行松手才生效。
// 滚动：按下后纵向拖动超过 TAP_SLOP 即滚动（不会误触发购买）。
// 滑块：按住夹角行左侧滑块上下拖动，优先级高于滚动。

const scenes = require('../core/scenes.js');
const profile = require('../core/profile.js');
const audio = require('../core/audio.js');
const ui = require('../core/ui.js');
const buttons = require('./buttons.js');
const view = require('./view.js');

const TAP_SLOP = 12;

const state = {
  built: null,
  data: null,
  coins: 0,
  tab: 'player',   // player | clone | items

  scroll: 0,
  downScroll: 0,

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

function applyView() {
  state.coins = (state.data && state.data.coins) || 0;
  state.built = buttons.build(state.data, state.tab, state.scroll);
  state.scroll = state.built.scroll;
}

function refresh() {
  state.data = profile.read();
  applyView();
}

function setScroll(v) {
  const max = state.built ? state.built.scrollMax : 0;

  let n = v;
  if (!isFinite(n)) n = 0;
  if (n < 0) n = 0;
  if (n > max) n = max;

  if (n === state.scroll) return;

  state.scroll = n;
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
    return false;
  }

  const cost = buttons.costOf(id, lv, isClone);
  if (!spend(cost)) return false;

  store[id] = lv + 1;
  profile.write(state.data);
  refresh();

  toast((isClone ? '分身' : '主体') + '升级成功 · Lv.' + (lv + 1));
  return true;
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
  if (!row) return false;
  if (!spend(row.cost)) return false;

  state.data.items[id] = (state.data.items[id] || 0) + 1;
  profile.write(state.data);
  refresh();

  toast('购买成功');
  return true;
}

function doBuyPermClone() {
  const row = findRow('perm-clone', null);
  if (!row) return false;
  if (!spend(row.cost)) return false;

  state.data.permClones = (state.data.permClones || 0) + 1;
  profile.write(state.data);
  refresh();

  toast('获得 1 个永久分身');
  return true;
}

// ---------------- 主动道具 ----------------
function doActiveBuy(id) {
  const row = findRow('active-buy', id);
  if (!row) return false;
  if (!spend(row.cost)) return false;

  if (!state.data.activeItems) state.data.activeItems = { shield: 0, grow: 0 };
  state.data.activeItems[id] = (state.data.activeItems[id] || 0) + 1;

  profile.write(state.data);
  refresh();

  toast('购买成功 · 已有 ' + state.data.activeItems[id]);
  return true;
}

function doActiveUpgrade(id) {
  const row = findRow('active-upgrade', id);
  if (!row) return false;

  if (row.maxed) {
    toast('时长已经满级');
    return false;
  }

  if (!spend(row.cost)) return false;

  if (!state.data.activeUpgrades) state.data.activeUpgrades = { shield: 0, grow: 0 };
  state.data.activeUpgrades[id] = (state.data.activeUpgrades[id] || 0) + 1;

  profile.write(state.data);
  refresh();

  toast('时长提升 · Lv.' + state.data.activeUpgrades[id]);
  return true;
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
    audio.play('ui');
    scenes.switchTo('menu');
    return;
  }

  if (b.kind === 'tab') {
    if (state.tab === b.id) return;

    audio.play('ui');
    state.tab = b.id;
    state.scroll = 0;
    refresh();
    return;
  }

  let ok = false;

  if (b.kind === 'upgrade') ok = doUpgrade(b.id, false);
  else if (b.kind === 'clone-upgrade') ok = doUpgrade(b.id, true);
  else if (b.kind === 'perm-clone') ok = doBuyPermClone();
  else if (b.kind === 'active-buy') ok = doActiveBuy(b.id);
  else if (b.kind === 'active-upgrade') ok = doActiveUpgrade(b.id);
  else if (b.kind === 'item') ok = doBuy(b.id);

  audio.play(ok ? 'upgrade' : 'ui');
}

function enter() {
  resetDown();
  state.scroll = 0;
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
  const raw = e.touches && e.touches[0];
  if (!raw) return;

  const p = ui.point(raw);

  // 滑块优先：按到滑块就不进入滚动逻辑
  const sliderRow = buttons.hitSlider(state.built, p.x, p.y);

  state.downId = p.id;
  state.downX = p.x;
  state.downY = p.y;
  state.downScroll = state.scroll;
  state.moved = false;

  if (sliderRow) {
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
  state.downBtn = buttons.hit(state.built, p.x, p.y);
}

function touchMove(e) {
  if (state.downId < 0) return;

  const list = e.touches || [];
  let raw = null;

  for (let i = 0; i < list.length; i++) {
    if (list[i].id === state.downId) { raw = list[i]; break; }
  }

  if (!raw) return;

  const p = ui.point(raw);

  if (state.drag) {
    applyDrag(p.y);
    return;
  }

  const dx = p.x - state.downX;
  const dy = p.y - state.downY;

  if (!state.moved && dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) state.moved = true;
  if (!state.moved) return;

  const max = state.built ? state.built.scrollMax : 0;
  if (max > 0) setScroll(state.downScroll - dy);
}

function touchEnd(e) {
  if (state.downId < 0) return;

  const changed = e.changed || [];
  let raw = null;

  for (let i = 0; i < changed.length; i++) {
    if (changed[i].id === state.downId) { raw = changed[i]; break; }
  }

  const p = raw ? ui.point(raw) : { x: state.downX, y: state.downY };

  // 拖动滑块结束：落盘并重建
  if (state.drag) {
    if (raw) applyDrag(p.y);
    resetDown();
    profile.write(state.data);
    refresh();
    return;
  }

  const down = state.downBtn;
  const moved = state.moved;

  resetDown();

  if (!down || moved) return;

  const up = buttons.hit(state.built, p.x, p.y);
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
