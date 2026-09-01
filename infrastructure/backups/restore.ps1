# ============================================================
# Nexora Smart Edu — PostgreSQL restore script
# ============================================================
# Restores a backup created by backup.ps1 (or any compatible
# `nexora-postgres_*.sql.gz` plain-SQL gzip dump) into the running
# `nexora-postgres` container / `nexora` database.
#
# SAFETY:
#  - Refuses to do anything unless -Force is passed.
#  - Prints every warning first and asks for explicit confirmation.
#  - By default restores the NEWEST backup in infrastructure/backups/output/;
#    pass -BackupFile to pick a specific file.
#
# Usage:
#   .\restore.ps1 -WhatIf                        # preview, does nothing
#   .\restore.ps1 -Force                         # newest backup
#   .\restore.ps1 -BackupFile .\output\nexora-postgres_20260101_030000.sql.gz -Force
# ============================================================

param(
    [string]$BackupFile,
    [switch]$Force,
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

$OutputDir = Join-Path $PSScriptRoot 'output'
$Container = 'nexora-postgres'
$DbUser    = 'nexora'
$DbName    = 'nexora'

# ---- resolve the backup file ---------------------------------------------
if (-not $BackupFile) {
    $candidates = @(Get-ChildItem -Path $OutputDir -Filter 'nexora-postgres_*.sql.gz' -File |
        Sort-Object Name -Descending)
    if ($candidates.Count -eq 0) {
        Write-Host "ERROR: no backups found in $OutputDir" -ForegroundColor Red
        Write-Host 'Run backup.ps1 first, or pass -BackupFile <path>.'
        exit 1
    }
    $BackupFile = $candidates[0].FullName
}

if (-not (Test-Path -Path $BackupFile)) {
    Write-Host "ERROR: backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# ---- sanity checks --------------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'ERROR: docker CLI not found on PATH.' -ForegroundColor Red
    exit 1
}

$running = docker ps --filter "name=^/${Container}$" --format '{{.Names}}'
if (-not $running) {
    Write-Host "ERROR: container '${Container}' is not running." -ForegroundColor Red
    Write-Host '       Start it first:  docker compose -f infrastructure/docker/docker-compose.dev.yml up -d'
    exit 1
}

# ---- warnings + confirmation ----------------------------------------------
$sizeMB = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)

Write-Host ''
Write-Host '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!' -ForegroundColor Yellow
Write-Host '!!  DESTRUCTIVE OPERATION — DATABASE RESTORE                  !!' -ForegroundColor Yellow
Write-Host '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!' -ForegroundColor Yellow
Write-Host ''
Write-Host "  Container : $Container"
Write-Host "  Database   : $DbName (user $DbUser)"
Write-Host "  Backup     : $BackupFile ($sizeMB MB)"
Write-Host ''
Write-Host '  WARNING: existing data in the target database will be replaced'
Write-Host '  by the contents of this backup (pg_dump -c drops objects first).'
Write-Host '  Stop the API/web apps before restoring. Consider a fresh backup'
Write-Host '  of the CURRENT state before proceeding (run backup.ps1).'
Write-Host ''

if ($WhatIf) {
    Write-Host '[WhatIf] Confirmation skipped — this is a dry run. Nothing was changed.' -ForegroundColor Cyan
    Write-Host "[WhatIf] Would restore: $BackupFile"
    exit 0
}

if (-not $Force) {
    Write-Host 'REFUSED: restore requires -Force (this is intentional safety).' -ForegroundColor Red
    Write-Host 'Rerun with  .\restore.ps1 -BackupFile <path> -Force   after you have'
    Write-Host 'confirmed the warnings above and stopped the running apps.'
    exit 1
}

$confirm = Read-Host "Type 'restore' to confirm you want to replace the database"
if ($confirm -ne 'restore') {
    Write-Host 'Cancelled — no changes made.' -ForegroundColor Yellow
    exit 1
}

Write-Host ''
Write-Host "Restoring $BackupFile ..." -ForegroundColor Green

# ---- restore (byte-safe: copy file into container, decompress, apply) -----
$RemotePath = '/tmp/nexora_restore.sql.gz'

docker cp $BackupFile "${Container}:${RemotePath}"
if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: docker cp of the backup into the container failed.' -ForegroundColor Red
    exit 1
}

docker exec $Container sh -c "gzip -dc $RemotePath | psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1"
$exit = $LASTEXITCODE

if ($exit -ne 0) {
    Write-Host "ERROR: psql restore failed (exit $exit). See output above." -ForegroundColor Red
    Write-Host "A leftover copy remains at ${Container}:${RemotePath} for inspection; remove it manually."
    exit $exit
}

Write-Host 'Restore completed successfully.' -ForegroundColor Green
Write-Host 'Verify next:'
Write-Host '  1) GET /api/v1/health/database  ->  { database: "connected" }'
Write-Host '  2) Spot-check row counts (users, teachers, attendance events).'
Write-Host '  3) Restart API + web.'
Write-Host '  4) Run a manual login + attendance check-in.'
exit 0