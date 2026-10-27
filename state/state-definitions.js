/**
 * ★★★ 所有状态的初始值（唯一修改点）★★★
 *
 * 要改默认值、加新字段，只看这一个文件。
 * 其它地方一律通过 state/actions.js 改、state/selectors.js 读。
 *
 * 约定：
 *   · 状态只在这里写「初值」，运行中不直接改这里的对象
 *   · 每个字段都写了中文说明，不用再去别处找
 */
'use strict';

/* ============================================================
 * 一、全局常量（不会变的值）
 * ============================================================ */
var CONSTANTS = {
  // 状态机取值
  STATUS: {
    IDLE: 'idle',
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error'
  },

  // 地图来源
  MAP_SOURCE: {
    FILE: 'file',           // 来自地图文件（txt / js）
    GENERATED: 'generated'  // 由 pattern + tilePool 随机生成
  },

  // 空格子标记（渲染时跳过，露出背景）
  EMPTY_TILE: -1
};

/* ============================================================
 * 二、各模块初始状态
 * ============================================================ */
var INITIAL_STATE = {

  /* ---------------------------------------------------------- 视口 */
  viewport: {
    width: 375,   // 逻辑宽（首次启动会被真实值覆盖）
    height: 667,  // 逻辑高
    dpr: 1        // 像素比
  },

  /* ---------------------------------------------------------- 资源 */
  assets: {
    atlas: {
      status: 'idle',   // idle | loading | ready | error
      key: null,        // 资源 key，例如 'floor-atlas'
      width: 0,         // 大图原始宽
      height: 0,        // 大图原始高
      tileCount: 0,     // 切出多少块
      error: null       // 失败原因
    }
  },

  /* ---------------------------------------------------------- 地板 */
  floor: {
    status: 'idle',     // idle | loading | ready | error
    error: null,

    // ---- 单块原始尺寸（来自图集）----
    tileWidth: 56,
    tileHeight: 56,

    // ---- 渲染缩放：显示尺寸 = 原始尺寸 × scale ----
    scale: 5,

    // ---- 地板格数 ----
    columns: 0,
    rows: 0,

    // ---- 地板内容总尺寸（像素，已含 scale）----
    contentWidth: 0,
    contentHeight: 0,

    // ---- 滚动偏移：恒 <= 0，0 = 贴左上角 ----
    offsetX: 0,
    offsetY: 0,

    // ---- 可滚动上限（正数，0 = 该方向不能滚）----
    maxScrollX: 0,
    maxScrollY: 0,

    // ---- 拖拽 / 惯性 ----
    scrollEnabled: true,
    isDragging: false,
    velocityX: 0,
    velocityY: 0,

    // ---- 地图数据：map[row][col] = 图集索引，-1 = 空格子 ----
    map: null,
    mapSource: 'generated',   // 'file' | 'generated'
    mapName: null,            // 地图文件名/名，来源是随机生成时为 null

    // ---- 生成参数（仅随机生成模式用）----
    pattern: 'random',
    seed: 20240101,

    // ---- 背景色（空格子露出这个颜色）----
    background: '#0d1117'
  }
};

/* ============================================================
 * 三、工具：浅/深拷贝
 * ============================================================ */
function shallow(src) {
  var out = {};
  for (var k in src) out[k] = src[k];
  return out;
}

function cloneAtlas(atlas) {
  return shallow(atlas);
}

function cloneFloor(floor) {
  var out = shallow(floor);
  // map 是数组，每次新建引用，避免多个 store 共用
  out.map = floor.map ? floor.map.slice() : null;
  return out;
}

/* ============================================================
 * 四、创建初始状态
 * ============================================================ */
/**
 * @param {Object} viewportSize { width, height, dpr } 可选，覆盖默认视口
 * @return {Object} 完整的初始状态
 */
function createInitialState(viewportSize) {
  var view = shallow(INITIAL_STATE.viewport);
  if (viewportSize) {
    if (typeof viewportSize.width === 'number') view.width = viewportSize.width;
    if (typeof viewportSize.height === 'number') view.height = viewportSize.height;
    if (typeof viewportSize.dpr === 'number') view.dpr = viewportSize.dpr;
  }

  return {
    viewport: view,
    assets: {
      atlas: cloneAtlas(INITIAL_STATE.assets.atlas)
    },
    floor: cloneFloor(INITIAL_STATE.floor)
  };
}

module.exports = {
  CONSTANTS: CONSTANTS,
  INITIAL_STATE: INITIAL_STATE,
  createInitialState: createInitialState
};
