#!/usr/bin/env node
/**
 * Termux / Android 上的 Node 兼容补丁（强化版）
 *
 * 解决两类 Android 特有的「卡死/报错」：
 *
 *  A. 进程层：process.execPath 被报告成 /apex/.../linker64
 *     → child_process.fork() 实际执行 `linker64 xxx.js`
 *     → 报 bad ELF magic / write EPIPE，子进程秒退，父进程卡在写管道。
 *     修法：锁定真实 node 二进制，并同时拦截 fork/spawn/spawnSync/execFile。
 *
 *  B. 管道层：父进程 stdout 是管道而子进程已退出时，写入触发 EPIPE，
 *     未被捕获会让整个上传进程异常退出。
 *     修法：给 process.stdout / stderr 挂空的 error 处理。
 *
 * 本文件被 require 时自动生效（upload.js 第一行就 require 它）。
 * 可用 WX_NODE_BIN=/path/to/node 手动指定真实 node。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

/* ============ B. EPIPE 防护（必须在任何输出前生效） ============ */
['stdout', 'stderr'].forEach(function (name) {
  try {
    const s = process[name];
    if (s && typeof s.on === 'function') {
      s.on('error', function () { /* 忽略 EPIPE / EIO，避免未捕获异常 */ });
    }
  } catch (e) { /* 忽略 */ }
});

/* ============ A. 找到真正的 node 可执行文件 ============ */
function isExecutable(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function looksLikeLinker(p) {
  return /linker/.test(String(p || ''));
}

function findRealNode() {
  const cands = [];

  // 0) 用户显式指定最优先
  if (process.env.WX_NODE_BIN) cands.push(process.env.WX_NODE_BIN);

  // 1) Termux 前缀
  if (process.env.PREFIX) cands.push(path.join(process.env.PREFIX, 'bin', 'node'));
  cands.push('/data/data/com.termux/files/usr/bin/node');

  // 2) 从 PATH 里找
  const PATH = process.env.PATH || '';
  PATH.split(':').forEach(function (d) {
    if (d) cands.push(path.join(d, 'node'));
  });

  // 3) 常见位置（proot / Linux）
  cands.push('/usr/local/bin/node', '/usr/bin/node', '/opt/homebrew/bin/node');

  for (let i = 0; i < cands.length; i++) {
    const p = cands[i];
    if (!p) continue;
    try {
      if (!fs.existsSync(p) || !isExecutable(p)) continue;
      const real = fs.realpathSync(p);
      if (looksLikeLinker(real)) continue;
      return real;
    } catch (e) { /* 继续找 */ }
  }
  return null;
}

const origExecPath = process.execPath;
const realNode = findRealNode();
const badExecPath = looksLikeLinker(origExecPath);

let applied = false;

if (realNode && realNode !== origExecPath) {
  try {
    process.execPath = realNode;
  } catch (e) { /* 某些版本 execPath 只读 */ }
  applied = true;
  if (badExecPath) {
    console.error('[node-android-fix] process.execPath 异常（linker64），已修正为：' + realNode);
  }
}

/* ============ 判断某个待执行路径是否其实是「坏 node」 ============ */
function shouldReplaceAsNode(file) {
  if (typeof file !== 'string' || !file) return false;
  if (!realNode) return false;
  if (looksLikeLinker(file)) return true;
  try {
    if (looksLikeLinker(fs.realpathSync(file))) return true;
  } catch (e) { /* 文件不存在等，忽略 */ }
  return file === origExecPath && badExecPath;
}

/* ============ 打补丁：所有子进程 API 都指向真实 node ============ */
if (realNode) {
  const origFork = cp.fork;
  cp.fork = function patchedFork(modulePath, args, options) {
    if (args && !Array.isArray(args)) { options = args; args = []; }
    args = args || [];
    options = options || {};
    if (!options.execPath) options.execPath = realNode;
    if (!options.env) options.env = process.env;
    return origFork.call(cp, modulePath, args, options);
  };

  const origSpawn = cp.spawn;
  cp.spawn = function patchedSpawn(file, args, options) {
    if (shouldReplaceAsNode(file)) file = realNode;
    return origSpawn.call(cp, file, args, options);
  };

  const origSpawnSync = cp.spawnSync;
  cp.spawnSync = function patchedSpawnSync(file, args, options) {
    if (shouldReplaceAsNode(file)) file = realNode;
    return origSpawnSync.call(cp, file, args, options);
  };

  const origExecFile = cp.execFile;
  cp.execFile = function patchedExecFile(file, args, options, cb) {
    if (shouldReplaceAsNode(file)) file = realNode;
    return origExecFile.call(cp, file, args, options, cb);
  };

  const origExecFileSync = cp.execFileSync;
  cp.execFileSync = function patchedExecFileSync(file, args, options) {
    if (shouldReplaceAsNode(file)) file = realNode;
    return origExecFileSync.call(cp, file, args, options);
  };
}

module.exports = {
  applied: applied,
  realNode: realNode,
  platform: process.platform,
};
