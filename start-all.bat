@echo off
title ResilientUrban Launcher
set "PATH=d:\SHE_BUILDS\nodejs;%PATH%"
cd /d "d:\SHE_BUILDS\resilient-urban"
echo ========================================================
echo   Launching ResilientUrban Full-Stack Application...
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo ========================================================
start "ResilientUrban Backend" cmd /k "d:\SHE_BUILDS\resilient-urban\run-backend.bat"
timeout /t 2 /nobreak > nul
start "ResilientUrban Frontend" cmd /k "d:\SHE_BUILDS\resilient-urban\run-frontend.bat"
echo Services launched in separate windows!
