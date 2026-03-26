$pidFile = Join-Path $env:TEMP "cen3031-teamproject-frontend.pid"
$browserPidFile = Join-Path $env:TEMP "cen3031-teamproject-browser.pid"
$browserProfileDir = Join-Path $env:TEMP "cen3031-teamproject-browser-profile"

if (-not (Test-Path $pidFile)) {
  Remove-Item $browserPidFile -ErrorAction SilentlyContinue
  Remove-Item $browserProfileDir -Recurse -Force -ErrorAction SilentlyContinue
  exit 0
}

$frontendPid = (Get-Content $pidFile | Select-Object -First 1).Trim()

if ($frontendPid -match "^\d+$") {
  taskkill /PID $frontendPid /T /F | Out-Null
}

if (Test-Path $browserPidFile) {
  $browserPid = (Get-Content $browserPidFile | Select-Object -First 1).Trim()
  if ($browserPid -match "^\d+$") {
    taskkill /PID $browserPid /T /F | Out-Null
  }
}

Remove-Item $pidFile -ErrorAction SilentlyContinue
Remove-Item $browserPidFile -ErrorAction SilentlyContinue
Remove-Item $browserProfileDir -Recurse -Force -ErrorAction SilentlyContinue
