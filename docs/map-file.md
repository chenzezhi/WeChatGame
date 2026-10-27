# 地图文件用法（推荐：纯文本）

直接写索引摆地图，不用写 JS 数组，不用声明行列数。

---

## 一、写地图

新建 **`assets/maps/level-1.txt`**，直接写数字：

```
17 20 17 20
2 6 7 2
2 6 7 2
```

就这样，没有别的东西。

### 规则

| 项目 | 说明 |
| --- | --- |
| 一行 | 地图的一行 |
| 每个数字 | 大图里的**扁平索引**（0 = 左上角第一块，往右数） |
| 分隔符 | 空格 / Tab / 逗号 / 分号，混着用也行 |
| 空格子 | 写 `.` 或 `-1` |
| 注释 | `#` 开头的整行；行尾 `//` 后面 |
| 行列数 | **不用写**，程序自己数 |
| 短行 | 自动补空格子 |
| 越界数字 | 自动取模，不会崩 |

从 Excel / 表格软件里框选复制再粘贴进来，通常直接就能用。

---

## 二、启用

编辑 **`features/floor/config/floor-config.js`**：

```js
mapFile: 'assets/maps/level-1.txt',
```

改地图内容不用改这一行，只要文件名不变。

---

## 三、换一张地图

1. 新建 `assets/maps/level-2.txt`
2. 把 `mapFile` 改成 `'assets/maps/level-2.txt'`

不需要在别的地方注册，**也不用改 `project.config.json`**。

---

## 四、哪些配置还有效

| 配置 | 地图模式下 |
| --- | --- |
| `grid` | ❌ 失效，行列数由地图文件决定 |
| `tilePool` / `pattern` / `seed` | ❌ 失效 |
| `tileDisplaySize` | ✅ 有效（每块显示多大） |
| `scroll` | ✅ 有效（超出屏幕照样能滑） |
| `background` | ✅ 有效（空格子露出的颜色） |

地图列数多时，建议明确写 `tileDisplaySize`，否则默认按「铺满屏幕宽度」缩放，每块会变得很小：

```js
tileDisplaySize: 48
```

---

## 五、验证

启动后 Console 会打印：

```
[floor] 已读取地图文件 assets/maps/level-1.txt（3x3）
[floor] 贴图就绪：512x512，切出 4x4 = 16 块，地图 assets/maps/level-1.txt（3x3）
```

`3x3` 是你写的地图行列数，和 Console 打印一致就说明读取成功。

### 读取失败会怎样

```
[floor] 地图文件读取失败：assets/maps/level-1.txt —— xxx，已退回自动生成
```

这句话会同时出现在 Console 和手机屏幕上。常见原因：

| 报错 | 原因 |
| --- | --- |
| `readFileSync:fail no such file` | 路径写错，或文件名拼错 |
| `readFileSync:fail permission` | 用了绝对路径，应该写相对于项目根的路径 |
| 解析为空 | 文件里没有数字行（例如每行都以 `#` 开头） |

失败时会自动退回 `pattern` 随机生成，不会白屏。

---

## 六、为什么用 txt 而不是 json

小游戏的 `require` **只支持 `.js`**，`require` 一个 `.json` 会在启动瞬间抛错（表现为一直卡在微信启动页）。

而纯文本地图走的是另一条路：

```js
wx.getFileSystemManager().readFileSync('assets/maps/level-1.txt', 'utf8')
```

它把文件当**字符串**读进内存，再自己解析，完全绕开 `require` 的限制。

---

## 七、JS 地图（备选，仍然保留）

如果更喜欢 JS 写法，`assets/maps/index.js` 里注册的方式依然可用：

```js
// floor-config.js
mapFile: null,
mapName: 'level-1'
```

两者都填时 **`mapFile` 优先**。
