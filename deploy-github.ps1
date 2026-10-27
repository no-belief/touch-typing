<#
  一键推到 GitHub 并给出 Pages 地址。
  用法（在资源管理器中右键「使用 PowerShell 运行」等价于在本目录执行）：

    .\deploy-github.ps1 -Repo 你的账号/仓库名

  例：.\deploy-github.ps1 -Repo yifan/touch-typing
  前置：仓库必须已在 github.com 上创建（空仓库，不要勾 README/gitignore/license）。
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
$dirty = git status --porcelain
if ($dirty) {
  Write-Host "==> 有未提交改动，先提交" -ForegroundColor Cyan
  git add -A
  git commit -m "chore: update before deploy"
}

Write-Host "==> 配置远端 $Remote -> https://github.com/$Repo.git" -ForegroundColor Cyan
$existing = git remote
if ($existing -contains $Remote) { git remote remove $Remote }
git remote add $Remote "https://github.com/$Repo.git"

Write-Host "==> 推送 main（首次会弹出 GitHub 登录窗口，用浏览器授权即可）" -ForegroundColor Cyan
git push -u $Remote main

Write-Host ""
Write-Host "推送完成。还需一次性开启 Pages：" -ForegroundColor Green
Write-Host "  1) 打开下面的页面"
Write-Host "  2) Source 选 'Deploy from a branch'"
Write-Host "  3) Branch 选 main，目录选 /(root)，点 Save"
Write-Host "  4) 等 1 分钟左右，访问 https://$user.github.io/$name/"
Write-Host ""
Start-Process "https://github.com/$Repo/settings/pages"
