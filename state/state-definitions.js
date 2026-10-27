/**
 * ★★★ 所有状态的初始值（唯一修改点）★★★
 *
 * 要改默认值、加新字段，只看这一个文件。
 * 其它地方一律通过 state/actions.js 改、state/selectors.js 读。
 */
'use strict';

/* ============================================================
 * 一、全局常量
 * ============================================================ */
var CONSTANTS = {
  STATUS: { IDLE: 'idle', LOADING: 'loading', READY: 'ready', ERROR: 'error' },
  MAP_SOURCE: { FILE: 'file', GENERATED: 'generated' },

  // 地板布局模式
  LAYOUT: {
    GRID: 'grid',           // 正方形平铺（方块地砖）
    STAGGERED: 'staggered', // 菱形交错（每行半格错开）
    ISO: 'iso'              // 等距投影（col-row, col+row）
  },

  // 地图整体形状（只决定「画哪些格子」，不碰贴图）
  MAP_SHAPE: {
    RECT: 'rect',       // 矩形，全部格子都画
    DIAMOND: 'diamond'  // 菱形，边界外的格子整块不画 → 四边留缺口
  },

  EMPTY_TILE: -1
};

/* ============================================================
 * 二、各模块初始状态
 * ============================================================ */
var INITIAL_STATE = {

  /* ---------------------------------------------------------- 视口 */
  viewport: {
    width: 375,
    height: 667,
    dpr: 1
  },

  /* ---------------------------------------------------------- 资源 */
  assets: {
    atlas: {
      status: 'idle',   // idle | loading | ready | error
      key: null,
      width: 0,
      height: 0,
      tileCount: 0,
      error: null
    },
    background: {
      status: 'idle',   // idle | loading | ready | error
      width: 0,
      height: 0,
      error: null
    }
  },

  /* ---------------------------------------------------------- 地板 */
  floor: {
    status: 'idle',
    error: null,

    // 单块原始尺寸（来自图集）
    tileWidth: 56,
    tileHeight: 56,

    // 渲染缩放：显示尺寸 = 原始尺寸 × scale
    scale: 1,

    // 地板格数
    columns: 0,
    rows: 0,

    // 地板内容总尺寸（像素，已含 scale）
    contentWidth: 0,
    contentHeight: 0,

    // 滚动偏移：恒 <= 0，0 = 贴左上角
    offsetX: 0,
    offsetY: 0,

    // 可滚动上限（正数，0 = 该方向不能滚）
    maxScrollX: 0,
    maxScrollY: 0,

    // 拖拽 / 惯性
    scrollEnabled: true,
    isDragging: false,
    velocityX: 0,
    velocityY: 0,

    // ---- 布局模式 ----
    //   'grid'      正方形平铺
    //   'staggered' 菱形交错（每行错开半格）← 菱形贴图用这个
    //   'iso'       等距投影（45°）
    layout: 'staggered',

    // ---- 交错比例（仅 staggered 有效）----
    //   staggerX：相邻行横向错开多少「格宽」的比例（0.5 = 半格）
    //   staggerY：相邻行纵向走多少「格高」的比例（0.5 = 菱形标准值）
    staggerX: 0.5,
    staggerY: 0.5,

    // ---- 地图整体形状 ----
    //   'rect'    矩形，全部格子都画
    //   'diamond' 菱形，边界外的格子整块不画（四边留缺口）← 你要的效果
    //
    // ⚠️ 这里只决定「画不画某一块」，绝不修改贴图本身
    mapShape: 'diamond',

    // ---- 地图数据：map[row][col] = 图集索引，-1 = 空格子 ----
    map: null,
    mapSource: 'generated',
    mapName: null,

    // 生成参数（仅随机生成模式用）
    pattern: 'random',
    seed: 20240101,

    // 背景色（没有背景图时铺这个）
    background: '#0d1117'
  }
};

/* ============================================================
 * 三、工具
 * ============================================================ */
function shallow(src) {
  var out = {};
  for (var k in src) out[k] = src[k];
  return out;
}

function cloneFloor(floor) {
  var out = shallow(floor);
  out.map = floor.map ? floor.map.slice() : null;
  return out;
}

/* ============================================================
 * 四、创建初始状态
 * ============================================================ */
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
      atlas: shallow(INITIAL_STATE.assets.atlas),
      background: shallow(INITIAL_STATE.assets.background)
    },
    floor: cloneFloor(INITIAL_STATE.floor)
  };
}

module.exports = {
  CONSTANTS: CONSTANTS,
  INITIAL_STATE: INITIAL_STATE,
  createInitialState: createInitialState
};
