// 存档：读写本地文件。
// 新游戏的存档算法只需要改这个文件，外部模块只关心「对象」。

const FILE_NAME = 'save.json';
const USER_DATA = (wx.env && wx.env.USER_DATA_PATH) || '';

let fs = null;
try { fs = wx.getFileSystemManager(); } catch (e) { fs = null; }

function ready() {
  return !!fs && !!USER_DATA;
}

function filePath() {
  return USER_DATA + '/' + FILE_NAME;
}

// 是否存在存档
function has() {
  if (!ready()) return false;
  try {
    fs.accessSync(filePath());
    return true;
  } catch (e) {
    return false;
  }
}

// 读取存档，失败返回 null
function read() {
  if (!ready()) return null;
  let raw = null;
  try {
    raw = fs.readFileSync(filePath(), 'utf8');
  } catch (e) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// 写入存档（整体覆盖）
function write(data) {
  if (!ready() || !data) return false;
  try {
    fs.writeFileSync(filePath(), JSON.stringify(data), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

// 删除存档
function clear() {
  if (!ready()) return false;
  try {
    fs.unlinkSync(filePath());
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  has: has,
  read: read,
  write: write,
  clear: clear,
  filePath: filePath,
};
