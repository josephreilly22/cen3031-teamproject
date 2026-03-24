$frontend = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\src\frontend"))
$pidFile = Join-Path $PSScriptRoot "frontend.pid"

$listener = netstat -ano | Select-String "LISTENING" | Select-String ":3000"
if ($listener) {
  $existingPid = (($listener | Select-Object -First 1).ToString() -split "\s+")[-1]
  if ($existingPid -match "^\d+$") {
    taskkill /PID $existingPid /F | Out-Null
    Start-Sleep -Seconds 1
  }
}

$process = Start-Process cmd.exe -PassThru -WindowStyle Hidden -WorkingDirectory $frontend -ArgumentList @(
  "/c",
  "set PORT=3000 && npm start"
)

$process.Id | Set-Content $pidFile
