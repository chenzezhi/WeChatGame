#!/usr/bin/env bash
#
# upload-proot.sh —— 一条命令、全自动，在 proot 的 Ubuntu(glibc) 里上传
#
# 为什么用 proot：
#   miniprogram-ci 编译时 fork 一个 summer-compiler 子进程并通过 IPC 回传结果。
#   Android(bionic) 上这层通信不完整，父进程会死等 → 日志停在
#   "forkProcess start" 之后再无输出。execPath 补丁只能修「子进程启动」,
#   修不了通信，所以必须换 glibc 环境。
#
# 本脚本会自动补齐所有前置，不需要你手动装任何东西：
#   1) 缺 proot-distro      → pkg install -y proot-distro
#   2) 缺 ubuntu 容器       → proot-distro install ubuntu
#   3) 容器里缺 node/npm    → apt-get install nodejs npm（版本<14 自动换 Node 18）
#   4) 容器里缺 miniprogram-ci → npm i -g miniprogram-ci
#
# 用法：
#   bash upload-proot.sh
#   bash upload-proot.sh -v 1.0.2 -d "修复登录" -r 2
#   bash upload-proot.sh --setup            # 强制重装容器内依赖
#   bash upload-proot.sh --no-bootstrap     # 只上传，不自动补前置
#   WX_TIMEOUT_SEC=1800 bash upload-proot.sh
#
set -u

DISTRO="${DISTRO:-ubuntu}"
SRC="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${HOME:-/data/data/com.termux/files/home}"
DEST="${WX_PROOT_PROJECT:-$HOME_DIR/wx-proot/WeChatGame}"
TIMEOUT_SEC="${WX_TIMEOUT_SEC:-900}"

WX_VERSION="${WX_VERSION:-}"
WX_DESC="${WX_DESC:-}"
WX_ROBOT="${WX_ROBOT:-}"
DO_SETUP=0
NO_BOOTSTRAP=0

while [ $# -gt 0 ]; do
  case "$1" in
    -v|--version)   WX_VERSION="${2:-}"; shift $(( $# > 1 ? 2 : 1 )) ;;
    -d|--desc)      WX_DESC="${2:-}";    shift $(( $# > 1 ? 2 : 1 )) ;;
    -r|--robot)     WX_ROBOT="${2:-}";   shift $(( $# > 1 ? 2 : 1 )) ;;
    --setup)        DO_SETUP=1; shift ;;
    --no-bootstrap) NO_BOOTSTRAP=1; shift ;;
    -h|--help)      sed -n '2,30p' "$0" | sed 's/^#//'; exit 0 ;;
    *)              echo "[警告] 忽略未知参数：$1" >&2; shift ;;
  esac
done

die()  { echo "[错误] $*" >&2; exit 1; }
step() { echo ""; echo "==> $*"; }
info() { echo "  $*"; }

# ================================================================ 1. 前置自举
step "1/6 检查 proot-distro"
if ! command -v proot-distro >/dev/null 2>&1; then
  [ "$NO_BOOTSTRAP" = "1" ] && die "未安装 proot-distro（已指定 --no-bootstrap）"
  info "未安装，正在执行 pkg install -y proot-distro ..."
  pkg install -y proot-distro || die "安装 proot-distro 失败，请手动执行： pkg install -y proot-distro"
fi
info "proot-distro 就绪"

step "2/6 检查 $DISTRO 容器"
distro_installed() {
  local d
  for d in \
    "${PREFIX:-/data/data/com.termux/files/usr}/var/lib/proot-distro/installed-rootfs/$DISTRO" \
    "$HOME_DIR/.local/share/proot-distro/installed-rootfs/$DISTRO"; do
    [ -d "$d" ] && return 0
  done
  proot-distro list 2>/dev/null | grep -qw "$DISTRO"
}

if distro_installed; then
  info "$DISTRO 已安装"
else
  [ "$NO_BOOTSTRAP" = "1" ] && die "未安装 $DISTRO（已指定 --no-bootstrap）"
  info "正在安装，首次需要下载几百 MB，请耐心等待..."
  proot-distro install "$DISTRO" || die "安装 $DISTRO 失败，请检查网络后手动执行： proot-distro install $DISTRO"
  info "$DISTRO 安装完成"
fi

# ---------------------------------------------------------------- 容器内环境检测
container_ready() {
  proot-distro login "$DISTRO" --termux-home -- bash -lc '
    command -v node >/dev/null 2>&1 || exit 1
    command -v npm  >/dev/null 2>&1 || exit 1
    g="$(npm root -g 2>/dev/null)" || exit 1
    [ -n "$g" ] || exit 1
    [ -d "$g/miniprogram-ci" ] || exit 1
    exit 0
  ' >/dev/null 2>&1
}

install_in_container() {
  step "3/6 在容器内安装 node / npm / miniprogram-ci"
  info "首次较慢，请耐心等待..."
  proot-distro login "$DISTRO" --termux-home -- bash -lc '
    set -e
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y nodejs npm ca-certificates curl

    major="$(node -v 2>/dev/null | sed "s/^v//;s/\..*//")"
    if [ "${major:-0}" -lt 14 ]; then
      echo "[容器] 当前 node $(node -v) 版本偏低，尝试升级到 Node 18 ..."
      if curl -fsSL https://deb.nodesource.com/setup_18.x -o /tmp/nodesource.sh; then
        bash /tmp/nodesource.sh || true
        apt-get install -y nodejs || true
      else
        echo "[容器] 下载 NodeSource 脚本失败，继续用系统 node"
      fi
    fi

    npm i -g miniprogram-ci
    echo "----- 容器内环境 -----"
    node -v
    npm -v
    npm root -g
  ' || die "容器内安装失败。若容器不能联网：proot-distro login $DISTRO 后 apt-get update 试一下"
}

if [ "$DO_SETUP" = "1" ]; then
  install_in_container
elif container_ready; then
  step "3/6 容器内环境"
  info "node / npm / miniprogram-ci 已就绪"
else
  install_in_container
fi

# ================================================================ 2. 项目校验
step "4/6 检查项目文件"
for f in game.js game.json project.config.json upload.js node-android-fix.js; do
  [ -f "$SRC/$f" ] || die "缺少必需文件：$f（目录：$SRC）"
done
info "game.js / game.json / project.config.json / upload.js / node-android-fix.js 齐备"

APPID="${WX_APPID:-}"
if [ -z "$APPID" ]; then
  APPID="$(sed -n 's/.*"appid"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
          "$SRC/project.config.json" 2>/dev/null | head -n1)"
fi
[ -n "$APPID" ] || die "project.config.json 里没有 appid"

KEY="${WX_KEY_PATH:-}"
if [ -z "$KEY" ]; then
  [ -f "$SRC/private.$APPID.key" ] && KEY="$SRC/private.$APPID.key"
  if [ -z "$KEY" ]; then
    for k in "$SRC"/private.*.key; do [ -f "$k" ] && { KEY="$k"; break; }; done
  fi
fi
[ -n "$KEY" ] && [ -f "$KEY" ] || die "找不到私钥。请放到项目根目录并命名为 private.$APPID.key"

# ================================================================ 3. 复制进真实文件系统
step "5/6 准备上传目录"
# /storage/emulated/0 是 FUSE，Node 读写会挂死；
# 而且 proot 只把 Termux 的 $HOME 映射为容器 /root，
# 项目在 /storage 下的话容器里根本看不见，必须先复制。
EXCLUDE="upload.js upload.sh upload-auto.sh upload-proot.sh backup.sh node-android-fix.js forktest.js forkchild.js diagnose.sh nettest.sh node_modules backup .git .wx-tmp"

is_excluded() {
  local name="$1" e
  for e in $EXCLUDE; do
    [ "$name" = "$e" ] && return 0
  done
  case "$name" in README*|.gitignore|*.key) return 0 ;; esac
  return 1
}

if [ "$SRC" = "$DEST" ]; then
  info "已在真实文件系统，跳过复制"
else
  mkdir -p "$DEST" || die "无法创建 $DEST"
  cd "$SRC" || die "无法进入 $SRC"
  shopt -s nullglob
  n=0
  for item in *; do
    is_excluded "$item" && continue
    rm -rf "$DEST/$item"
    cp -rf "$item" "$DEST/$item" || die "复制失败：$item"
    info "+ $item"
    n=$((n + 1))
  done
  shopt -u nullglob
  [ "$n" -gt 0 ] || die "源目录没有可复制的文件"
fi

cp -f "$SRC/upload.js"           "$DEST/upload.js"           || die "复制 upload.js 失败"
cp -f "$SRC/node-android-fix.js" "$DEST/node-android-fix.js" || die "复制 node-android-fix.js 失败"
cp -f "$KEY" "$DEST/$(basename "$KEY")" || die "复制私钥失败"

for f in game.js game.json project.config.json upload.js node-android-fix.js; do
  [ -f "$DEST/$f" ] || die "上传目录缺少：$f"
done
KEY_IN_NAME="$(basename "$KEY")"
[ -f "$DEST/$KEY_IN_NAME" ] || die "上传目录缺少私钥：$KEY_IN_NAME"
info "上传目录：$DEST"

# ================================================================ 4. 容器内路径
case "$DEST" in
  "$HOME_DIR"*) INNER="/root${DEST#$HOME_DIR}" ;;
  *) die "项目不在 Termux 家目录下，proot 容器里看不到：$DEST" ;;
esac

ENVV=""
[ -n "$WX_VERSION" ] && ENVV="$ENVV WX_VERSION='$WX_VERSION'"
[ -n "$WX_DESC" ]    && ENVV="$ENVV WX_DESC='$WX_DESC'"
[ -n "$WX_ROBOT" ]   && ENVV="$ENVV WX_ROBOT='$WX_ROBOT'"

# ================================================================ 5. 上传
step "6/6 开始上传（容器内运行）"
echo "  容器目录 : $INNER"
echo "  AppID    : $APPID"
echo "  私钥     : $KEY_IN_NAME"
echo "  版本号   : ${WX_VERSION:-1.0.0（默认）}"
echo "  超时上限 : ${TIMEOUT_SEC}s"
echo ""

# env -u 清掉 NODE_OPTIONS 与代理：
# --dns-result-order 之类参数在旧 node 上会让子进程直接起不来，
# 表现就是 forkProcess start 之后父进程死等。
# timeout 保证无论如何都不会无限卡住。
INNER_CMD="cd '$INNER' && exec env -u NODE_OPTIONS -u http_proxy -u https_proxy -u all_proxy \
-u HTTP_PROXY -u HTTPS_PROXY \
WX_PROJECT_PATH='$INNER' WX_APPID='$APPID' WX_KEY_PATH='$INNER/$KEY_IN_NAME'$ENVV \
        timeout --kill-after=10 $TIMEOUT_SEC node upload.js"

proot-distro login "$DISTRO" --termux-home -- bash -lc "$INNER_CMD"
RC=$?

echo ""
echo "============================================================"
if [ "$RC" = "0" ]; then
  echo "✅ 完成：版本 ${WX_VERSION:-1.0.0}（AppID $APPID）"
  echo ""
  echo "查看：用 AppID 为 $APPID 的小游戏账号登录 https://mp.weixin.qq.com"
  echo "      → 管理 → 版本管理 → 开发版本"
  echo ""
  echo "看不到时检查："
  echo "  1. 登录的是不是同一个 AppID（小游戏与小程序后台分开）"
  echo "  2. 同一 机器人+版本号 会覆盖旧开发版本，不是新增"
  echo "  3. 换版本号验证： bash upload-proot.sh -v 9.9.9"
elif [ "$RC" = "124" ]; then
  echo "⏱ 超时：${TIMEOUT_SEC}s 内没有完成，已强制终止。"
  echo "确实很慢的话可以放大上限： WX_TIMEOUT_SEC=1800 bash upload-proot.sh"
else
  echo "❌ 上传失败（退出码 $RC）"
  echo "排查："
  echo "  · 容器里没有 miniprogram-ci → bash upload-proot.sh --setup"
  echo "  · 容器不能联网 → proot-distro login $DISTRO 后 apt-get update 试试"
  echo "  · 80082 / 无权限 / invalid ip → 私钥与 AppID 不匹配或已失效"
  echo "  · 想临时回退原生方式 → bash upload.sh"
fi
echo "============================================================"

exit "$RC"
