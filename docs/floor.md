# 地板模块使用说明

改参数只动一个文件：**`features/floor/config/floor-config.js`**
（也可以在 `game.js` 的 `GAME_CONFIG.floor` 里覆盖，优先级更高）

---

## 一、渲染策略（先搞清楚这个）

**整张大图进内存，坐标现算，不预切、不缓存切片。**

| | 状态 |
| --- | --- |
| 大图 | 内存里 **1 份**（`wx.createImage` 解码后常驻） |
| 每块的位置 | **不存**，`getTileRect()` 每次现算（几次乘除，比查表还快） |
| 预切的小图 | **没有**，一张都不生成 |
| 地图 map | 存**索引数字**，不是图片 |

绘制走 `ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` —— 九参重载，
从内存里那张大图上按坐标现切一块。好处：内存只有一份、任意缩放不失真、不用重切。

另外已做**可见区裁剪**：只画屏幕内的格子，大地图也不会掉帧。

---

## 二、每块显示多大（缩放规则）

`computeGrid()` 的决策顺序：

| 条件 | scale | 结果 |
| --- | --- | --- |
| `tileDisplaySize > 0` | `tileDisplaySize / tileWidth` | 你说了算 |
| 有地图文件 或 有 `grid` 格子数 | **1** | 保持原始大小，超出屏幕就**滚动** |
| 什么都没指定 | `屏宽 / (auto列数 × tileWidth)` | 自适应铺满一屏（不能滚） |

> 第二档是关键：它保证「地图变大时每块大小不变，改成滚动」。

---

## 三、指定用哪几块地板块（地板池）

> 仅随机生成模式有效。用地图文件时请直接在地图里写索引。

大图切出来是 N 行 × M 列的网格，用「第几行第几列」点名。
**行、列都从 0 开始**，左上角是 `{ row: 0, col: 0 }`。

```js
tilePool: [
  { row: 0, col: 0 },
  { row: 1, col: 1 },
  { row: 2, col: 2 }
],
```

### 支持的写法（可混用）

```js
tilePool: [
  { row: 2, col: 1 },   // 对象写法（推荐）
  [2, 1],               // 数组简写：⚠️ 顺序是 [行, 列]
  17,                   // 扁平索引：从左上角往右数
  'floor_0'             // floor-tileset.js 里 tiles 起的名字
]
```

越界坐标会被钳制到合法范围，不会崩。

### 怎么选

```js
pattern: 'random'    // 随机（配合 seed，每次进入花纹一致）
pattern: 'sequence'  // 按顺序循环
pattern: 'checker'   // 棋盘交替
pattern: 'single'    // 只用池子第一个（调试切图最好用这个）
```

---

## 四、地板大小与滚动

```js
grid: { columns: 10, rows: 20 }   // 仅随机生成模式有效
```

- 填 **0** = 按屏幕自适应，刚好铺满一屏。
- 填具体数字 = 固定大小，**超出屏幕就能滑**，每块大小不变。

用地地图文件时，格子数由地图文件的行列决定，`grid` 自动失效。

### 滑动

```js
scroll: {
  enabled: true,
  inertia: true,
  friction: 0.92   // 越小停得越快（0.85 ~ 0.96）
}
```

- 单指拖动，跟手
- 松手带惯性，自动减速
- **自动限制边界**，拖不出地板外面
- 内容没超出屏幕时完全不能拖

滑动状态全在 `state/modules/floor/state.js`：
`offsetX/offsetY`、`maxScrollX/maxScrollY`、`velocityX/velocityY`、`isDragging`。

---

## 五、调参顺序（推荐）

1. `pattern: 'single'`、`tilePool: [{ row: 0, col: 0 }]`
   → 满屏是**一张干净完整的瓷砖**，没有黑边碎边
2. 换成多个块，观察是不是你要的那几块
3. 打开地图文件或填大 `grid`，测试滚动
4. 最后把 `pattern` 改回 `'random'`

---

## 六、切图参数在哪改

**`assets/atlas/floor-tileset.js`**

```js
tileWidth: 56,    // 一块的宽
tileHeight: 56,   // 一块的高
margin: 18,       // 大图最外圈留白
spacing: 20,      // 块与块之间的间隔
columns: 0,       // 0 = 按图宽自动推算
rows: 0
```

改完看 Console：

```
[floor] 贴图就绪：512x512，切出 4x4 = 16 块，地图 assets/maps/level-1.txt（8x6）
```

行 × 列 和你在大图上数出来的一致就对了。
