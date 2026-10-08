@echo off
title ResilientUrban Backend (Port 5000)
set "PATH=d:\SHE_BUILDS\nodejs;%PATH%"
cd /d "d:\SHE_BUILDS\resilient-urban\backend"
echo ========================================================
echo   ResilientUrban Backend Server & WebSockets
echo   Listening on: http://localhost:5000
echo ========================================================
node src\server.js
pause
