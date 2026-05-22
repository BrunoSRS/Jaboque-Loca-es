# Sobe backend + frontend com Node 64-bit (Windows)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
npx concurrently `
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-backend.ps1" `
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-frontend.ps1"
