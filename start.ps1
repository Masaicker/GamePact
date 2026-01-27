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

# Load .env configuration
$backendPort = "3001"
$frontendPort = "5173"

# Read backend .env
$backendEnvFile = Join-Path $backendDir ".env"
if (Test-Path $backendEnvFile) {
    Get-Content $backendEnvFile | ForEach-Object {
        if ($_ -match "^PORT=(\d+)") {
            $backendPort = $matches[1]
        }
    }
}

# Read frontend .env
$frontendEnvFile = Join-Path $frontendDir ".env"
if (Test-Path $frontendEnvFile) {
    Get-Content $frontendEnvFile | ForEach-Object {
        if ($_ -match "^VITE_PORT=(\d+)") {
            $frontendPort = $matches[1]
        }
    }
}

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
Write-Host "  Backend : http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:$frontendPort" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Open browser
Start-Process "http://localhost:$frontendPort"

Write-Host "Launcher finished. Closing in 2 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 2
exit
