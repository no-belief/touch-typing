# 部署交接单（GitHub Pages）

## 现在的状态

| 项 | 状态 |
|---|---|
| 站点代码 | 完成，`node tools/selftest.mjs` 93 条断言全绿 |
| 本机链接 | **可用** http://127.0.0.1:5173/ |
| 局域网链接 | **可用** http://10.2.180.167:5173/ |
| 本地 git 仓库 | **已建好**，分支 `main`，首次提交 `ffdb50f`，工作区干净 |
| 公网链接 | **待你执行最后一步 push** |

## 为什么最后一步必须你来做

本会话的进程拿不到系统 TLS 凭据，任何出网 HTTPS 都失败；SSH 端口虽通，但本机两个密钥都没注册到你的 GitHub。实测：

```
git ls-remote https://github.com/git/git.git
  fatal: unable to access ...: schannel: AcquireCredentialsHandle failed:
  SEC_E_NO_CREDENTIALS (0x8009030e)
ssh -i id_ed25519 -T git@github.com   -> Permission denied (publickey)
ssh -i id_rsa     -T git@github.com   -> Permission denied (publickey)
```

## 三步拿到公网链接

### 第 1 步：建一个空仓库（浏览器，30 秒）
打开 https://github.com/new
- Repository name: `touch-typing`
- **Public**（免费账号的 Pages 需要公开仓库）
- **不要**勾选 Add a README / .gitignore / license（勾了会导致推送冲突）

### 第 2 步：推代码（在你自己的 PowerShell 里，不是 DSH 里）

方式一，用本目录已备好的脚本：
```powershell
cd "C:\Users\yfd\Desktop\盲打训练"
.\deploy-github.ps1 -Repo 你的账号/touch-typing
```

方式二，手敲三条：
```powershell
cd "C:\Users\yfd\Desktop\盲打训练"
git remote add origin https://github.com/你的账号/touch-typing.git
git push -u origin main
```

首次推送会弹出 GitHub 登录窗口（Git Credential Manager），浏览器授权一次即可。

### 第 3 步：开启 Pages（一次性）
打开 `https://github.com/你的账号/touch-typing/settings/pages`
- Source: **Deploy from a branch**
- Branch: **main** / 目录 **/(root)** → **Save**

约 1 分钟后访问：

```
https://你的账号.github.io/touch-typing/
```

## 想要更短的地址

把仓库名改成 `你的账号.github.io` 再推送，地址就是 `https://你的账号.github.io/`（一个账号只能有一个这样的仓库）。

## 另一个可选路径（想让我直接推）

本机 SSH 端口到 GitHub 是通的，只是密钥没被授权。你若愿意：
1. 把 `%USERPROFILE%\.ssh\id_ed25519.pub` 的内容加到 https://github.com/settings/keys
2. 建好空仓库后把 `账号/仓库名` 告诉我

我就能在本会话里直接完成 push（注意：该密钥会因此获得你账号的仓库写权限，这是它的作用范围）。

## 上线后必须确认的一条

打开公网地址，**按一下键盘看有没有字符被判定**——验收标准就是"打开即可练习、能准确判对错"。站内一切路径都是相对路径，放在 `/仓库名/` 子路径下也能正常工作（已核查 index.html 无任何绝对路径引用）。
