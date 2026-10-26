// 音频：背景音乐 + 音效，两者有独立开关（设置页可切换，存于 settings.json）。
//
// 资源放在 audio/ 下，扩展名按 EXT_ORDER 依次尝试（mp3 / m4a / wav / aac）：
//   audio/bgm            背景音乐（循环）
//   audio/shoot          玩家开火
//   audio/enemy-shoot    敌人开火
//   audio/hit            命中
//   audio/pickup         拾取道具
//   audio/coin           拾取金币
//   audio/hurt           受伤
//   audio/boss           Boss 登场
//   audio/ui             界面按钮点击（主菜单 / 商店 / 设置 / 游戏内菜单，共用这一个）
//   audio/upgrade        商店购买 / 升级成功
//   audio/item           游戏内使用主动道具（护盾 / 变大）
//   audio/levelup        角色吃经验升级
//
// 【重要】InnerAudioContext 设置 src 之后是「异步加载」的，加载完成前调用 play()
// 会被无声丢弃（不报错）。所以这里每个实例都跟踪 ready 状态：未就绪时把播放
// 请求挂起，等 onCanplay 再补播；另有一个兜底定时器，防止个别基础库不回调
// onCanplay 导致永远没声音。
//
// 资源缺失时静默降级；缺失只进入短暂冷却，补放文件后无需重启小游戏。

const settings = require('./settings.js');

const EXT_ORDER = ['mp3', 'm4a', 'wav', 'aac'];

const BASE = {
  bgm: 'audio/bgm',
  shoot: 'audio/shoot',
  enemyShoot: 'audio/enemy-shoot',
  hit: 'audio/hit',
  pickup: 'audio/pickup',
  coin: 'audio/coin',
  hurt: 'audio/hurt',
  boss: 'audio/boss',
  ui: 'audio/ui',
  upgrade: 'audio/upgrade',
  item: 'audio/item',
  levelup: 'audio/levelup',
};

// 兼容历史写法：play('enemy-shoot') 与 play('enemyShoot') 指向同一个池
const ALIAS = {
  'enemy-shoot': 'enemyShoot',
  'enemy_shoot': 'enemyShoot',
  'level-up': 'levelup',
  'level_up': 'levelup',
};

function keyOf(name) {
  return ALIAS[name] || name;
}

const BGM_VOLUME = 0.30;
const SFX_VOLUME = 0.60;

const MIN_GAP = {
  shoot: 60,
  enemyShoot: 110,
  hit: 45,
  pickup: 70,
  coin: 70,
  hurt: 180,
  boss: 500,
  ui: 45,
  upgrade: 80,
  item: 80,
  levelup: 150,
};

// 每个音效的实例数量（2 个足够覆盖连击，又不浪费实例）
const POOL_SIZE = 2;

// InnerAudioContext 实例总量上限：超出时淘汰「最久没播」的音效池。
const MAX_LIVE_INSTANCES = 12;

// 文件缺失后的重试冷却（毫秒）
const RETRY_COOLDOWN_MS = 2500;

// 等不到 onCanplay 时的兜底播放延迟（毫秒）
const READY_WAIT_MS = 260;

let supported = false;
try {
  supported = typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
} catch (e) {
  supported = false;
}

const st = {
  musicOn: true,
  sfxOn: true,
  bgm: null,        // 声音实例（不是原生 context）
  bgmSrc: '',
  bgmWanted: false,
  pools: {},
  poolIdx: {},
  poolSrc: {},
  extIdx: {},
  retryAt: {},
  lastAt: {},
};

// 启动时读取开关
(function init() {
  const s = settings.read();
  st.musicOn = s.musicOn !== false;
  st.sfxOn = s.sfxOn !== false;
})();

function extOf(name) {
  const i = st.extIdx[name] || 0;
  return i < EXT_ORDER.length ? EXT_ORDER[i] : null;
}

function srcOf(name) {
  if (!BASE[name]) return null;
  const ext = extOf(name);
  if (!ext) return null;
  return BASE[name] + '.' + ext;
}

function coolingDown(name, now) {
  const t = st.retryAt[name] || 0;
  return !!t && now < t;
}

// ---------------- 原生 context ----------------
function createRaw(src, loop, volume) {
  if (!supported || !src) return null;

  let a = null;
  try { a = wx.createInnerAudioContext(); } catch (e) { return null; }
  if (!a) return null;

  try {
    a.src = src;
    a.loop = !!loop;
    a.volume = typeof volume === 'number' ? volume : SFX_VOLUME;
    a.autoplay = false;
  } catch (e) { /* 忽略 */ }

  return a;
}

function destroyRaw(a) {
  if (!a) return;
  try { a.stop(); } catch (e) { /* 忽略 */ }
  try { a.destroy(); } catch (e) { /* 忽略 */ }
}

// ---------------- 声音实例（包装 ready / 挂起播放） ----------------
function createVoice(name, src, loop, volume) {
  const raw = createRaw(src, loop, volume);
  if (!raw) return null;

  const v = {
    name: name,
    src: src,
    raw: raw,
    ready: false,
    pending: false,
    playing: false,
    started: false,
    timer: 0,
  };

  // 每个回调单独 try：某个基础库缺方法时不影响其他回调注册
  try {
    if (typeof raw.onCanplay === 'function') {
      raw.onCanplay(function () {
        v.ready = true;
        flushVoice(v);
      });
    }
  } catch (e) { /* 忽略 */ }

  try {
    if (typeof raw.onPlay === 'function') {
      raw.onPlay(function () {
        v.ready = true;
        v.started = true;
        v.playing = true;
      });
    }
  } catch (e) { /* 忽略 */ }

  try {
    if (typeof raw.onPause === 'function') raw.onPause(function () { v.playing = false; });
  } catch (e) { /* 忽略 */ }

  try {
    if (typeof raw.onStop === 'function') raw.onStop(function () { v.playing = false; });
  } catch (e) { /* 忽略 */ }

  try {
    if (typeof raw.onEnded === 'function') raw.onEnded(function () { v.playing = false; });
  } catch (e) { /* 忽略 */ }

  try {
    if (typeof raw.onError === 'function') {
      raw.onError(function () { onMediaError(name, src); });
    }
  } catch (e) { /* 忽略 */ }

  return v;
}

function destroyVoice(v) {
  if (!v) return;

  if (v.timer) {
    clearTimeout(v.timer);
    v.timer = 0;
  }

  v.pending = false;
  v.ready = false;
  v.playing = false;

  destroyRaw(v.raw);
  v.raw = null;
}

function doPlay(v) {
  if (!v || !v.raw) return;

  try {
    // 只对「已经在响」的实例先停，避免复用时从头叠加。
    // 对从未播放过的实例不要调 stop()：iOS 上会吃掉紧接着的 play()。
    if (v.playing) {
      try { v.raw.stop(); } catch (e) { /* 忽略 */ }
    }

    v.raw.play();
    v.started = true;
  } catch (e) {
    onMediaError(v.name, v.src);
  }
}

// 挂起的播放请求，等加载完成后补播
function flushVoice(v) {
  if (!v) return;

  if (v.timer) {
    clearTimeout(v.timer);
    v.timer = 0;
  }

  if (!v.pending) return;

  v.pending = false;
  doPlay(v);
}

function requestPlay(v) {
  if (!v || !v.raw) return;

  if (v.ready) {
    doPlay(v);
    return;
  }

  // 还没加载完：挂起，等 onCanplay 补播
  v.pending = true;

  // 兜底：个别基础库不回调 onCanplay 时，等一小会儿直接播
  if (v.timer) clearTimeout(v.timer);
  v.timer = setTimeout(function () {
    v.timer = 0;
    if (!v.pending) return;
    v.pending = false;
    doPlay(v);
  }, READY_WAIT_MS);
}

// ---------------- 池管理 ----------------
function destroyPool(name) {
  const pool = st.pools[name];
  if (!pool) return;

  for (let i = 0; i < pool.length; i++) destroyVoice(pool[i]);

  st.pools[name] = null;
  st.poolIdx[name] = 0;
  st.poolSrc[name] = '';
}

function destroyBgm() {
  destroyVoice(st.bgm);
  st.bgm = null;
  st.bgmSrc = '';
}

function liveCount() {
  let n = st.bgm ? 1 : 0;
  const keys = Object.keys(st.pools);

  for (let i = 0; i < keys.length; i++) {
    const p = st.pools[keys[i]];
    if (p && p.length) n += p.length;
  }

  return n;
}

// 实例超预算时，淘汰最久没播过的音效池
function evictFor(exceptName, need) {
  let guard = 0;

  while (liveCount() + need > MAX_LIVE_INSTANCES && guard < 32) {
    guard++;

    let victim = '';
    let oldest = Infinity;
    const keys = Object.keys(st.pools);

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const p = st.pools[k];
      if (k === exceptName || !p || !p.length) continue;

      const t = st.lastAt[k] || 0;
      if (t < oldest) {
        oldest = t;
        victim = k;
      }
    }

    if (!victim) break;
    destroyPool(victim);
  }
}

function onMediaError(name, src) {
  const cur = srcOf(name);
  if (cur && src && cur !== src) return;

  const next = (st.extIdx[name] || 0) + 1;

  if (next >= EXT_ORDER.length) {
    // 所有扩展名都试过了：说明文件当前确实不在包里。
    // 不要永久锁死 —— 重置下标 + 冷却，冷却结束后下次播放会重新尝试。
    st.extIdx[name] = 0;
    st.retryAt[name] = Date.now() + RETRY_COOLDOWN_MS;
  } else {
    st.extIdx[name] = next;
  }

  if (name === 'bgm') {
    destroyBgm();
    if (st.bgmWanted && st.musicOn && extOf('bgm') && !coolingDown('bgm', Date.now())) playBgm();
    return;
  }

  destroyPool(name);
}

// ---------------- 背景音乐 ----------------
function ensureBgm() {
  const src = srcOf('bgm');
  if (!supported || !src) return null;
  if (st.bgm && st.bgmSrc === src) return st.bgm;

  if (st.bgm) destroyBgm();

  const v = createVoice('bgm', src, true, BGM_VOLUME);
  if (!v) return null;

  st.bgm = v;
  st.bgmSrc = src;

  return v;
}

function playBgm() {
  if (!supported) return;

  st.bgmWanted = true;
  if (!st.musicOn) return;
  if (coolingDown('bgm', Date.now())) return;

  const v = ensureBgm();
  if (!v || v.playing) return;

  requestPlay(v);
}

function pauseBgm() {
  const v = st.bgm;
  if (!v || !v.raw) return;

  if (v.timer) {
    clearTimeout(v.timer);
    v.timer = 0;
  }
  v.pending = false;

  try { v.raw.pause(); } catch (e) { /* 忽略 */ }
  v.playing = false;
}

function stopBgm() {
  st.bgmWanted = false;

  const v = st.bgm;
  if (!v || !v.raw) return;

  if (v.timer) {
    clearTimeout(v.timer);
    v.timer = 0;
  }
  v.pending = false;

  try { v.raw.stop(); } catch (e) { /* 忽略 */ }
  v.playing = false;
}

// ---------------- 音效 ----------------
function ensurePool(name) {
  const src = srcOf(name);
  if (!supported || !src) return null;
  if (st.pools[name] && st.poolSrc[name] === src) return st.pools[name];

  if (st.pools[name]) destroyPool(name);

  evictFor(name, POOL_SIZE);

  const list = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const v = createVoice(name, src, false, SFX_VOLUME);
    if (!v) continue;
    list.push(v);
  }

  if (!list.length) return null;

  st.pools[name] = list;
  st.poolSrc[name] = src;
  st.poolIdx[name] = 0;

  return list;
}

function play(name) {
  if (!supported || !st.sfxOn || !name) return;

  name = keyOf(name);
  if (!BASE[name] || name === 'bgm') return;

  const now = Date.now();

  // 刚失败过（文件缺失）：冷却期内不再反复创建实例
  if (coolingDown(name, now)) return;

  const gap = typeof MIN_GAP[name] === 'number' ? MIN_GAP[name] : 60;

  if (now - (st.lastAt[name] || 0) < gap) return;
  st.lastAt[name] = now;

  const pool = ensurePool(name);
  if (!pool || !pool.length) return;

  const idx = st.poolIdx[name] || 0;
  st.poolIdx[name] = (idx + 1) % pool.length;

  requestPlay(pool[idx]);
}

// ---------------- 开关 ----------------
function saveSettings() {
  settings.write({ musicOn: st.musicOn, sfxOn: st.sfxOn });
}

function setMusicOn(v) {
  st.musicOn = !!v;
  saveSettings();

  if (!st.musicOn) {
    pauseBgm();
    return;
  }

  if (st.bgmWanted) playBgm();
}

function setSfxOn(v) {
  st.sfxOn = !!v;
  saveSettings();
}

function isMusicOn() {
  return st.musicOn;
}

function isSfxOn() {
  return st.sfxOn;
}

// 兼容旧接口（整体静音）
function setMuted(v) {
  setMusicOn(!v);
  setSfxOn(!v);
}

function isMuted() {
  return !st.musicOn && !st.sfxOn;
}

function toggleMute() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

module.exports = {
  play: play,
  playBgm: playBgm,
  pauseBgm: pauseBgm,
  stopBgm: stopBgm,
  setMusicOn: setMusicOn,
  setSfxOn: setSfxOn,
  isMusicOn: isMusicOn,
  isSfxOn: isSfxOn,
  setMuted: setMuted,
  isMuted: isMuted,
  toggleMute: toggleMute,
};
