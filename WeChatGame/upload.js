#!/usr/bin/env node
/**
 * 微信小游戏 —— Termux / proot 上传脚本
 *
 * 用法： node upload.js
 *
 * 可用环境变量：
 *   WX_APPID         覆盖 appid
 *   WX_PROJECT_PATH  覆盖项目目录（默认脚本所在目录）
 *   WX_KEY_PATH      覆盖私钥路径
 *   WX_VERSION       覆盖版本号（默认 1.0.0）
 *   WX_DESC          覆盖描述
 *   WX_ROBOT         覆盖机器人编号 1-30（默认 1）
 *   WX_TIMEOUT       看门狗阈值（秒，默认 30），超过则打印等待提示
 */
'use strict';

// 关键：必须在 require miniprogram-ci 之前修好 execPath，
// 否则 miniprogram-ci 内部 child_process.fork 会报 bad ELF magic / write EPIPE
const nodeFix = require('./node-android-fix');

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/* ================= 看门狗：超过阈值无进度就提示 ================= */
const TIMEOUT = Number(process.env.WX_TIMEOUT || 30) * 1000;
let lastTick = Date.now();
let lastStage = '启动';
let uploadingStarted = false;

const watchdog = setInterval(function () {
  const waited = Math.round((Date.now() - lastTick) / 1000);
  if (waited * 1000 >= TIMEOUT) {
    console.log('');
    console.log('============================================================');
    console.log('已等待 ' + waited + ' 秒没有新进度，当前阶段：' + lastStage);
    if (uploadingStarted) {
      console.log('看起来是「编译完成后连接微信服务器」卡住了，多半是网络问题。');
      console.log('排查：');
      console.log('  1. 另开一个 Termux 窗口执行： bash nettest.sh');
      console.log('  2. 关掉代理： unset http_proxy https_proxy all_proxy HTTP_PROXY HTTPS_PROXY');
      console.log('  3. 换网络（Wi-Fi / 移动数据）后重新 node upload.js');
    } else {
      console.log('当前还在编译阶段。如果长期不动，可先 Ctrl+C，再执行： bash nettest.sh');
    }
    console.log('============================================================');
  }
}, 5000);
if (watchdog.unref) watchdog.unref();

function tick(stage) {
  lastTick = Date.now();
  if (stage) lastStage = stage;
}

/* ================= 友好错误提示 ================= */
function printHints() {
  console.error('');
  console.error('---- 常见原因与处理 ----');
  console.error('· 报错含 bad ELF magic / write EPIPE：');
  console.error('  Termux/Android 上 Node 的 execPath 被误报成 linker64，node-android-fix.js 会修正。');
  console.error('  验证： node forktest.js');
  console.error('· 编译完成后卡住不动：多半是连不上微信服务器，或还在 /storage 上跑。');
  console.error('  用 bash upload.sh（会复制到 $HOME 真实文件系统）。');
  console.error('· 上传成功但「版本管理」看不到：检查 appid 与 private.<appid>.key 是否对应。');
  console.error('· 想换 glibc 环境： bash upload-proot.sh');
  console.error('· 完整环境诊断： bash diagnose.sh');
}

process.on('uncaughtException', (e) => {
  console.error('\n未捕获异常：' + (e && e.message ? e.message : e));
  if (e && e.stack) console.error(e.stack);
  printHints();
  process.exit(1);
});

process.on('unhandledRejection', (e) => {
  console.error('\n未处理的 Promise 拒绝：' + (e && e.message ? e.message : e));
  if (e && e.stack) console.error(e.stack);
  printHints();
  process.exit(1);
});

/* ================= 加载 miniprogram-ci ================= */
function loadCI() {
  const candidates = [];
  try {
    const globalRoot = execSync('npm root -g', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (globalRoot) candidates.push(path.join(globalRoot, 'miniprogram-ci'));
  } catch (e) { /* 忽略 */ }

  candidates.push('/data/data/com.termux/files/usr/lib/node_modules/miniprogram-ci');
  candidates.push('miniprogram-ci');

  let lastErr = null;
  for (let i = 0; i < candidates.length; i++) {
    try {
      const mod = require(candidates[i]);
      console.log('[ok] 已加载 miniprogram-ci：' + candidates[i]);
      return mod;
    } catch (e) {
      lastErr = e;
    }
  }
  console.error('无法加载 miniprogram-ci，请先安装：npm i -g miniprogram-ci');
  throw lastErr;
}

const ci = loadCI();

/* ================= 基本配置 ================= */
const projectPath = process.env.WX_PROJECT_PATH || __dirname;

// 以 project.config.json 的 appid 为准（原来硬编码导致可能传到别的账号）
function readConfigAppid(dir) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'project.config.json'), 'utf8'));
    return (cfg && cfg.appid) || '';
  } catch (e) {
    return '';
  }
}
const CONFIG_APPID = readConfigAppid(projectPath);
const APPID = process.env.WX_APPID || CONFIG_APPID || 'wx03f8c7b1fb104183';
const privateKeyPath =
  process.env.WX_KEY_PATH || path.join(projectPath, 'private.' + APPID + '.key');
const VERSION = process.env.WX_VERSION || '1.0.0';
const DESC = process.env.WX_DESC || 'Termux 自动上传';
const ROBOT = Number(process.env.WX_ROBOT || 1);

/* ================= 上传前检查 ================= */
console.log('项目目录：' + projectPath);
console.log('appid   ：' + APPID + (CONFIG_APPID && APPID === CONFIG_APPID ? '（来自 project.config.json）' : ''));
console.log('私钥    ：' + privateKeyPath);
console.log('node    ：' + (nodeFix.realNode || process.execPath) + (nodeFix.applied ? ' （已锁定真实二进制）' : ''));
console.log('execPath：' + process.execPath);

if (CONFIG_APPID && process.env.WX_APPID && CONFIG_APPID !== process.env.WX_APPID) {
  console.error('[警告] WX_APPID(' + process.env.WX_APPID + ') 与 project.config.json(' + CONFIG_APPID + ') 不一致，本次以 WX_APPID 为准。');
}

['game.js', 'game.json', 'project.config.json'].forEach(function (f) {
  if (!fs.existsSync(path.join(projectPath, f))) {
    console.error('[错误] 缺少小游戏必需文件：' + f);
    process.exit(1);
  }
});

if (!fs.existsSync(privateKeyPath)) {
  console.error('[错误] 找不到上传密钥文件：' + privateKeyPath);
  console.error('       到「微信公众平台 → 开发 → 开发设置 → 小程序代码上传」下载密钥，');
  console.error('       确认文件名后放到项目根目录，命名必须为 private.' + APPID + '.key');
  process.exit(1);
}

/* ================= 构建项目对象 ================= */
const project = new ci.Project({
  appid: APPID,
  type: 'miniGame', // 小游戏必须写 miniGame
  projectPath: projectPath,
  privateKeyPath: privateKeyPath,
  ignores: [
    'node_modules/**/*',
    '*.key',
    'backup/**/*',
    '.git/**/*',
    'upload.js',
    'upload.sh',
    'upload-auto.sh',
    'upload-proot.sh',
    'README.md',
    'README-Termux.md',
    'forktest.js',
    'forkchild.js',
    'node-android-fix.js',
  ],
});

/* ================= 执行上传 ================= */
async function upload() {
  console.log('正在从 Termux 上传代码到微信服务器...');
  tick('开始');
  const result = await ci.upload({
    project: project,
    version: VERSION,
    desc: DESC,
    robot: ROBOT,
    setting: {
      es6: false,
      es7: false,
      minify: false,
      minifyJS: false,
      minifyWXML: false,
      minifyWXSS: false,
      autoPrefixWXSS: false,
    },
    onProgressUpdate: function (info) {
      const t = new Date().toLocaleTimeString();
      const text = typeof info === 'string' ? info : JSON.stringify(info);
      console.log('[' + t + '] ' + text);
      // 编译完成后进入上传阶段
      if (/compile|done/i.test(text)) uploadingStarted = true;
      tick(text);
    },
  });
  console.log('上传成功！' + (result ? ' ' + JSON.stringify(result) : ''));
  console.log('本次 appid = ' + APPID + '，请用该 appid 的小游戏账号登录 mp.weixin.qq.com → 管理 → 版本管理 → 开发版本 查看。');
}

upload().catch(function (error) {
  console.error('===== 上传失败 =====');
  console.error('message: ' + (error && error.message));
  console.error('code   : ' + (error && error.code));
  console.error('stack  : ' + (error && error.stack));
  printHints();
  process.exitCode = 1;
});
