@echo off
title Push ResilientUrban to GitHub
cd /d "d:\SHE_BUILDS\resilient-urban"
echo ======================================================================
echo   Pushing ResilientUrban (main branch) to GitHub:
echo   https://github.com/poorvika/resilent.git
echo ======================================================================
echo.
git push -u origin main
echo.
echo Done!
pause
