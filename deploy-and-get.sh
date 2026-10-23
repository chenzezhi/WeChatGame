#!/usr/bin/env bash
# ==============================================================================
# 微信小游戏一键全自动部署、推送、等待与二维码拉取脚本
# ==============================================================================
set -e

REPO="chenzezhi/WeChatGame"
TOKEN="${GITHUB_TOKEN:-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}"

echo "================================================================"
echo "[0/5] 预检与清理潜在的 Git 残留状态..."
echo "================================================================"
if [ -d ".git/rebase-merge" ]; then
  echo "清理残留的 rebase-merge 目录..."
  rm -fr ".git/rebase-merge"
fi
if [ -d ".git/rebase-apply" ]; then
  echo "清理残留的 rebase-apply 目录..."
  rm -fr ".git/rebase-apply"
fi

echo ""
echo "================================================================"
echo "[1/5] 检查本地 Git 状态并暂存改动..."
echo "================================================================"
git add .

if git diff-index --quiet HEAD --; then
  echo "提示：当前没有检测到新的代码改动，将直接尝试拉取最新预览二维码..."
else
  echo "请输入本次提交的说明 (Commit message，直接回车默认用 'auto: 自动提交更新'):"
  read -r commit_msg
  if [ -z "$commit_msg" ]; then
    commit_msg="auto: 自动提交更新"
  fi
  git commit -m "$commit_msg"
fi

echo ""
echo "================================================================"
echo "[2/5] 同步远程仓库 (使用 rebase 变基合并)..."
echo "================================================================"
git pull --rebase origin main || {
  echo "[错误] 自动 rebase 遇到冲突，请手动解决后再次运行。"
  exit 1
}

echo ""
echo "================================================================"
echo "[3/5] 推送代码到 GitHub 远程仓库..."
echo "================================================================"
git push origin main
echo "✨ 推送成功！GitHub Actions 正在云端为你编译并生成预览二维码..."

echo ""
echo "================================================================"
echo "[4/5] 等待云端构建 (预计等待 60 秒)..."
echo "================================================================"
for i in {60..1}; do
  echo -n "$i... "
  sleep 1
done

bash get-qr.sh