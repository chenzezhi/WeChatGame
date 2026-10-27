# 地板模块使用说明

改参数只动一个文件：**`features/floor/config/floor-config.js`**
（也可以在 `game.js` 的 `GAME_CONFIG.floor` 里覆盖，优先级更高）

---

## 一、指定用哪几块地板块（地板池）

大图切出来是 N 行 × M 列的网格，用「第几行第几列」来点名。
**行、列都从 0 开始**，左上角是 `{ row: 0, col: 0 }`。

```js
tilePool: [
  { row: 0, col: 0 },   // 第 0 行第 0 列
  { row: 1, col: 1 },   // 第 1 行第 1 列
  { row: 2, col: 2 },   // 第 2 行第 2 列
  { row: 3, col: 3 }
],
```

### 支持的三种写法（可混用）

```js
tilePool: [
  { row: 2, col: 1 },   // 对象写法（推荐，最不容易看错）
  [2, 1],               // 数组简写：⚠️ 顺序是 [行, 列]
  17,                   // 扁平索引：从左上角往右数，第 17 块
  'floor_0'             // 用 assets/atlas/floor-tileset.js 里 tiles 起的名字
]
```

> 越界的坐标会被钳制到合法范围，不会崩。

### 怎么选

```js
pattern: 'random'    // 随机（配合 seed，每次进入花纹一致）
pattern: 'sequence'  // 按顺序循环铺，从左到右、从上到下
pattern: 'checker'   // 棋盘交替
pattern: 'single'    // 只用池子第一个（调试切图对不对最好用这个）
```

换花纹但想保持随机：改 `seed: 20240101` 这个数字。

---

## 二、地板大小

```js
grid: { columns: 20, rows: 40 }   // 20 列 × 40 行
```

- 填 **0** = 按屏幕自适应，刚好铺满一屏，不能滑。
- 填具体数字 = 固定大小，**超出屏幕就能滑**。

### 每块显示多大

```js
tileDisplaySize: 48   // 每块在屏幕上 48×48 逻辑像素
```

- 填 **0** = 自动（按屏幕宽度铺满 `grid.columns` 列）。
- 想地形更粗糙就调大，更细腻就调小。

> 地板总大小 = `grid.columns × tileDisplaySize`（宽度方向）
> 例如 20 × 48 = 960 像素，而屏幕只有 412，所以能横向滑动 548 像素。

---

## 三、滑动

```js
scroll: {
  enabled: true,   // 总开关
  inertia: true,   // 松手后惯性滑动
  friction: 0.92   // 惯性衰减，越小停得越快（0.85 ~ 0.96）
}
```

行为：

- 单指拖动地板，跟手。
- 松手带惯性，自动减速停下。
- **自动限制边界**，拖不出地板外面。
- 内容没超出屏幕时完全不能拖。

滑动相关状态全在 `state/modules/floor/state.js`：
`offsetX` / `offsetY`（当前偏移）、`maxScrollX` / `maxScrollY`（可滚范围）、
`velocityX` / `velocityY`（惯性速度）、`isDragging`。

---

## 四、调参顺序（推荐）

1. `pattern: 'single'`、`tilePool: [{ row: 0, col: 0 }]`
   → 满屏应该是一张**干净完整的瓷砖**，没有黑边、没有碎边。
   Console 会打印：`[floor] 贴图就绪：… 地板池 1 块 [0]`
2. 换成多个块，观察是不是你要的那几块。
3. 打开 `grid` 填大数字，测试滑动。
4. 最后把 `pattern` 改回 `'random'`。

---

## 五、切图参数在哪改

**`assets/atlas/floor-tileset.js`**

```js
tileWidth: 56,    // 一块的宽
tileHeight: 56,   // 一块的高
margin: 18,       // 大图最外圈留白
spacing: 20,      // 块与块之间的间隔
columns: 0,       // 0 = 按图宽自动推算
rows: 0
```

改完看 Console 这行，行 × 列 和你在大图上数出来的一致就对了：

```
[floor] 贴图就绪：512x512，切出 4x4 = 16 块，地板池 4 块 [0,5,10,15]
```
