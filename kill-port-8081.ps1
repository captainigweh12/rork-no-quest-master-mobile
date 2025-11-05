# PowerShell script to kill process on port 8081
Write-Host "Finding process on port 8081..." -ForegroundColor Yellow

$process = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1

if ($process) {
    Write-Host "Found process: PID $process" -ForegroundColor Cyan
    Write-Host "Killing process..." -ForegroundColor Red
    Stop-Process -Id $process -Force
    Write-Host "Process killed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run: npm run backend" -ForegroundColor Yellow
} else {
    Write-Host "No process found on port 8081" -ForegroundColor Red
}
