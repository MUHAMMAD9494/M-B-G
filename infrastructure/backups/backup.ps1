# NEXORA - PostgreSQL backup script (delete-free retention)
# Dumps the nexora-postgres container database to output/ as gzip'd SQL.
# Retention: keeps the newest $RetainCount dumps in output/; older dumps are
# MOVED to output/archive/ (never deleted by this script). Manual purge of the
# archive is documented in BACKUP_RUNBOOK.md.
# Usage:  powershell -ExecutionPolicy Bypass -File backup.ps1 [-OffloadDir C:\backups]
param(
  [string]$OffloadDir = ""
)
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputDir = Join-Path $Root 'output'
$ArchiveDir = Join-Path $OutputDir 'archive'
$LogFile = Join-Path $Root 'backup.log'
$RetainCount = 14

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

function Write-Log($msg) {
  $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Output $line
  Add-Content -Path $LogFile -Value $line
}

Write-Log '--- backup start ---'

# 1. Dump inside the container, gzip to a host path via docker cp (byte-safe)
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dumpInContainer = "/tmp/nexora_$stamp.sql.gz"
$localRaw = Join-Path $OutputDir "nexora-postgres_$stamp.sql.gz"
$localFinal = Join-Path $OutputDir "nexora-postgres_$stamp.sql.gz"

docker exec nexora-postgres sh -c "pg_dump -U nexora -d nexora -Fp -c | gzip -9 > $dumpInContainer"
if ($LASTEXITCODE -ne 0) { throw "pg_dump inside container failed (exit $LASTEXITCODE)" }

# 1b. Integrity check inside the container (gzip present there), BEFORE copy
# (the container temp file stays in /tmp - ephemeral, cleared on container restart)
docker exec nexora-postgres gzip -t $dumpInContainer
if ($LASTEXITCODE -ne 0) {
  Write-Log "INTEGRITY FAIL: gzip -t rejected the dump in-container - keeping file for inspection, marking run FAILED"
  exit 1
}
Write-Log "integrity ok (gzip -t in container)"

docker cp "nexora-postgres:$dumpInContainer" $localRaw
if ($LASTEXITCODE -ne 0) { throw "docker cp failed (exit $LASTEXITCODE)" }

$size = (Get-Item $localRaw).Length
Write-Log "backup written: $localRaw ($size bytes)"

# 3. Retention: retire (move) all but the newest $RetainCount dumps in output/
$all = Get-ChildItem -Path $OutputDir -Filter 'nexora-postgres_*.sql.gz' -File |
  Sort-Object Name -Descending
$toRetire = @($all | Select-Object -Skip $RetainCount)
foreach ($f in $toRetire) {
  $dest = Join-Path $ArchiveDir $f.Name
  Move-Item -Path $f.FullName -Destination $dest -Force
  Write-Log "retired (moved to archive): $($f.Name)"
}

# 4. Optional offload copy (copy only - no deletes anywhere)
if ($OffloadDir) {
  New-Item -ItemType Directory -Force -Path $OffloadDir | Out-Null
  Copy-Item -Path $localFinal -Destination (Join-Path $OffloadDir (Split-Path $localFinal -Leaf)) -Force
  Write-Log "offload copy: $OffloadDir"
}

Write-Log '--- backup complete ---'
Write-Output "BACKUP_OK $localFinal"