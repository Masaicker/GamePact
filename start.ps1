# GamePact One-Click Start Script (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GamePact - One Click Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Root directory (where this script is located)
$rootDir = $PSScriptRoot

# Backend / Frontend directories
$backendDir  = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

# Validate directories
if (-not (Test-Path $backendDir)) {
    Write-Host "ERROR: Backend directory not found:" -ForegroundColor Red
    Write-Host $backendDir -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendDir)) {
    Write-Host "ERROR: Frontend directory not found:" -ForegroundColor Red
    Write-Host $frontendDir -ForegroundColor Red
    exit 1
}

# Start backend
Write-Host "[1/2] Starting backend service..." -ForegroundColor Yellow

Start-Process cmd `
    -WorkingDirectory $backendDir `
    -ArgumentList "/k npx tsx src/server.ts" `
    -WindowStyle Normal

Write-Host "Waiting for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Start frontend
Write-Host "[2/2] Starting frontend service..." -ForegroundColor Yellow

Start-Process cmd `
    -WorkingDirectory $frontendDir `
    -ArgumentList "/k npm run dev" `
    -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Services started successfully!" -ForegroundColor Green
Write-Host "  Backend : http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Open browser
Start-Process "http://localhost:5173"

Write-Host "Launcher finished. Closing in 2 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 2
exit
