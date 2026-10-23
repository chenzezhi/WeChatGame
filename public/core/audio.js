// 音频：背景音乐 + 音效。
//
// 资源放在项目根目录的 audio/ 下，**扩展名可任选其一**（按 EXT_ORDER 依次尝试）：
//   audio/bgm            背景音乐（循环）
//   audio/shoot          玩家开火
//   audio/enemy-shoot    敌人开火
//   audio/hit            子弹命中敌人
//   audio/pickup         拾取道具
//   audio/coin           拾取金币
//   audio/hurt           玩家受伤
//   audio/boss           Boss 登场
//
// 例如 bgm.mp3 / bgm.m4a / bgm.wav / bgm.aac 都行，代码会挑第一个能播的。
// 资源缺失时静默降级：只标记缺失，不抛异常，不影响游戏运行。

// 尝试顺序：微信小游戏常见支持 mp3 / m4a / aac / wav
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
};

const BGM_VOLUME = 0.30;
const SFX_VOLUME = 0.60;

// 每种音效的最小触发间隔（毫秒）：避免密集触发把声音糊成一片
const MIN_GAP = {
  shoot: 60,
  enemyShoot: 110,
  hit: 45,
  pickup: 70,
  coin: 70,
  hurt: 180,
  boss: 500,
};

const POOL_SIZE = 3; // 每种音效准备几个实例，便于快速重复触发

let supported = false;
try {
  supported = typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
} catch (e) {
  supported = false;
}

const st = {
  muted: false,
  bgm: null,
  bgmSrc: '',
  bgmPlaying: false,
  bgmWanted: false,
  pools: {},      // name -> [audio]
  poolIdx: {},    // name -> 下一个要用的下标
  poolSrc: {},    // name -> 当前池对应的 src
  extIdx: {},     // name -> EXT_ORDER 的下标（回退用）
  lastAt: {},     // name -> 上次播放时间
};

// ---------------- 扩展名回退 ----------------
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

// ---------------- 实例创建 / 销毁 ----------------
function createAudio(src, loop, volume) {
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

function destroyAudio(a) {
  if (!a) return;
  try { a.stop(); } catch (e) { /* 忽略 */ }
  try { a.destroy(); } catch (e) { /* 忽略 */ }
}

function destroyPool(name) {
  const pool = st.pools[name];
  if (!pool) return;

  for (let i = 0; i < pool.length; i++) destroyAudio(pool[i]);

  st.pools[name] = null;
  st.poolIdx[name] = 0;
  st.poolSrc[name] = '';
}

function destroyBgm() {
  destroyAudio(st.bgm);
  st.bgm = null;
  st.bgmSrc = '';
  st.bgmPlaying = false;
}

// 某个 src 播不了：换下一个扩展名再试
function onMediaError(name, src) {
  const cur = srcOf(name);
  if (cur && src && cur !== src) return; // 已经换过，忽略旧实例的迟到错误

  st.extIdx[name] = (st.extIdx[name] || 0) + 1;

  if (name === 'bgm') {
    destroyBgm();

    // 还想放并且还有备选格式，就再试一次
    if (st.bgmWanted && !st.muted && extOf('bgm')) playBgm();
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

  const a = createAudio(src, true, BGM_VOLUME);
  if (!a) return null;

  try {
    a.onPlay(function () { st.bgmPlaying = true; });
    a.onPause(function () { st.bgmPlaying = false; });
    a.onStop(function () { st.bgmPlaying = false; });
    a.onEnded(function () { st.bgmPlaying = false; });
    a.onError(function () { onMediaError('bgm', src); });
  } catch (e) { /* 忽略 */ }

  st.bgm = a;
  st.bgmSrc = src;

  return a;
}

// 背景音乐：重复调用安全（已在播放就不动）
function playBgm() {
  if (!supported) return;

  st.bgmWanted = true;
  if (st.muted) return;

  const a = ensureBgm();
  if (!a || st.bgmPlaying) return;

  try { a.play(); } catch (e) { onMediaError('bgm', st.bgmSrc); }
}

function pauseBgm() {
  const a = st.bgm;
  if (!a) return;

  try { a.pause(); } catch (e) { /* 忽略 */ }
  st.bgmPlaying = false;
}

function stopBgm() {
  st.bgmWanted = false;

  const a = st.bgm;
  if (!a) return;

  try { a.stop(); } catch (e) { /* 忽略 */ }
  st.bgmPlaying = false;
}

// ---------------- 音效 ----------------
function ensurePool(name) {
  const src = srcOf(name);
  if (!supported || !src) return null;
  if (st.pools[name] && st.poolSrc[name] === src) return st.pools[name];

  if (st.pools[name]) destroyPool(name);

  const list = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const a = createAudio(src, false, SFX_VOLUME);
    if (!a) continue;

    try {
      a.onError(function () { onMediaError(name, src); });
    } catch (e) { /* 忽略 */ }

    list.push(a);
  }

  if (!list.length) return null;

  st.pools[name] = list;
  st.poolSrc[name] = src;
  st.poolIdx[name] = 0;

  return list;
}

// 播放一个音效：name 取 BASE 的键
function play(name) {
  if (!supported || st.muted || !name) return;

  const gap = typeof MIN_GAP[name] === 'number' ? MIN_GAP[name] : 60;
  const now = Date.now();

  if (now - (st.lastAt[name] || 0) < gap) return;
  st.lastAt[name] = now;

  const pool = ensurePool(name);
  if (!pool || !pool.length) return;

  const idx = st.poolIdx[name] || 0;
  st.poolIdx[name] = (idx + 1) % pool.length;

  const a = pool[idx];
  if (!a) return;

  // 先 stop 再 play，保证能立刻重新触发
  try { a.stop(); } catch (e) { /* 忽略 */ }
  try { a.play(); } catch (e) { onMediaError(name, st.poolSrc[name]); }
}

// ---------------- 静音开关 ----------------
function setMuted(v) {
  st.muted = !!v;

  if (st.muted) {
    pauseBgm();
    return;
  }

  if (st.bgmWanted) playBgm();
}

function toggleMute() {
  setMuted(!st.muted);
  return st.muted;
}

function isMuted() {
  return st.muted;
}

module.exports = {
  play: play,
  playBgm: playBgm,
  pauseBgm: pauseBgm,
  stopBgm: stopBgm,
  setMuted: setMuted,
  toggleMute: toggleMute,
  isMuted: isMuted,
};
