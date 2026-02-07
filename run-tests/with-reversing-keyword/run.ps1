# Test: Reversal WITH "REVERSING" keyword in RmtInf
# Bot detects reversal via: rmtInf.includes("REVERSING")
# Unique ext_ref per run.

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

$ms = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$uniqueRef = ("{0:D10}" -f ([long]$ms % 10000000000))
$msgId1 = "CRTTOURKHPPXXX$ms"
$today = (Get-Date).ToString("yyyy-MM-dd")

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WITH REVERSING KEYWORD" -ForegroundColor Cyan
Write-Host "  Step 2 has 'REVERSING' in RmtInf" -ForegroundColor Cyan
Write-Host "  ext_ref: $uniqueRef" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[Step 1] TOUR -> BKRT (66 KHR)..." -ForegroundColor Yellow
try {
    $xml1 = Get-Content -Path "test-scenarios/with-reversing-keyword/step1-original.xml" -Raw -Encoding UTF8
    $xml1 = $xml1 -replace 'REFPLACEHOLDER', $uniqueRef -replace 'MSGID1', $msgId1 -replace '2026-01-30', $today
    $r1 = Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -Body $xml1 -UseBasicParsing
    Write-Host "  OK $($r1.StatusCode)" -ForegroundColor Green
} catch { Write-Host "  ERROR: $_" -ForegroundColor Red; exit 1 }

Write-Host "[Wait] 70s..." -ForegroundColor Yellow
Start-Sleep -Seconds 70

$msgId2 = "CRTBKRTKHPPXXX$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$uniqueRef2 = ("{0:D10}" -f ([long]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) % 10000000000))
Write-Host "[Step 2] BKRT -> TOUR with REVERSING in RmtInf..." -ForegroundColor Yellow
try {
    $xml2 = Get-Content -Path "test-scenarios/with-reversing-keyword/step2-with-reversing-label.xml" -Raw -Encoding UTF8
    $xml2 = $xml2 -replace 'REFPLACEHOLDER', $uniqueRef2 -replace 'MSGID2', $msgId2 -replace '2026-01-30', $today
    $r2 = Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -Body $xml2 -UseBasicParsing
    Write-Host "  OK $($r2.StatusCode)" -ForegroundColor Green
} catch { Write-Host "  ERROR: $_" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Done. Bot should detect reversal via REVERSING keyword." -ForegroundColor Cyan
Write-Host ""
