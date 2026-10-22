#!/usr/bin/env node
/**
 * 微信小游戏 —— Termux / proot 预览与上传脚本
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
    } else {
      console.log('当前还在编译阶段。如果长期不动，可先 Ctrl+C。');
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
const DESC = process.env.WX_DESC || 'CI 自动预览二维码';
const ROBOT = Number(process.env.WX_ROBOT || 1);

/* ================= 检查项 ================= */
console.log('项目目录：' + projectPath);
console.log('appid   ：' + APPID);
console.log('私钥    ：' + privateKeyPath);

['game.js', 'game.json', 'project.config.json'].forEach(function (f) {
  if (!fs.existsSync(path.join(projectPath, f))) {
    console.error('[错误] 缺少小游戏必需文件：' + f);
    process.exit(1);
  }
});

if (!fs.existsSync(privateKeyPath)) {
  console.error('[错误] 找不到上传密钥文件：' + privateKeyPath);
  process.exit(1);
}

/* ================= 构建项目对象 ================= */
const project = new ci.Project({
  appid: APPID,
  type: 'miniGame',
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

/* ================= 执行预览（生成终端二维码） ================= */
async function preview() {
  console.log('正在生成预览二维码...');
  tick('开始预览');
  
  const result = await ci.preview({
    project: project,
    version: VERSION,
    desc: DESC,
    robot: ROBOT,
    // 关键参数：指定在终端以 ASCII 字符画形式输出二维码
    qrcodeFormat: 'terminal',
    qrcodeOutputDest: path.join(projectPath, 'qrcode.terminal'),
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
      if (/compile|done/i.test(text)) uploadingStarted = true;
      tick(text);
    },
  });

  console.log('预览任务完成！');
  console.log(result);
}

preview().catch(function (error) {
  console.error('===== 预览失败 =====');
  console.error('message: ' + (error && error.message));
  console.error('code   : ' + (error && error.code));
  console.error('stack  : ' + (error && error.stack));
  printHints();
  process.exitCode = 1;
});