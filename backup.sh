#!/usr/bin/env bash
#
# backup.sh —— 覆盖任何文件之前，先跑一遍这个
#
# 目录结构：
#   backup/
#     upload.js/
#       v1.bak   ← 最近一次备份（= 上次覆盖前的内容）
#       v2.bak
#       v3.bak   ← 更早，超过 KEEP 会被自动丢弃
#     upload.sh/
#       v1.bak ...
#     project.config.json/
#       v1.bak ...
#
# 用法：
#   bash backup.sh                       # 备份默认清单
#   bash backup.sh upload.js game.js     # 只备份指定文件
#   KEEP=5 bash backup.sh                # 每个文件保留 5 版
#   bash backup.sh --list                # 看现有备份
#   bash backup.sh --restore upload.js   # 用 v1 覆盖回 upload.js
#   bash backup.sh --restore upload.js 2 # 用 v2 覆盖回 upload.js
#
# backup/ 已从上传流程与 Git 中排除：
#   · upload.js 的 project.ignores（backup/**/*）
#   · project.config.json 的 packOptions.ignore（folder: backup）
#   · .gitignore（backup/）
#
set -u

SRC="$(cd "$(dirname "$0")" && pwd)"
BK="$SRC/backup"
KEEP="${KEEP:-3}"
mkdir -p "$BK"

DEFAULT_FILES="upload.js upload.sh upload-auto.sh upload-proot.sh node-android-fix.js backup.sh game.js game.json project.config.json .gitignore"

# ---------------------------------------------------------------- 工具
sub_of()   { echo "$BK/$(basename "$1")"; }

rotate() {
  # 传入文件子目录，把 v(N-1)→vN … v1→v2，腾空 v1
  local sub="$1" i from to
  rm -f "$sub/v$KEEP.bak"
  i=$((KEEP - 1))
  while [ "$i" -ge 1 ]; do
    from="$sub/v$i.bak"
    to="$sub/v$((i + 1)).bak"
    [ -f "$from" ] && mv -f "$from" "$to"
    i=$((i - 1))
  done
}

list_all() {
  local found=0 d v
  for d in "$BK"/*/; do
    [ -d "$d" ] || continue
    found=1
    echo "$(basename "$d")/"
    for v in "$d"v*.bak; do
      [ -f "$v" ] || continue
      echo "    $(basename "$v")   $(wc -c < "$v" | tr -d ' ') 字节   $(date -r "$v" '+%Y-%m-%d %H:%M' 2>/dev/null || echo '')"
    done
  done
  [ "$found" = "1" ] || echo "（还没有任何备份，先运行： bash backup.sh）"
}

restore() {
  local name="$1" ver="${2:-1}"
  local sub="$BK/$(basename "$name")"
  local bak="$sub/v$ver.bak"
  local target="$SRC/$(basename "$name")"

  [ -f "$bak" ] || { echo "[错误] 没有这个备份：$bak" >&2; echo "可用备份：" >&2; list_all >&2; exit 1; }

  # 覆盖前先给「现状」也留一版，回滚本身也可回滚
  if [ -f "$target" ]; then
    mkdir -p "$sub"
    rotate "$sub"
    cp -f "$target" "$sub/v1.bak"
    echo "已先把当前 $name 存为 $(basename "$sub")/v1.bak"
  fi

  cp -f "$bak" "$target"
  echo "已回滚： $(basename "$sub")/v$ver.bak  ->  $name"
  case "$name" in *.sh) chmod +x "$target" 2>/dev/null || true; echo "（已补上执行权限）" ;; esac
}

# ---------------------------------------------------------------- 入口
case "${1:-}" in
  --list|-l)
    echo "备份目录：$BK"
    echo ""
    list_all
    exit 0
    ;;
  --restore|-r)
    [ -n "${2:-}" ] || { echo "用法： bash backup.sh --restore <文件名> [版本号]" >&2; exit 2; }
    restore "${2}" "${3:-1}"
    exit 0
    ;;
esac

if [ "$#" -gt 0 ]; then FILES="$*"; else FILES="$DEFAULT_FILES"; fi

echo "备份目录：$BK"
echo "保留    ：每个文件最近 $KEEP 版（v1 最新）"
echo ""

n=0
for f in $FILES; do
  src="$SRC/$f"
  if [ ! -f "$src" ]; then
    echo "  · 跳过（不存在）：$f"
    continue
  fi
  base="$(basename "$f")"
  sub="$BK/$base"
  mkdir -p "$sub"
  rotate "$sub"
  if cp -f "$src" "$sub/v1.bak"; then
    echo "  ✓ $base  ->  backup/$base/v1.bak"
    n=$((n + 1))
  else
    echo "  ✗ 备份失败：$f" >&2
  fi
done

echo ""
echo "完成：$n 个文件已备份。"
echo "查看： bash backup.sh --list"
echo "回滚： bash backup.sh --restore upload.js      # 回到 v1"
echo "      bash backup.sh --restore upload.js 2    # 回到 v2"
