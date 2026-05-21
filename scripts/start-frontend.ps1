# Usa Node.js 64-bit (v18+) — evita conflito entre npm 32-bit e Vite/Rollup 64-bit
$ErrorActionPreference = 'Stop'

function Get-Node64Dir {
    $candidates = @(
        'C:\Program Files\nodejs',
        (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\resources\helpers')
    )
    foreach ($dir in $candidates) {
        $node = Join-Path $dir 'node.exe'
        if (-not (Test-Path $node)) { continue }
        $arch = & $node -p 'process.arch' 2>$null
        if ($arch -eq 'x64') { return $dir }
    }
    throw @'
Node.js 64-bit (versão 18 ou superior) é necessário para o frontend.
Instale em https://nodejs.org/ (LTS, Windows 64-bit) e execute novamente.
'@
}

$nodeDir = Get-Node64Dir
$root = Split-Path $PSScriptRoot -Parent

# Node 64-bit primeiro; npm continua disponível via instalação em Program Files (x86)
$npmDir = 'C:\Program Files (x86)\nodejs'
$pathTail = ($env:PATH -split ';' | Where-Object {
    $_ -and $_ -notmatch '(?i)\\nodejs\\?' -and $_ -notmatch '(?i)cursor\\resources\\app\\resources\\helpers'
}) -join ';'
$env:PATH = "$nodeDir;$npmDir;$pathTail"

Set-Location $root
$nodeExe = Join-Path $nodeDir 'node.exe'
$ver = & $nodeExe -p 'process.version'
$arch = & $nodeExe -p 'process.arch'
Write-Host "Node: $ver $arch" -ForegroundColor DarkGray
npm run dev --prefix frontend
