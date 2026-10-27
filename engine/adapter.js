/**
 * 小游戏环境适配层（polyfill）
 *
 * 小游戏没有 DOM / BOM，而 Cocos Creator 等引擎依赖 window / document 等对象。
 * 这里只补齐「缺失的」部分，因此不会和 Cocos 自带 adapter 冲突。
 */
'use strict';

var installed = false;

function noop() {}

function install() {
  var g = (typeof GameGlobal !== 'undefined') ? GameGlobal
    : (typeof global !== 'undefined') ? global
    : this;

  if (installed) return g;
  installed = true;

  /* ---------------- window ---------------- */
  if (typeof g.window === 'undefined') g.window = g;
  var win = g.window;

  try {
    var info = wx.getSystemInfoSync();
    if (typeof win.innerWidth !== 'number') win.innerWidth = info.windowWidth || 375;
    if (typeof win.innerHeight !== 'number') win.innerHeight = info.windowHeight || 667;
    if (typeof win.devicePixelRatio !== 'number') win.devicePixelRatio = info.pixelRatio || 1;
    if (!win.screen) {
      win.screen = {
        width: info.windowWidth || 375,
        height: info.windowHeight || 667,
        availWidth: info.windowWidth || 375,
        availHeight: info.windowHeight || 667
      };
    }
  } catch (e) { /* 忽略 */ }

  /* ---------------- 定时器 / rAF ---------------- */
  if (typeof win.requestAnimationFrame !== 'function') {
    win.requestAnimationFrame = function (cb) {
      return setTimeout(function () { cb(Date.now()); }, 16);
    };
    win.cancelAnimationFrame = function (id) { clearTimeout(id); };
  }
  if (typeof g.requestAnimationFrame !== 'function') {
    g.requestAnimationFrame = win.requestAnimationFrame;
    g.cancelAnimationFrame = win.cancelAnimationFrame;
  }
  if (typeof g.performance === 'undefined') {
    g.performance = { now: function () { return Date.now(); } };
  }

  /* ---------------- document ---------------- */
  if (typeof g.document === 'undefined') {
    g.document = {
      readyState: 'complete',
      visibilityState: 'visible',
      hidden: false,
      documentElement: {
        style: {},
        clientWidth: win.innerWidth,
        clientHeight: win.innerHeight,
        addEventListener: noop,
        removeEventListener: noop,
        appendChild: noop
      },
      body: {
        style: {},
        addEventListener: noop,
        removeEventListener: noop,
        appendChild: noop
      },
      head: { appendChild: noop, addEventListener: noop },
      createElement: function (tag) {
        var name = String(tag || '').toLowerCase();
        if (name === 'canvas') return wx.createCanvas();
        return {
          style: {},
          width: 0,
          height: 0,
          addEventListener: noop,
          removeEventListener: noop,
          appendChild: noop,
          setAttribute: noop,
          getContext: function () { return null; }
        };
      },
      createElementNS: function (ns, tag) { return g.document.createElement(tag); },
      createTextNode: function (text) { return { nodeValue: text }; },
      getElementById: function () { return null; },
      getElementsByTagName: function () { return []; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: noop,
      removeEventListener: noop
    };
  }

  /* ---------------- navigator ---------------- */
  if (typeof g.navigator === 'undefined') {
    g.navigator = {
      userAgent: 'WeChat-MiniGame',
      platform: 'wechat',
      language: 'zh-CN',
      onLine: true,
      getBattery: null
    };
  }

  /* ---------------- localStorage ---------------- */
  if (typeof g.localStorage === 'undefined') {
    g.localStorage = {
      getItem: function (k) {
        try {
          var v = wx.getStorageSync(k);
          return (v === '' || typeof v === 'undefined') ? null : v;
        } catch (e) { return null; }
      },
      setItem: function (k, v) {
        try { wx.setStorageSync(k, v); } catch (e) { /* 忽略 */ }
      },
      removeItem: function (k) {
        try { wx.removeStorageSync(k); } catch (e) { /* 忽略 */ }
      },
      clear: function () {
        try { wx.clearStorageSync(); } catch (e) { /* 忽略 */ }
      }
    };
  }

  /* ---------------- 常用事件桥接 ---------------- */
  if (typeof g.addEventListener !== 'function') {
    g.addEventListener = function (type, cb) {
      if (type === 'resize' && typeof wx.onWindowResize === 'function') {
        wx.onWindowResize(function (res) {
          win.innerWidth = res.windowWidth;
          win.innerHeight = res.windowHeight;
          cb && cb(res);
        });
      }
    };
    g.removeEventListener = noop;
  }

  console.log('[adapter] 小游戏环境适配已注入');
  return g;
}

module.exports = { install: install };
