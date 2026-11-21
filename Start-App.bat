@echo off
title YTBender - Offline-First YouTube Trend & Content Studio
echo Starting YTBender Studio Local Server on http://localhost:8080 ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
