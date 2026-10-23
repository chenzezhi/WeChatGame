# backup/ 版本备份目录

**规矩：覆盖任何文件之前，先跑 `bash backup.sh`。每个文件在 `backup/` 下有自己的子目录，保留最近 3 个版本。**

## 目录结构

```
backup/
  upload.js/
    v1.bak      ← 最近一次备份（= 上次覆盖前的内容）
    v2.bak
    v3.bak      ← 更早，写第 4 次时被丢弃
  upload.sh/
    v1.bak ...
  project.config.json/
    v1.bak ...
```

编号越小越新；`v1` 永远等于「某次覆盖前的内容」。

## 备份

```bash
bash backup.sh                      # 备份默认清单（脚本 + 游戏文件 + .gitignore）
bash backup.sh upload.js            # 只备份一个文件
bash backup.sh get-qr.sh            # 备份二维码脚本
KEEP=5 bash backup.sh               # 每个文件保留 5 版
bash backup.sh --list               # 看现有备份和大小/时间
```

## 回滚

```bash
bash backup.sh --restore upload.js      # 回到 v1
bash backup.sh --restore upload.js 2    # 回到 v2
bash backup.sh --restore get-qr.sh      # 回到 v1
```

回滚时脚本会**先把当前内容也存一版 v1**，所以回滚本身也可回滚。`.sh` 文件回滚后会自动补执行权限。

手动回滚等价于：

```bash
cp backup/get-qr.sh/v1.bak get-qr.sh
chmod +x get-qr.sh
```

## 已排除，不会被上传

| 位置 | 排除项 |
| --- | --- |
| `upload.js` | `ignores: 'backup/**/*'` |
| `project.config.json` | `packOptions.ignore: { type: folder, value: backup }` |
| `.gitignore` | `backup/` |

## 历史遗留的旧命名备份

目录里如果还有 `upload.js.bak`、`upload.sh.bak`、`project.config.json.v1.bak` 这类**平铺的旧命名文件**，那是早期版本留下的，`backup.sh` 不会自动轮转它们。需要时手动并入新结构：

```bash
mkdir -p backup/upload.sh
mv backup/upload.sh.bak backup/upload.sh/v1.bak
```

> 注意：旧文件 `backup/upload.sh.bak` 里存的是早期的「复制到 $HOME 上传」版本，与当前 `upload.sh`（自动解卡版）不同，保留有参考价值。
