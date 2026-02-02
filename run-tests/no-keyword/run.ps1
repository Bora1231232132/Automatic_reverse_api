# Test: Reversal with NO "REVERSING" keyword
# Bot detects via: direction (BKRT -> TOUR) and/or content pairing with stored original
# Same flow as scenario-2-150k; unique ext_ref per run.

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

$ms = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$uniqueRef = ("{0:D10}" -f ([long]$ms % 10000000000))
$msgId1 = "CRTTOURKHPPXXX$ms"
$today = (Get-Date).ToString("yyyy-MM-dd")

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NO KEYWORD (direction / content pairing)" -ForegroundColor Cyan
Write-Host "  Step 2 has NO 'REVERSING' in RmtInf" -ForegroundColor Cyan
Write-Host "  ext_ref: $uniqueRef" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[Step 1] TOUR -> BKRT (99,000 KHR - no-keyword scenario)..." -ForegroundColor Yellow
try {
    $xml1 = Get-Content -Path "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml" -Raw -Encoding UTF8
    $xml1 = $xml1 -replace '8888777666', $uniqueRef -replace 'CRTTOURKHPPXXX1738390000888', $msgId1 -replace '2026-01-30', $today -replace '150000', '99000'
    $r1 = Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -Body $xml1 -UseBasicParsing
    Write-Host "  OK $($r1.StatusCode)" -ForegroundColor Green
} catch { Write-Host "  ERROR: $_" -ForegroundColor Red; exit 1 }

Write-Host "[Wait] 70s..." -ForegroundColor Yellow
Start-Sleep -Seconds 70

$msgId2 = "CRTBKRTKHPPXXX$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
Write-Host "[Step 2] BKRT -> TOUR (no REVERSING label)..." -ForegroundColor Yellow
try {
    $xml2 = Get-Content -Path "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml" -Raw -Encoding UTF8
    $xml2 = $xml2 -replace '8888777666', $uniqueRef -replace 'CRTBKRTKHPPXXX1738390100999', $msgId2 -replace '2026-01-30', $today -replace '150000', '99000'
    $r2 = Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -Body $xml2 -UseBasicParsing
    Write-Host "  OK $($r2.StatusCode)" -ForegroundColor Green
} catch { Write-Host "  ERROR: $_" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Done. Bot should detect via direction or content pairing." -ForegroundColor Cyan
Write-Host ""
