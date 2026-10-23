// 游戏设置（音乐 / 音效开关）：与玩家资产分开存，重置游戏数据不会清掉它。

const FILE_NAME = 'settings.json';
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
  return { musicOn: true, sfxOn: true };
}

function normalize(src) {
  const out = defaults();
  if (!src || typeof src !== 'object') return out;

  out.musicOn = src.musicOn !== false;
  out.sfxOn = src.sfxOn !== false;

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

module.exports = {
  read: read,
  write: write,
  defaults: defaults,
};
