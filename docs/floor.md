# 地板模块使用说明

改参数只动一个文件：**`features/floor/config/floor-config.js`**

---

## 一、菱形地图怎么来的（核心）

**原则：贴图绝对不动，只决定「画哪些格子」。**

由两个开关组合：

### ① 布局：`layout: 'staggered'`

每行错开半格，相邻的菱形贴图自然咬合：
```
x = col × W + (row % 2) × W × stagger.x
y = row × H × stagger.y
```

### ② 地图形状：`mapShape: 'diamond'`

按 L1 范数判定格子是否在菱形内：
```
|col − 中心col| / 半宽  +  |row − 中心row| / 半高  ≤  1
```

- **在菱形内** → 整块原样绘制
- **在菱形外** → **整块不画**（不是裁一半，是整块跳过）

于是地图整体呈菱形，四边自然留出缺口。缺口处露出的是背景（纯色或背景图）。

### ③ 背景

```js
background: '#0d1117',                    // 纯色兜底
backgroundImage: 'assets/bg/ground.png', // 可选，铺满屏幕(cover)，缺口露出它
```

---

## 二、贴图要求

| 要求 | 说明 |
| --- | --- |
| **必须是 PNG** | JPG 没有 alpha，菱形四角会变实心色块 |
| 菱形顶点贴方框四边中点 | 即上顶点 `(W/2, 0)`、下顶点 `(W/2, H)` |
| `tileWidth/tileHeight` | 填**含菱形在内的方框**尺寸，不是菱形本身 |

在 `assets/atlas/floor-tileset.js` 里：
```js
image: 'assets/atlas/floor-tileset.png',   // ← 必须是 .png
tileWidth: 56,
tileHeight: 56,
margin: 18,
spacing: 20,
```

> 如果菱形在方框里**偏扁**（宽 56 但只有 40 高），把 `stagger.y` 调成 `40/56 ≈ 0.36`。

---

## 三、三种布局

| `layout` | 公式 | 适合 |
| --- | --- | --- |
| `'grid'` | `x=col×W, y=row×H` | 方块地砖 |
| `'staggered'` | `x=col×W+(row%2)×W×sx, y=row×H×sy` | ✅ 菱形贴图 |
| `'iso'` | `x=(col−row)×W/2, y=(col+row)×H/2` | 45° 斜向地图 |

```js
stagger: { x: 0.5, y: 0.5 }
```

| 现象 | 怎么调 |
| --- | --- |
| 菱形上下顶在一起 | `y` 调大（0.55、0.6…） |
| 菱形之间有纵向空隙 | `y` 调小（0.45、0.4…） |
| 菱形偏扁（56 宽 40 高） | `y = 40/56 ≈ 0.36` |

运行时也能调：`floor.setStagger(0.5, 0.36);`

---

## 四、菱形形状微调

```js
mapShape: 'diamond',
shapeTolerance: 0,     // 0 = 标准菱形；0.15 左右会让菱形胖一点
```

- `0` → 严格菱形，四边缺口最大
- `0.15` → 略微胖一圈，边角多出一两块
- `'rect'` → 关闭菱形裁剪，画成矩形

运行时：`floor.setShapeTolerance(0.15);`

---

## 五、渲染策略（重要）

| | 状态 |
| --- | --- |
| 大图（图集） | 内存里 **1 份**，**永不修改** |
| 背景图 | 内存里 1 份（如果配置了） |
| 每块位置 | 不存，每次现算 |
| 预切/遮罩的小图 | **没有**（上一版的遮罩方案已删除） |
| 地图 map | 存索引数字 |

绘制走 `ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)`：
- 贴图原样绘制，alpha 由 PNG 自带
- 相邻格子共享取整边界（`x1 = round(x0 + W)`），无缝且不拉伸
- 逐格做屏幕裁剪与形状裁剪

---

## 六、缩放规则

| 条件 | scale | 结果 |
| --- | --- | --- |
| `tileDisplaySize > 0` | `tileDisplaySize / tileWidth` | 你说了算 |
| 有地图文件 或 有 `grid` 格子数 | **1** | 保持原始大小，超出就滚动 |
| 什么都没指定 | `屏宽 / (auto列数 × tileWidth)` | 自适应铺满 |

---

## 七、地图文件

`assets/maps/level-1.txt`：

```
17 20 17 20
2 6 7 2
. 1 1 .
```

- 数字 = 大图扁平索引（0 = 左上角第一块）
- 分隔符：空格 / Tab / 逗号
- 空格子：`.` 或 `-1`
- `#` 开头整行注释

```js
mapFile: 'assets/maps/level-1.txt',
```

> 菱形裁剪是在地图之上再裁一次。如果你在 txt 里已经用 `.` 摆好了菱形，
> 就把 `mapShape` 改成 `'rect'`，避免重复裁剪。

---

## 八、调参顺序（菱形）

1. `mapShape: 'rect'`、`pattern: 'single'`、`tilePool: [{ row: 0, col: 0 }]`
   → 先确认贴的这块是**干净完整的菱形**，四角透明
2. `layout: 'staggered'`
   → 看相邻菱形是否咬合；有缝/重叠就调 `stagger.y`
3. `mapShape: 'diamond'`
   → 看地图整体是否呈菱形、四边缺口是否满意；不满意调 `shapeTolerance`
4. 配 `backgroundImage`
   → 缺口露出背景
5. 最后接地图文件 / 改回 `pattern: 'random'`

---

## 九、启动日志怎么看

```
[floor] 贴图就绪：512x512，切出 4x4 = 16 块，布局 staggered(0.5,0.5)，形状 diamond（可见 10 格），地图 …（8x8）
```

- `布局 staggered(0.5,0.5)` → 交错比例
- `形状 diamond（可见 10 格）` → 菱形裁剪后实际画多少格，明显少于 64 就说明裁剪生效
- 如果显示 `可见 64 格`，说明 `mapShape` 还是 `'rect'`
