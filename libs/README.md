# 第三方引擎放这里

## 放 cax（必须做，否则启动就崩）

项目根目录跑：

```
mkdir -p libs && cp node_modules/cax/dist/cax.js libs/cax.js
```

放好后 `libs/cax.js` 约 60KB。

## 从 cax 源码确认的三条（别改）

1. `require('./libs/cax.js')` 内部会调 `wx.createCanvas()`，那一次就是**上屏画布**。
   所以 game.js 里必须先 require，绝不能自己新建画布。

2. 小游戏用 `new cax.Stage()`（**无参**）。
   Stage 构造里 `arguments.length === 0` 才是小游戏分支，
   内部直接用那块上屏画布。
   传 `(w, h, canvas)` 会走 Web 分支，跑不起来。
   传 4 个参数会走小程序分支（WeStage），也跑不起来。

3. 坐标是**物理像素**。`stage.canvas.width/height` 是物理像素，
   而 `touch.clientX` 是逻辑像素，所以要乘 `pixelRatio`。

## 为什么这个目录不能进 ignore

`libs/` 里的文件必须**打进包**，所以 `project.config.json` 的
`packOptions.ignore` 里不能出现 `libs`。当前 ignore 只忽略
`node_modules`、`.git`、`.key`、`backup`、`docs`、`vendor`，安全。

## 为什么不用 require('cax')

小游戏 require 是在打包后的模块表里查，`node_modules` 里的文件不会自动进包。
必须把需要的那一个文件拷出来。
