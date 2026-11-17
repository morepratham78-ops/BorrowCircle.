@echo off
echo ========================================================
echo   Starting BorrowCircle Hyperlocal Rental Marketplace
echo   Borrow Anything. Share Everything.
echo ========================================================
echo.
cd /d "%~dp0\server"
node dist/index.js
pause
