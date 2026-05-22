# Node.js 64-bit — evita erro do better-sqlite3 (módulo compilado para arquitetura errada)
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
Node.js 64-bit (versão 18 ou superior) é necessário para o backend.
Instale em https://nodejs.org/ (LTS, Windows 64-bit) e execute novamente.
'@
}

$nodeDir = Get-Node64Dir
$root = Split-Path $PSScriptRoot -Parent
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

$db = Join-Path $root 'backend\data\jaboque.db'
if (-not (Test-Path $db)) {
    Write-Host 'Banco não encontrado. Executando seed...' -ForegroundColor Yellow
    npm run seed --prefix backend
}

npm rebuild better-sqlite3 --prefix backend 2>$null
npm run dev --prefix backend
