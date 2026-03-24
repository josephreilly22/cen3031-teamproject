$pidFile = Join-Path $PSScriptRoot "frontend.pid"

if (-not (Test-Path $pidFile)) {
  exit 0
}

$frontendPid = (Get-Content $pidFile | Select-Object -First 1).Trim()

if ($frontendPid -match "^\d+$") {
  taskkill /PID $frontendPid /T /F | Out-Null
}

Remove-Item $pidFile -ErrorAction SilentlyContinue
