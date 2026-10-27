<#
  一键推到 GitHub（自动在 SSH / HTTPS 之间选择），并给出 Pages 地址。

  用法：
    .\deploy-github.ps1 -Repo 你的账号/仓库名
  例：
    .\deploy-github.ps1 -Repo yifan/touch-typing

  前置：仓库已在 github.com 创建（空仓库，Public，不勾 README/gitignore/license）。
#>
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if ($Repo -notmatch '^[^/]+/[^/]+$') {
  throw "Repo 需要形如 账号/仓库名，例如 yifan/touch-typing"
}
$user = $Repo.Split('/')[0]
$name = $Repo.Split('/')[1]

Write-Host "==> 检查工作区" -ForegroundColor Cyan
if (git status --porcelain) {
  git add -A
  git commit -m "chore: update before deploy" | Out-Null
  Write-Host "    已提交未入库改动" -ForegroundColor Cyan
}

# SSH 22 到 GitHub 通常可用；密钥已注册则优先用 SSH，避免 HTTPS 凭据问题
$sshProbe = (ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 | Out-String)
if ($sshProbe -match 'successfully authenticated') {
  $url = "git@github.com:$Repo.git"
  Write-Host "==> 走 SSH（$url）" -ForegroundColor Cyan
} else {
  $url = "https://github.com/$Repo.git"
  Write-Host "==> SSH 密钥未授权，退回 HTTPS（首次推送会弹 GitHub 登录窗口）" -ForegroundColor Yellow
}

if ((git remote) -contains $Remote) { git remote remove $Remote }
git remote add $Remote $url

Write-Host "==> 推送 main" -ForegroundColor Cyan
git push -u $Remote main

Write-Host "==> 确认远端已收到" -ForegroundColor Cyan
git ls-remote --heads $Remote main

Write-Host ""
Write-Host "推送完成。仓库里的 CI workflow 会自动开启 Pages 并部署，通常 1-2 分钟。" -ForegroundColor Green
Write-Host "届时访问： https://$user.github.io/$name/" -ForegroundColor Green
Write-Host "进度： https://github.com/$Repo/actions" -ForegroundColor Gray
Start-Process "https://github.com/$Repo/actions"
