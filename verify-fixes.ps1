#!/usr/bin/env powershell
# Verificacion rapida de fixes

Write-Host "`nVERIFICACION DE FIXES DEL BUILDER`n" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Verificar que archivos existan
Write-Host "Verificando archivos..." -ForegroundColor Yellow

$files = @(
    "javascript/script.js",
    "docs/BUG_FIX_BUILDER.md",
    "BUILDER_FIXES.md",
    "BUILDER_STATUS.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  FALTA: $file" -ForegroundColor Red
    }
}

# Verificar cambios en script.js
Write-Host "`nVerificando cambios en script.js..." -ForegroundColor Yellow

$scriptContent = Get-Content javascript/script.js -Raw

$checks = @(
    @{ name = "event.preventDefault"; pattern = "preventDefault" },
    @{ name = "console.log Bebida"; pattern = "console.log.*Bebida" },
    @{ name = "OPCIONES_CONSUMO validation"; pattern = "OPCIONES_CONSUMO.*filter" },
    @{ name = "buildRequirements debug"; pattern = "Procesando.*bebidas" }
)

foreach ($check in $checks) {
    if ($scriptContent -match $check.pattern) {
        Write-Host "  OK: $($check.name)" -ForegroundColor Green
    } else {
        Write-Host "  FALTA: $($check.name)" -ForegroundColor Red
    }
}

Write-Host "`nVERIFICACION COMPLETADA`n" -ForegroundColor Green
