# 地板模块使用说明

改参数只动一个文件：**`features/floor/config/floor-config.js`**
（也可以在 `game.js` 的 `GAME_CONFIG.floor` 里覆盖，优先级更高）

---

## 一、菱形贴图怎么无缝（先看这个）

如果你的贴图是**菱形**（四个角透明），按方块平铺一定会有缺口 —— 因为相邻两块的透明角落对在一起。改一行就好：

```js
// features/floor/config/floor-config.js
layout: 'staggered',
```

三种模式：

| `layout` | 效果 | 适合 |
| --- | --- | --- |
| `'grid'` | 正方形平铺 | 方块地砖 |
| `'staggered'` | 每行半格错开，菱形像砖墙那样咬合 | ✅ 菱形贴图，最常用 |
| `'iso'` | 45° 等距投影，坐标 `(col-row, col+row)` | 要「三视角/斜向地图」的观感 |

### 它是怎么算的

```
staggered:  x = col × W + (row % 2) × (W/2)
            y = row × (H/2)

iso:        x = (col − row) × (W/2)
            y = (col + row) × (H/2)
```

`W`/`H` 就是 `floor-tileset.js` 里的 `tileWidth`/`tileHeight`。

### 前提条件

菱形的四个顶点必须**贴着 56×56 方框的四条边中点**。也就是说：

- 如果图里菱形占满整个方框（上顶点在 `(28,0)`，下顶点在 `(28,56)`），那就对
- 如果菱形周围还有留白，`tileWidth`/`tileHeight` 要按**含留白的整个方框**来填，不要只填菱形本身

---

## 二、渲染策略

**整张大图进内存，坐标现算，不预切、不缓存切片。**

| | 状态 |
| --- | --- |
| 大图 | 内存里 **1 份** |
| 每块的位置 | **不存**，`getTileScreenPos()` 每次现算 |
| 预切的小图 | **没有** |
| 地图 map | 存**索引数字** |

绘制走 `ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)`，九参重载现切。

---

## 三、每块显示多大（缩放规则）

`computeGrid()` 的决策顺序：

| 条件 | scale | 结果 |
| --- | --- | --- |
| `tileDisplaySize > 0` | `tileDisplaySize / tileWidth` | 你说了算 |
| 有地图文件 或 有 `grid` 格子数 | **1** | 保持原始大小，超出屏幕就**滚动** |
| 什么都没指定 | `屏宽 / (auto列数 × tileWidth)` | 自适应铺满一屏 |

---

## 四、指定用哪几块地板块（地板池）

> 仅随机生成模式有效。用地图文件时请直接在地图里写索引。

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
  17,                   // 扁平索引
  'floor_0'             // tileset.tiles 里起的名字
]
```

### 怎么选

```js
pattern: 'random'    // 随机（配合 seed）
pattern: 'sequence'  // 按顺序循环
pattern: 'checker'   // 棋盘交替
pattern: 'single'    // 只用池子第一个（调试切图最好用这个）
```

---

## 五、地板大小与滚动

```js
grid: { columns: 10, rows: 20 }   // 仅随机生成模式有效
```

- 填 **0** = 按屏幕自适应。
- 填具体数字 = 固定大小，**超出屏幕就能滑**，每块大小不变。

用地图文件时，格子数由地图文件的行列决定，`grid` 自动失效。

### 滑动

```js
scroll: {
  enabled: true,
  inertia: true,
  friction: 0.92
}
```

状态全在 `state/state-definitions.js`（`floor` 下的 `offsetX`/`offsetY`/`maxScrollX`/`maxScrollY`/`velocityX`/`velocityY`/`isDragging`）。

---

## 六、调参顺序（推荐）

1. `pattern: 'single'`、`tilePool: [{ row: 0, col: 0 }]` → 满屏是**一张干净完整的瓷砖**
2. 菱形贴图 → 把 `layout` 改成 `'staggered'`，观察菱形是否咬合无缝
3. 如果还有缝，检查 `tileWidth`/`tileHeight` 是不是菱形的**外接方框**尺寸
4. 打开地图文件，测试滚动
5. 最后把 `pattern` 改回 `'random'`

---

## 七、切图参数在哪改

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
[floor] 贴图就绪：512x512，切出 4x4 = 16 块，布局 staggered，地图 assets/maps/level-1.txt（8x6）
```
