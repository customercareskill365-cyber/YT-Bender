@echo off
title YTBender - Create Desktop Shortcut
echo Creating YTBender Desktop Shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop); if (-not $desktop) { $desktop = Join-Path $env:USERPROFILE 'Desktop' }; $sc = $ws.CreateShortcut((Join-Path $desktop 'YTBender Studio.lnk')); $sc.TargetPath = (Join-Path '%~dp0' 'Start-App.bat'); $sc.WorkingDirectory = '%~dp0'; $ico = Join-Path '%~dp0' 'logo.ico'; if (Test-Path $ico) { $sc.IconLocation = $ico + ',0' }; $sc.Description = 'YTBender - YouTube Content & Trend Planning Studio'; $sc.Save(); Write-Host 'Desktop Shortcut Created Successfully!' -ForegroundColor Green"
echo.
echo Shortcut created on your Desktop! You can now launch YTBender directly from your Desktop.
timeout /t 3 >nul
