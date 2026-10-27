# 状态管理（集中式）

## 一句话

**改状态只看 `state/state-definitions.js` 一个文件。**

## 目录（全部平铺，没有子模块目录）

```
state/
├── state-definitions.js   ★ 所有状态的初始值 + 常量（改默认值看这里）
├── actions.js               所有「改状态」的函数（唯一入口）
├── selectors.js             所有「读状态 / 派生值」
├── index.js                 创建 store
└── store/
    └── create-store.js      极简 store 实现（getState/update/subscribe/select）
```

## 常见操作对应到哪个文件

| 我想做的事 | 打开哪个文件 | 改哪里 |
| --- | --- | --- |
| 改地板背景色 | `state-definitions.js` | `floor.background` |
| 改默认单块尺寸 | `state-definitions.js` | `floor.tileWidth/tileHeight` |
| 改滚动初始速度 | `state-definitions.js` | `floor.velocityX/Y` |
| 加一个状态字段 | `state-definitions.js` | 对应模块里加一行 |
| 改某个值的更新逻辑 | `actions.js` | 找对应函数 |
| 加一个派生值（如「已滚百分比」） | `selectors.js` | 加一个函数 |
| 想改 store 本身的机制 | `store/create-store.js` | 一般不用动 |

## 用法示例

```js
var createAppStore = require('./state/index.js').createAppStore;
var actions = require('./state/actions.js');
var selectors = require('./state/selectors.js');

var store = createAppStore({ width: 375, height: 667, dpr: 2 });

// 改状态
actions.setOffset(store, -100, 0);

// 读状态
var floor = selectors.getFloor(store);
var bounds = selectors.getScrollBounds(store);
var canMove = selectors.canScroll(store);

// 订阅变更
var off = store.subscribe(function (state) {
  console.log('地板偏移', state.floor.offsetX);
});
off(); // 取消订阅
```

## 三个状态模块的内容

| 模块 | 字段 |
| --- | --- |
| `viewport` | `width` `height` `dpr` |
| `assets` | `atlas.{status, key, width, height, tileCount, error}` |
| `floor` | `status` `error` `tileWidth` `tileHeight` `scale` `columns` `rows` `contentWidth` `contentHeight` `offsetX` `offsetY` `maxScrollX` `maxScrollY` `scrollEnabled` `isDragging` `velocityX` `velocityY` `map` `mapSource` `mapName` `pattern` `seed` `background` |

## 注意

- **不要直接改 `store.getState()` 返回的对象**，一律走 `actions.js`，否则订阅者收不到通知。
- `INITIAL_STATE` 只描述「初值」，运行中的值以 `store.getState()` 为准。
- `createInitialState()` 会做浅拷贝，多实例之间不会互相污染。
