# GamePact First Time Setup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GamePact - Initialization Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

# --- Backend Setup ---
Write-Host "[1/2] Setting up Backend..." -ForegroundColor Yellow

if (Test-Path $backendDir) {
    Set-Location $backendDir

    # 1. Configure .env with Secure Secret
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Write-Host "  Generating secure configuration..." -ForegroundColor Gray
            
            # 读取模板 (强制 UTF8)
            $envContent = Get-Content ".env.example" -Raw -Encoding UTF8
            
            # 生成 64 字符随机密钥
            $randomSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
            
            # 替换密钥
            $newEnvContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$randomSecret"
            
            # 写入 .env (强制 UTF8)
            Set-Content ".env" $newEnvContent -Encoding UTF8
            
            Write-Host "  Created backend .env with a unique random JWT_SECRET." -ForegroundColor Green
        } else {
            Write-Host "  Warning: .env.example not found!" -ForegroundColor Red
        }
    } else {
        Write-Host "  Backend .env already exists. Skipping." -ForegroundColor Gray
    }

    # 2. Install Dependencies
    Write-Host "  Installing backend dependencies..." -ForegroundColor Gray
    cmd /c "npm install"

    # 3. Setup Database
    Write-Host "  Initializing database..." -ForegroundColor Gray
    cmd /c "npx prisma generate"
    cmd /c "npx prisma migrate dev --name init"
    
    # 4. Seed Database (Optional)
    Write-Host "  Seeding database..." -ForegroundColor Gray
    cmd /c "npx tsx src/seed.ts"
} else {
    Write-Host "Error: Backend directory not found!" -ForegroundColor Red
}

# --- Frontend Setup ---
Write-Host "`n[2/2] Setting up Frontend..." -ForegroundColor Yellow

if (Test-Path $frontendDir) {
    Set-Location $frontendDir

    # 1. Copy .env
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Host "  Created frontend .env from example." -ForegroundColor Gray
        }
    } else {
        Write-Host "  Frontend .env already exists. Skipping." -ForegroundColor Gray
    }

    # 2. Install Dependencies
    Write-Host "  Installing frontend dependencies (this may take a while)..." -ForegroundColor Gray
    cmd /c "npm install"
} else {
    Write-Host "Error: Frontend directory not found!" -ForegroundColor Red
}

# --- Summary ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete! Ready to launch." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Please run 'start.ps1' to start the application." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
