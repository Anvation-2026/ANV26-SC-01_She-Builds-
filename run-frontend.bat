@echo off
title ResilientUrban Frontend (Port 3000)
set "PATH=d:\SHE_BUILDS\nodejs;%PATH%"
cd /d "d:\SHE_BUILDS\resilient-urban\frontend"
echo ========================================================
echo   ResilientUrban Frontend UI Dashboard
echo   Listening on: http://localhost:3000
echo ========================================================
npm run dev -- --host --port 3000
pause
