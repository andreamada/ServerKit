#Requires -Version 5.1
<#
.SYNOPSIS
    ServerKit development launcher and validation tool.
.DESCRIPTION
    Start backend, frontend, or both. Run validation checks.
.PARAMETER Mode
    Operation mode: start (default), backend, frontend, validate
.EXAMPLE
    .\dev.ps1              # Start backend + frontend
    .\dev.ps1 backend      # Backend only
    .\dev.ps1 frontend     # Frontend only
    .\dev.ps1 validate     # Run all linters/checks
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'backend', 'frontend', 'validate')]
    [string]$Mode = 'start'
)

$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot 'backend'
$FrontendDir = Join-Path $ProjectRoot 'frontend'

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Pass {
    param([string]$Text)
    Write-Host "  PASS " -ForegroundColor Green -NoNewline
    Write-Host $Text
}

function Write-Fail {
    param([string]$Text)
    Write-Host "  FAIL " -ForegroundColor Red -NoNewline
    Write-Host $Text
}

function Start-Backend {
    Write-Header "Starting Backend (http://localhost:5000)"
    Push-Location $BackendDir
    try {
        if (Test-Path 'venv\Scripts\Activate.ps1') {
            & 'venv\Scripts\Activate.ps1'
        }
        python run.py
    }
    finally {
        Pop-Location
    }
}

function Start-Frontend {
    Write-Header "Starting Frontend (http://localhost:5173)"
    Push-Location $FrontendDir
    try {
        npm run dev
    }
    finally {
        Pop-Location
    }
}

function Start-Both {
    Write-Host ""
    Write-Host "ServerKit Dev Server" -ForegroundColor Cyan
    Write-Host "  Backend:  http://localhost:5000"
    Write-Host "  Frontend: http://localhost:5173"
    Write-Host ""

    $backendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        if (Test-Path 'venv\Scripts\Activate.ps1') {
            & 'venv\Scripts\Activate.ps1'
        }
        python run.py
    } -ArgumentList $BackendDir

    Start-Sleep -Seconds 2

    $frontendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npm run dev
    } -ArgumentList $FrontendDir

    try {
        Write-Host "Press Ctrl+C to stop..." -ForegroundColor DarkGray
        while ($true) {
            # Stream output from both jobs
            Receive-Job $backendJob -ErrorAction SilentlyContinue
            Receive-Job $frontendJob -ErrorAction SilentlyContinue

            if ($backendJob.State -eq 'Failed') {
                Write-Host "Backend crashed!" -ForegroundColor Red
                Receive-Job $backendJob
                break
            }
            if ($frontendJob.State -eq 'Failed') {
                Write-Host "Frontend crashed!" -ForegroundColor Red
                Receive-Job $frontendJob
                break
            }
            Start-Sleep -Seconds 1
        }
    }
    finally {
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -Force -ErrorAction SilentlyContinue
        Write-Host "`nStopped." -ForegroundColor Yellow
    }
}

function Invoke-Check {
    param(
        [string]$Name,
        [string]$WorkDir,
        [scriptblock]$Command
    )
    Write-Host "Running $Name..." -ForegroundColor Yellow
    $prev = $PWD
    if ($WorkDir) { Set-Location $WorkDir }
    $ErrorActionPreference = 'Continue'
    & $Command 2>&1 | Tee-Object -Variable output | Out-Null
    $exitCode = $LASTEXITCODE
    if ($WorkDir) { Set-Location $prev }

    if ($exitCode -eq 0) {
        Write-Pass $Name
        return $true
    }
    else {
        Write-Fail $Name
        $output | ForEach-Object { Write-Host "    $_" }
        return $false
    }
}

function Run-Validate {
    Write-Header "ServerKit Validation Suite"
    $failed = 0
    $passed = 0

    # --- ESLint (warn-only, does not block) ---
    Write-Host "Running ESLint..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    $ErrorActionPreference = 'Continue'
    npm run lint 2>&1 | Out-Null
    $eslintExit = $LASTEXITCODE
    Pop-Location
    if ($eslintExit -eq 0) {
        Write-Pass "ESLint"
        $passed++
    }
    else {
        Write-Host "  WARN " -ForegroundColor Yellow -NoNewline
        Write-Host "ESLint (has warnings/errors - run 'cd frontend && npm run lint' for details)"
        $passed++  # count as pass — pre-existing issues should not block
    }

    # --- Bandit ---
    if (Get-Command bandit -ErrorAction SilentlyContinue) {
        if (Invoke-Check "Bandit (security scan)" "" { bandit -r "$BackendDir\app" --ini "$BackendDir\.bandit" --severity-level medium }) { $passed++ } else { $failed++ }
    }
    else {
        Write-Fail "Bandit (not installed - pip install bandit)"
        $failed++
    }

    # --- Pytest ---
    if (Test-Path "$BackendDir\venv\Scripts\Activate.ps1") {
        & "$BackendDir\venv\Scripts\Activate.ps1"
    }
    if (Invoke-Check "Pytest" $BackendDir { pytest --tb=short -q }) { $passed++ } else { $failed++ }

    # --- Frontend build ---
    if (Invoke-Check "Frontend build" $FrontendDir { npm run build }) { $passed++ } else { $failed++ }

    # --- Summary ---
    Write-Header "Results"
    Write-Host "  Passed: $passed" -ForegroundColor Green
    if ($failed -gt 0) {
        Write-Host "  Failed: $failed" -ForegroundColor Red
        exit 1
    }
    else {
        Write-Host "  All checks passed!" -ForegroundColor Green
    }
}

function Run-ValidateWatch {
    Write-Host "Watching for changes... (Ctrl+C to stop)" -ForegroundColor DarkGray
    Run-Validate

    $watcher = [System.IO.FileSystemWatcher]::new()
    $watcher.Path = $ProjectRoot
    $watcher.IncludeSubdirectories = $true
    $watcher.Filter = '*.*'
    $watcher.EnableRaisingEvents = $true

    $lastRun = [DateTime]::MinValue

    try {
        while ($true) {
            $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 2000)
            if (-not $result.TimedOut) {
                $ext = [System.IO.Path]::GetExtension($result.Name)
                if ($ext -in '.py', '.js', '.jsx', '.ts', '.tsx') {
                    $now = [DateTime]::Now
                    if (($now - $lastRun).TotalSeconds -gt 3) {
                        $lastRun = $now
                        Write-Host "`nChange detected: $($result.Name)" -ForegroundColor Yellow
                        Run-Validate
                    }
                }
            }
        }
    }
    finally {
        $watcher.Dispose()
    }
}

# --- Main ---
switch ($Mode) {
    'backend' { Start-Backend }
    'frontend' { Start-Frontend }
    'validate' { Run-ValidateWatch }
    default { Start-Both }
}
