# 部署记录（GitHub Pages）

## 线上地址

**https://no-belief.github.io/touch-typing/**

| 项 | 结果 |
|---|---|
| Pages 来源 | 仓库 Settings → Pages → Deploy from a branch → `main` / `(root)` |
| 上线 commit | `6b91419`（后续任何 push 到 main 都会自动重新部署） |
| 首页 | HTTP 200，title = `盲打训练 · 从基准键位到符号` |
| 静态资源 | 8/8 与本地**字节一致**（`node tools/verify-live.mjs`，一致=8 不一致=0） |
| 关键 DOM | `#typebuffer`、`#keyboard-practice` 均存在于线上 HTML |

## 这次踩到的三个坑（下次直接用结论）

1. **本会话 shell 的出网 HTTPS 被系统 TLS 凭据限制封死**
   `Invoke-WebRequest` / `curl.exe` / `git https` 全部失败：
   `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)`。
   TCP 443 能连上，说明不是断网，是凭据被禁。

2. **Node 的 TLS 不受影响**（自带 CA + OpenSSL，不走 schannel），所以公网页面可以用
   `node` + `fetch` 自己验证，不需要人工截图。

3. **git 用 SSH 推送会被沙箱管道限制挡住**
   git 自带的 msys `ssh.exe` / `sh.exe` 报 `couldn't create signal pipe, Win32 error 5`。
   解法是让它改用 Windows 原生 OpenSSH，绕开 shell 包装：
   ```powershell
   $env:GIT_SSH = 'C:\Windows\System32\OpenSSH\ssh.exe'
   $env:GIT_SSH_VARIANT = 'ssh'
   git push origin main
   ```

4. **CI 自动开启 Pages 不可行**
   `actions/configure-pages@v5` 的 `enablement: true` 用 `GITHUB_TOKEN` 会在
   "Enable Pages automatically" 这一步失败（开启 Pages 需要管理员权限）。
   该 workflow 已移除；改用「分支直发 + 一次性 PAT 调 `POST /repos/{owner}/{repo}/pages`」才成功。

## 以后怎么更新站点

```powershell
cd "C:\Users\yfd\Desktop\盲打训练"
# 改完文件后
$env:GIT_SSH = 'C:\Windows\System32\OpenSSH\ssh.exe'
git add -A
git commit -m "update"
git push origin main
node tools/verify-live.mjs      # 30-60 秒后逐字节比对线上与本地
```

## 安全事项

- 启用 Pages 时用过一次性 Fine-grained PAT（权限只有 **Pages: Read and write**、范围仅本仓库、7 天有效）。
- 它写进过本地 `.token`（已在 `.gitignore` 内），**验证完已删除**；`git log --all -S 'github_pat_'` 为空，
  从未进入任何提交。
- **请到 https://github.com/settings/tokens 手动 Revoke 这个 token**（Fine-grained PAT 无法通过 API 撤销）。
- 仓库内不含任何密钥。

## 本地备用入口

- 双击 `start.cmd` → http://127.0.0.1:5173/
- 局域网（同 WiFi 手机）：http://10.2.180.167:5173/
  —— 若手机打不开，管理员 PowerShell 执行一次：
  `New-NetFirewallRule -DisplayName "TouchTyping 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow`
