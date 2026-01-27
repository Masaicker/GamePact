# GamePact Service Stopper

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GamePact - Service Stopper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Root directory
$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

# Default ports
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

function Kill-ProcessOnPort {
    param([int]$Port, [string]$Name)

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if ($connections) {
        foreach ($conn in $connections) {
            $pid_target = $conn.OwningProcess

            # Skip system processes
            if ($pid_target -le 4) { continue }

            try {
                # Try to get parent process info first
                $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $pid_target" -ErrorAction Stop
                $ppid = $procInfo.ParentProcessId

                Write-Host "Found $Name on port $Port (PID: $pid_target)." -ForegroundColor Yellow

                # Kill the service process
                Stop-Process -Id $pid_target -Force -ErrorAction SilentlyContinue

                # Check and kill parent CMD if exists
                if ($ppid) {
                    $parent = Get-Process -Id $ppid -ErrorAction SilentlyContinue
                    if ($parent) {
                        if ($parent.ProcessName -eq "cmd") {
                            Write-Host "  Closing host CMD window (PID: $ppid)..." -ForegroundColor Gray
                            Stop-Process -Id $ppid -Force -ErrorAction SilentlyContinue
                        }
                    }
                }
                Write-Host "  Stopped successfully." -ForegroundColor Green
            } catch {
                Write-Host "  Process handled or already closed." -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "$Name is not running." -ForegroundColor Gray
    }
}

Kill-ProcessOnPort -Port $backendPort -Name "Backend"
Kill-ProcessOnPort -Port $frontendPort -Name "Frontend"

Write-Host ""
Write-Host "Closing in 2 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 2
exit
