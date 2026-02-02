# Content-Based Pairing Test - Scenario 3 (250,000 KHR)
# Generates a UNIQUE ext_ref and MsgIds each run to avoid EXT_REF_IS_NOT_UNIQUE.
# Prerequisites: Bot running (npm run dev), migration applied, BAKONG_PAYEE_CODES=TOURKHPPXXX,BKRTKHPPXXX

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Unique ref and MsgIds for this run (avoids EXT_REF_IS_NOT_UNIQUE)
$ms = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$uniqueRef = ("{0:D10}" -f ([long]$ms % 10000000000))
$msgId1 = "CRTTOURKHPPXXX$ms"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Content Pairing Test - Scenario 3" -ForegroundColor Cyan
Write-Host "  250,000 KHR | ext_ref $uniqueRef (unique this run)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1
Write-Host "[Step 1] Sending original: TOUR -> BKRT (250,000 KHR)..." -ForegroundColor Yellow
try {
    $xml1 = Get-Content -Path "test-scenarios/scenario3-content-pairing-test2/scenario3-step1-original.xml" -Raw -Encoding UTF8
    $xml1 = $xml1 -replace '7777666655', $uniqueRef
    $xml1 = $xml1 -replace 'CRTTOURKHPPXXX1738280000333', $msgId1
    $r1 = Invoke-WebRequest -Uri "http://10.20.6.228/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -Body $xml1 -UseBasicParsing
    Write-Host "  Response: $($r1.StatusCode) - OK" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "[Wait] 70 seconds for bot to fetch and store original..." -ForegroundColor Yellow
Start-Sleep -Seconds 70
Write-Host "  Done." -ForegroundColor Green
Write-Host ""

# Step 2
$msgId2 = "CRTBKRTKHPPXXX$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
Write-Host "[Step 2] Sending reversal: BKRT -> TOUR (250,000 KHR, no REVERSING label)..." -ForegroundColor Yellow
try {
    $xml2 = Get-Content -Path "test-scenarios/scenario3-content-pairing-test2/scenario3-step2-reversal-no-label.xml" -Raw -Encoding UTF8
    $xml2 = $xml2 -replace '7777666655', $uniqueRef
    $xml2 = $xml2 -replace 'CRTBKRTKHPPXXX1738280100444', $msgId2
    $r2 = Invoke-WebRequest -Uri "http://10.20.6.223/cb-adapter/BakongWebService/NBCInterface" -Method POST -ContentType "text/xml; charset=utf-8" -Body $xml2 -UseBasicParsing
    Write-Host "  Response: $($r2.StatusCode) - OK" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test commands sent. ext_ref used: $uniqueRef" -ForegroundColor Cyan
Write-Host "  Check BOT LOGS for Stored original / CONTENT PAIRING / LINK" -ForegroundColor White
Write-Host "  Verify DB: SELECT * FROM transaction_logs WHERE amount = 250000;" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
