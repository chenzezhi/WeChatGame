#!/usr/bin/env node
/**
 * 微信小游戏 —— 预览二维码生成脚本
 * 每次都用时间戳作为预览版本号，避免微信端命中旧包缓存。
 */
'use strict';

const nodeFix = require('./node-android-fix');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/* ================= 错误处理与加载 ================= */
process.on('uncaughtException', (e) => {
  console.error('\n未捕获异常：' + (e && e.message ? e.message : e));
  process.exit(1);
});

process.on('unhandledRejection', (e) => {
  console.error('\n未处理的 Promise 拒绝：' + (e && e.message ? e.message : e));
  process.exit(1);
});

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

  for (let i = 0; i < candidates.length; i++) {
    try {
      return require(candidates[i]);
    } catch (e) {}
  }
  throw new Error('无法加载 miniprogram-ci');
}

const ci = loadCI();
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
const privateKeyPath = process.env.WX_KEY_PATH || path.join(projectPath, 'private.' + APPID + '.key');

// 关键：版本号每次都不同，避免预览包被微信缓存复用
const BUILD_VERSION = process.env.WX_VERSION && /^[0-9.]+$/.test(process.env.WX_VERSION)
  ? process.env.WX_VERSION
  : '1.0.' + String(Date.now()).slice(-9);
const BUILD_DESC = process.env.WX_DESC || ('CI 自动预览 ' + new Date().toISOString());

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

async function preview() {
  console.log('项目目录 : ' + projectPath);
  console.log('AppID    : ' + APPID);
  console.log('版本号   : ' + BUILD_VERSION);
  console.log('描述     : ' + BUILD_DESC);
  console.log('正在生成预览二维码...');

  const result = await ci.preview({
    project: project,
    version: BUILD_VERSION,
    desc: BUILD_DESC,
    robot: 1,
    qrcodeFormat: 'image',
    qrcodeOutputDest: path.join(projectPath, 'qrcode.jpg'),
    setting: {
      es6: false,
      es7: false,
      minify: false,
    },
    onProgressUpdate: function (info) {
      console.log(typeof info === 'string' ? info : JSON.stringify(info));
    },
  });

  console.log('预览二维码生成成功！');
  console.log('提示：扫二维码前，先在微信里把旧的小游戏进程彻底关闭（上滑删除/清除缓存）。');
  return result;
}

preview().catch(function (error) {
  console.error('===== 预览失败 =====');
  console.error('message: ' + (error && error.message));
  console.error('code   : ' + (error && error.code));
  process.exitCode = 1;
});
