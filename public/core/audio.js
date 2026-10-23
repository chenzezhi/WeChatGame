// 音频：背景音乐 + 音效。
//
// 资源放在项目根目录的 audio/ 下（mp3 / m4a / wav 都行，按需改名）：
//   audio/bgm.mp3          背景音乐（循环）
//   audio/shoot.mp3        玩家开火
//   audio/enemy-shoot.mp3  敌人开火
//   audio/hit.mp3          子弹命中敌人
//   audio/pickup.mp3       拾取道具
//   audio/coin.mp3         拾取金币
//   audio/hurt.mp3         玩家受伤
//   audio/boss.mp3         Boss 登场
//
// 资源缺失时静默降级：只标记缺失，不抛异常，不影响游戏运行。

const FILES = {
  bgm: 'audio/bgm.mp3',
  shoot: 'audio/shoot.mp3',
  enemyShoot: 'audio/enemy-shoot.mp3',
  hit: 'audio/hit.mp3',
  pickup: 'audio/pickup.mp3',
  coin: 'audio/coin.mp3',
  hurt: 'audio/hurt.mp3',
  boss: 'audio/boss.mp3',
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
  bgmPlaying: false,
  bgmWanted: false,
  pools: {},
  poolIdx: {},
  missing: {},
  lastAt: {},
};

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

function ensureBgm() {
  if (st.bgm) return st.bgm;
  if (!supported || st.missing.bgm) return null;

  const a = createAudio(FILES.bgm, true, BGM_VOLUME);
  if (!a) return null;

  try {
    a.onPlay(function () { st.bgmPlaying = true; });
    a.onPause(function () { st.bgmPlaying = false; });
    a.onStop(function () { st.bgmPlaying = false; });
    a.onEnded(function () { st.bgmPlaying = false; });
    a.onError(function () {
      st.bgmPlaying = false;
      st.missing.bgm = true;
    });
  } catch (e) { /* 忽略 */ }

  st.bgm = a;
  return a;
}

function ensurePool(name) {
  if (st.pools[name]) return st.pools[name];
  if (!supported || st.missing[name] || !FILES[name]) return null;

  const list = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const a = createAudio(FILES[name], false, SFX_VOLUME);
    if (!a) continue;

    try {
      a.onError(function () { st.missing[name] = true; });
    } catch (e) { /* 忽略 */ }

    list.push(a);
  }

  if (!list.length) return null;

  st.pools[name] = list;
  st.poolIdx[name] = 0;

  return list;
}

// 背景音乐：重复调用安全（已在播放就不动）
function playBgm() {
  if (!supported) return;

  st.bgmWanted = true;
  if (st.muted) return;

  const a = ensureBgm();
  if (!a || st.bgmPlaying) return;

  try { a.play(); } catch (e) { /* 忽略 */ }
}

function pauseBgm() {
  const a = st.bgm;
  if (!a) return;

  try { a.pause(); } catch (e) { /* 忽略 */ }
  st.bgmPlaying = false;
}

// 播放一个音效：name 取 FILES 的键
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
  try { a.play(); } catch (e) { /* 忽略 */ }
}

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
  setMuted: setMuted,
  toggleMute: toggleMute,
  isMuted: isMuted,
};
