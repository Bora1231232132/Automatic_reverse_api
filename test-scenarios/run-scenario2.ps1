# Content-Based Pairing Test - Scenario 2 (150,000 KHR)
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
Write-Host "  Content Pairing Test - Scenario 2" -ForegroundColor Cyan
Write-Host "  150,000 KHR | ext_ref $uniqueRef (unique this run)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: read XML, replace ref and MsgId, send
Write-Host "[Step 1] Sending original: TOUR -> BKRT (150,000 KHR)..." -ForegroundColor Yellow
try {
    $xml1 = Get-Content -Path "test-scenarios/scenario2-content-pairing/scenario2-step1-original.xml" -Raw -Encoding UTF8
    $xml1 = $xml1 -replace '8888777666', $uniqueRef
    $xml1 = $xml1 -replace 'CRTTOURKHPPXXX1738390000888', $msgId1
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

# Step 2: new MsgId for reversal; read XML, replace ref and MsgId, send
$msgId2 = "CRTBKRTKHPPXXX$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
Write-Host "[Step 2] Sending reversal: BKRT -> TOUR (150,000 KHR, no REVERSING label)..." -ForegroundColor Yellow
try {
    $xml2 = Get-Content -Path "test-scenarios/scenario2-content-pairing/scenario2-step2-reversal-no-label.xml" -Raw -Encoding UTF8
    $xml2 = $xml2 -replace '8888777666', $uniqueRef
    $xml2 = $xml2 -replace 'CRTBKRTKHPPXXX1738390100999', $msgId2
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
Write-Host "  Verify DB: SELECT * FROM transaction_logs ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
