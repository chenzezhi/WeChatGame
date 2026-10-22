#!/usr/bin/env bash
#
# upload.sh —— 微信小游戏一键上传（Termux / Android）
#
# 用法：
#   bash upload.sh
#   bash upload.sh -v 1.0.2 -d "修复登录" -r 2
#   bash upload.sh --inplace          # 不复制，直接在当前目录跑（调试用）
#   bash upload.sh --netcheck         # 可选：联网预检（默认关闭）
#   WX_MAX_WAIT=900 bash upload.sh    # 总超时，默认 600 秒
#
# 这一版修掉的 bug：
#   1) 「假成功」：原来 printed=$(flush_log ...) 把日志正文当成行数，
#      [ "$total" -gt "$printed" ] 报 "integer expected"，
#      同时 is_done 被提前满足 → Node 刚启动 2 秒就被 kill，
#      实际上一个字节都没传上去，所以版本管理里当然看不到。
#   2) 成功判定只认 upload.js 真正打印的「上传成功！」，
#      且命中后先等它自然退出（最多 10 秒），不秒杀。
#   3) 超时 / 被强杀 一律按失败处理，不再谎报成功。
#   4) 日志改为按字节偏移流式输出，超长单行 JSON 也能实时看到。
#   5) 60 秒无任何新输出时给出提示（多半卡在子进程 fork）。
#
set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR" || { echo "[错误] 无法进入目录：$PROJECT_DIR" >&2; exit 1; }

die()  { echo "[错误] $*" >&2; exit 1; }
info() { echo "  $*"; }

# ================================================================ 参数
WX_VERSION="${WX_VERSION:-}"
WX_DESC="${WX_DESC:-}"
WX_ROBOT="${WX_ROBOT:-}"
WX_MAX_WAIT="${WX_MAX_WAIT:-600}"
DO_NETCHECK="${WX_NETCHECK:-0}"
INPLACE=0

while [ $# -gt 0 ]; do
  case "$1" in
    -v|--version)  WX_VERSION="${2:-}";     shift $(( $# > 1 ? 2 : 1 )) ;;
    -d|--desc)     WX_DESC="${2:-}";        shift $(( $# > 1 ? 2 : 1 )) ;;
    -r|--robot)    WX_ROBOT="${2:-}";       shift $(( $# > 1 ? 2 : 1 )) ;;
    --max-wait)    WX_MAX_WAIT="${2:-600}"; shift $(( $# > 1 ? 2 : 1 )) ;;
    --netcheck)    DO_NETCHECK=1; shift ;;
    --no-netcheck) DO_NETCHECK=0; shift ;;
    --inplace)     INPLACE=1; shift ;;
    -h|--help)
      sed -n '2,26p' "$0" | sed 's/^#//'
      exit 0 ;;
    *) echo "[警告] 忽略未知参数：$1" >&2; shift ;;
  esac
done

# ================================================================ 项目校验
for f in game.js game.json project.config.json upload.js node-android-fix.js; do
  [ -f "$PROJECT_DIR/$f" ] || die "缺少必需文件：$f（目录：$PROJECT_DIR）"
done

# ================================================================ 环境
command -v node >/dev/null 2>&1 || die "未安装 node。请执行： pkg install nodejs"

# 代理是「连上服务器后卡住」的常见原因，直接清掉
unset http_proxy https_proxy all_proxy HTTP_PROXY HTTPS_PROXY ftp_proxy FTP_PROXY 2>/dev/null || true
export NODE_OPTIONS="--dns-result-order=ipv4first ${NODE_OPTIONS:-}"

# 临时目录放到真实文件系统，避免 /storage 上写临时文件卡住
TMPDIR="$HOME/.wx-tmp"
mkdir -p "$TMPDIR" 2>/dev/null || true
export TMPDIR

# ================================================================ appid
APPID="${WX_APPID:-}"
if [ -z "$APPID" ]; then
  APPID="$(sed -n 's/.*"appid"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
          "$PROJECT_DIR/project.config.json" 2>/dev/null | head -n1)"
fi
[ -n "$APPID" ] || die "project.config.json 里没有 appid，请填写或设置 WX_APPID"

# ================================================================ 私钥
KEY="${WX_KEY_PATH:-}"
if [ -z "$KEY" ]; then
  if [ -f "$PROJECT_DIR/private.$APPID.key" ]; then
    KEY="$PROJECT_DIR/private.$APPID.key"
  else
    for k in "$PROJECT_DIR"/private.*.key; do
      [ -f "$k" ] && { KEY="$k"; break; }
    done
  fi
fi
[ -n "$KEY" ] && [ -f "$KEY" ] || die "找不到上传私钥。请放到项目根目录并命名为 private.$APPID.key"

# ================================================================ 版本号
[ -n "$WX_VERSION" ] || WX_VERSION="1.0.$(date +%m%d%H%M)"
ROBOT="${WX_ROBOT:-1}"

# ================================================================ 复制到真实文件系统
EXCLUDE="upload.js upload.sh upload-auto.sh upload-proot.sh backup.sh node-android-fix.js forktest.js forkchild.js diagnose.sh nettest.sh node_modules backup .git .wx-tmp"

is_excluded() {
  local name="$1" e
  for e in $EXCLUDE; do
    [ "$name" = "$e" ] && return 0
  done
  case "$name" in README*|.gitignore|*.key) return 0 ;; esac
  return 1
}

DEST="${WX_HOME_PROJECT:-$HOME/wx-upload/WeChatGame}"

if [ "$INPLACE" = "1" ] || [ "$PROJECT_DIR" = "$DEST" ]; then
  RUN_DIR="$PROJECT_DIR"
  [ "$INPLACE" = "1" ] && echo "[提示] --inplace：直接在项目目录运行，若卡死请去掉该参数。"
else
  echo "正在复制项目到真实文件系统（绕开 /storage 死锁）..."
  mkdir -p "$DEST" || die "无法创建 $DEST"
  cd "$PROJECT_DIR" || die "无法进入 $PROJECT_DIR"
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
  RUN_DIR="$DEST"
fi

for f in game.js game.json project.config.json; do
  [ -f "$RUN_DIR/$f" ] || die "运行目录缺少必需文件：$f"
done

# ================================================================ 可选联网预检（默认关闭）
if [ "$DO_NETCHECK" = "1" ]; then
  if command -v timeout >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
    echo "联网预检（最多 8 秒，超时自动跳过）..."
    CODE="$(timeout 8 curl -sS --connect-timeout 5 -m 8 -o /dev/null -w '%{http_code}' \
            https://servicewechat.com/ 2>/dev/null || true)"
    if [ -z "$CODE" ] || [ "$CODE" = "000" ]; then
      echo "  [警告] 连不上微信服务器，仍会继续尝试上传。"
    else
      echo "  OK（HTTP $CODE）"
    fi
  else
    echo "  [跳过] 没有 timeout/curl，无法预检。"
  fi
  echo ""
fi

# ================================================================ 概览
echo "============================================================"
echo " 项目目录 : $PROJECT_DIR"
echo " 运行目录 : $RUN_DIR"
echo " AppID    : $APPID"
echo " 私钥     : $(basename "$KEY")"
echo " 版本号   : $WX_VERSION"
[ -n "$WX_DESC" ] && echo " 描述     : $WX_DESC"
echo " 机器人   : $ROBOT"
echo " 超时     : ${WX_MAX_WAIT}s"
echo "============================================================"

# ================================================================ 执行器
LOG="$TMPDIR/upload.$$.log"
: > "$LOG" 2>/dev/null || LOG="/dev/null"

kill_tree() {
  local p="$1" i=0
  [ -n "$p" ] || return 0
  kill -TERM "$p" 2>/dev/null || true
  while [ "$i" -lt 3 ] && kill -0 "$p" 2>/dev/null; do
    sleep 1
    i=$((i + 1))
  done
  kill -0 "$p" 2>/dev/null && kill -KILL "$p" 2>/dev/null || true
  command -v pkill >/dev/null 2>&1 && pkill -KILL -P "$p" 2>/dev/null || true
  return 0
}

# 只认 upload.js 真正打印的那一行，避免误判
has_success_marker() {
  grep -qF '上传成功！' "$LOG" 2>/dev/null
}

# 按字节偏移流式输出：即使最后一行没有换行符也能立刻看到
OFFSET=1
stream_log() {
  local size
  size=$(wc -c < "$LOG" 2>/dev/null | tr -d ' \n')
  [ -n "$size" ] || size=0
  if [ "$size" -ge "$OFFSET" ]; then
    tail -c +"$OFFSET" "$LOG" 2>/dev/null || true
    OFFSET=$((size + 1))
  fi
}

( cd "$RUN_DIR" || exit 1; exec env \
    WX_PROJECT_PATH="$RUN_DIR" \
    WX_APPID="$APPID" \
    WX_KEY_PATH="$KEY" \
    WX_VERSION="$WX_VERSION" \
    WX_DESC="$WX_DESC" \
    WX_ROBOT="$ROBOT" \
    TMPDIR="$TMPDIR" \
    node "$PROJECT_DIR/upload.js" ) >"$LOG" 2>&1 &
PID=$!

echo " node pid : $PID"
echo " 日志     : $LOG"
echo ""
echo "开始上传..."
echo ""

WAITED=0
STALL=0
LAST_SIZE=0
GRACE=0
FORCED=0

while kill -0 "$PID" 2>/dev/null; do
  sleep 2
  WAITED=$((WAITED + 2))
  stream_log

  # 命中成功标志：等它自己退出，最多 10 秒，然后才强杀
  if [ "$GRACE" = "0" ] && has_success_marker; then
    echo ""
    echo "[确认] 已看到「上传成功！」，等待 Node 自然退出（最多 10 秒）..."
    GRACE=1
  fi

  if [ "$GRACE" = "1" ]; then
    if [ "$GRACE" -ge 5 ] && kill -0 "$PID" 2>/dev/null; then
      echo "[解卡] Node 未自行退出，强制结束挂起进程。"
      kill_tree "$PID"
      FORCED=1
      break
    fi
    GRACE=$((GRACE + 1))
    continue
  fi

  # 无进度提示
  CUR_SIZE=$(wc -c < "$LOG" 2>/dev/null | tr -d ' \n'); CUR_SIZE=${CUR_SIZE:-0}
  if [ "$CUR_SIZE" -gt "$LAST_SIZE" ]; then
    LAST_SIZE=$CUR_SIZE
    STALL=0
  else
    STALL=$((STALL + 2))
    if [ "$STALL" = "60" ]; then
      echo ""
      echo "[提示] 已经 60 秒没有任何新输出，可能卡在子进程 fork 上。"
      echo "       可以再等等，或 Ctrl+C 后改用 proot 环境上传。"
      echo ""
    fi
  fi

  if [ "$WAITED" -ge "$WX_MAX_WAIT" ]; then
    echo ""
    echo "[超时] 已等待 ${WX_MAX_WAIT}s 仍未完成，强制结束。"
    kill_tree "$PID"
    FORCED=1
    break
  fi
done

wait "$PID" 2>/dev/null
RC=$?

stream_log
echo ""

# ================================================================ 结果判定
if has_success_marker; then
  STATUS=0
elif [ "$RC" = "0" ] && [ "$FORCED" = "0" ]; then
  STATUS=0
else
  STATUS=1
fi

echo ""
echo "============================================================"
if [ "$STATUS" = "0" ]; then
  echo "✅ 完成：版本 $WX_VERSION（AppID $APPID）"
  echo ""
  echo "查看：用 AppID 为 $APPID 的小游戏账号登录 https://mp.weixin.qq.com"
  echo "      → 管理 → 版本管理 → 开发版本"
  echo ""
  echo "看不到时检查："
  echo "  1. 登录的是不是同一个 AppID（小游戏与小程序后台是分开的）"
  echo "  2. 同一 机器人+版本号 会覆盖旧开发版本，不是新增"
  echo "  3. 换个版本号验证： bash upload.sh -v 9.9.9"
else
  echo "❌ 上传失败（退出码 $RC，强制结束=$FORCED）"
  echo "完整日志：$LOG"
  echo ""
  echo "常见原因："
  echo "  · 连接超时 / socket hang up → 关代理、换网络"
  echo "  · bad ELF magic / EPIPE → node-android-fix.js 未生效"
  echo "  · 卡在 forkProcess → 改用 proot 环境上传"
  echo "  · 80082 / 无权限 / invalid ip → 私钥与 AppID 不匹配或已失效"
fi
echo "============================================================"

exit "$STATUS"
