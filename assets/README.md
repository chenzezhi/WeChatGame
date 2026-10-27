# 资源目录

## 地板大图放这里

把包含很多位图的那张**大图**保存为：

```
assets/atlas/floor-tileset.png
```

放好即可生效（文件名固定，改了要同步改 `assets/atlas/floor-tileset.json` 的 `image` 字段）。

## 需要改的只有一个数字：单块位图的尺寸

打开 `assets/atlas/floor-tileset.json`：

```json
{
  "image": "assets/atlas/floor-tileset.png",
  "tileWidth": 32,
  "tileHeight": 32,
  "margin": 0,
  "spacing": 0,
  "columns": 0,
  "rows": 0
}
```

| 字段 | 含义 |
| --- | --- |
| `tileWidth` / `tileHeight` | 大图里**一块**位图的宽高（像素）。不知道就先填 32，然后看控制台打印的切块数对不对 |
| `margin` | 大图四周的留白 |
| `spacing` | 块与块之间的间隙 |
| `columns` / `rows` | 填 0 = 按图片尺寸自动推算；也可以手动写死 |
| `tiles` | 给块起名字，可选。索引从 0 开始，左上角第一块是 0 |

启动后控制台会打印：

```
[floor] 贴图就绪：512x512，切出 16x16 = 256 块
```

如果数字明显不对，说明 `tileWidth` / `tileHeight` 填错了。

## 用哪些块铺地板

在 `features/floor/config/floor-config.js` 里改：

```js
tilePool: [0, 1, 2, 3],   // 用第 0、1、2、3 块
pattern: 'random',        // 'random' 随机 | 'checker' 棋盘 | 'single' 只用一块
grid: { columns: 0, rows: 0 }  // 0 = 按屏幕自适应铺满
```

也可以在 `game.js` 的 `GAME_CONFIG.floor` 里覆盖，不用改源码。
