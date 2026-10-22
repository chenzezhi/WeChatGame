# Termux 上传微信小游戏代码 —— 排错说明

## 进展

1. ✅ 已解决 `bad ELF magic` / `write EPIPE`
   Termux/Android 上 Node 的 `process.execPath` 被误报成 `linker64`，
   `child_process.fork()` 会执行 `linker64 xxx.js` 而失败。
   本目录的 `node-android-fix.js` 会自动修正，`upload.js` 已默认加载它。

2. ✅ 已排除网络问题
   `bash nettest.sh` 显示到 `servicewechat.com` 的 TCP/TLS 都是秒通。

3. ⏳ 当前现象：编译到 `Compiling game.js ... done` 后不动，
   而且 `setInterval` 看门狗不触发 → 事件循环被卡住（是死等，不是慢）。

## 第一步：抓取诊断报告（决定性地定位）

```bash
bash trace.sh
```

它会跑上传，卡住 45 秒后给 Node 发 SIGUSR2 生成诊断报告并打印摘要：

- `javascriptStack`：卡在哪个 JS 调用；
- `libuv`：有哪些活跃句柄。
  - 看到 `tcp` 句柄指向某个 `IP:443` → 卡在连那个地址；
  - 只有 `timer`、甚至报告都没生成 → 卡在同步/原生调用。

把 `bash trace.sh` 打印的摘要（或 `~/wx-report/wx-report.json`）发我即可。

## 第二步（最稳，推荐直接做）：在 proot 的 Ubuntu 里上传

Termux 用的是 Android 的 bionic libc，而 `miniprogram-ci` 的原生编译模块
本来就是给 glibc 的 Linux 编译的。proot 里跑一个真正的 Ubuntu，兼容性最好。

```bash
# 首次：把环境装进容器（较慢，只需一次）
pkg install -y proot-distro
proot-distro install ubuntu
bash upload-proot.sh --setup

# 以后每次上传：
bash upload-proot.sh
```

### ⚠️ 两个高频坑（本次踩到，务必先看）

#### 坑 1：`pkg install` 报 `NO_PUBKEY 5A897D96E57CF20C`

```
The following signatures couldn't be verified because the public key is not available: NO_PUBKEY 5A897D96E57CF20C
Error: The repository '...termux-main stable InRelease' is not signed.
```

原因：本机 `termux-keyring` 太旧，或换用了镜像源（如清华源）
但没同步对应签名密钥。**这只是密钥环过期，不代表网络坏了。**

解决（任选，推荐先切回官方源再更新密钥环）：

```bash
# 1) 交互式切换镜像源（选官方 Grimler / 默认源）
termux-change-repo

# 2) 更新软件源与密钥环
pkg update
pkg install -y termux-keyring

# 3) 若之后还想用清华等镜像，再跑一次 termux-change-repo 切回去
termux-change-repo
```

> 注：`proot-distro install ubuntu` 走的是 Docker 镜像仓库（不是 apt 源），
> 所以**即使 apt 报错，proot-distro 仍可能已经装好了**。
> 验证：`proot-distro list`，或直接 `proot-distro login ubuntu`。

#### 坑 2：`bash upload-proot.sh` 报 `No such file or directory`

```bash
$ bash upload-proot.sh --setup
bash: upload-proot.sh: No such file or directory
```

原因：当前目录（例如 `/storage/emulated/0/AppProjects`）里根本没有这个脚本，
或者脚本在别处。**和 proot、apt 都无关，纯粹是“文件不在当前路径”。**

解决：

```bash
# 看看当前目录有什么
ls

# 全盘找一下这个脚本
find /sdcard /storage/emulated/0 "$HOME" -name 'upload-proot.sh' 2>/dev/null

# 找到后，切到它所在目录再跑
cd <脚本所在目录>        # 例如 cd ~/WeChatGame
bash upload-proot.sh --setup

# 或直接用绝对路径
bash /完整/路径/WeChatGame/upload-proot.sh --setup
```

#### 坑 3：项目放在 `/storage/emulated/0`，proot 里看不到

**proot 只把 Termux 的 `$HOME` 映射成容器内的 `/root`。**
`/storage/emulated/0/...`（内部存储）这类路径**在容器里不可见**，
所以在那里直接 `proot-distro login` 会找不到项目文件。

`upload-proot.sh` 已内置“同步”：**当脚本不在 `$HOME` 下时，
会自动把项目复制到 `$HOME/wx-upload/WeChatGame`（排除工具文件）再上传。**
无需手动 `cd`，直接：

```bash
bash /完整/路径/WeChatGame/upload-proot.sh
```

想自定义同步目标目录，设 `WX_HOME_PROJECT`：

```bash
WX_HOME_PROJECT=~/my-game bash upload-proot.sh
```

> 建议：**干脆把整个 `WeChatGame` 放到 `$HOME` 下**（如 `~/WeChatGame`），
> 既可避开 `/storage` 的 FUSE 卡死，也让 proot 直接可见，最省事。

带版本号上传：

```bash
WX_VERSION=1.0.1 WX_DESC="修复bug" bash upload-proot.sh
```

## 如果 proot 里也卡

多半是 `miniprogram-ci` 最新版的 bug，换一个已知稳定的旧版本（在 Ubuntu 容器里）：

```bash
npm i -g miniprogram-ci@1.9.10
```

## 快速排查清单

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `NO_PUBKEY ...` / `not signed` | termux-keyring 过期或镜像源密钥不匹配 | `termux-change-repo` → `pkg update && pkg install -y termux-keyring` |
| `upload-proot.sh: No such file or directory` | 当前目录没有该脚本 | `cd` 到脚本目录，或用绝对路径运行 |
| proot 里看不到项目 | `/storage/...` 未映射进容器 | 把项目放 `$HOME`，或让 `upload-proot.sh` 自动同步 |
| `bad ELF magic` / `write EPIPE` | Android execPath 误报为 linker64 | 已由 `node-android-fix.js` 自动修正 |
| 编译完成后卡住 | 连不上微信服务器 / FUSE 卡死 | 用 `upload-proot.sh` 或 `upload.sh`（复制到 `$HOME`） |

## 文件一览

| 文件 | 作用 |
| --- | --- |
| `node-android-fix.js` | 修正 Android 上错误的 `process.execPath`，修 fork |
| `upload.sh` | 复制项目到 `$HOME`（真实文件系统）再用 Termux 的 Node 上传 |
| `upload-proot.sh` | 在 proot Ubuntu 里上传；不在 `$HOME` 时自动同步（`--setup` 一键装环境） |
| `upload.js` | 上传核心脚本（含补丁、看门狗、自动定位全局 ci） |
| `trace.sh` + `report-read.js` | 抓取卡住时的 Node 诊断报告 |
| `forktest.js` / `forkchild.js` | 验证 fork + IPC |
| `nettest.sh` | 验证到微信服务器的网络 |
| `diagnose.sh` | 环境诊断 |

### upload.js 环境变量

`WX_APPID` `WX_PROJECT_PATH` `WX_KEY_PATH` `WX_VERSION` `WX_DESC` `WX_ROBOT` `WX_TIMEOUT`

### upload-proot.sh 环境变量

`DISTRO`（默认 ubuntu）`WX_HOME_PROJECT`（同步目标，默认 `$HOME/wx-upload/WeChatGame`）
以及透传给 `upload.js` 的 `WX_VERSION` `WX_DESC` `WX_ROBOT`

### 安全

`private.*.key` 是上传密钥，已在 `.gitignore` 里忽略（`*.key`），不要提交。
