@echo off
echo Starting Smartwatch COA Simulation Server...
cd /d "%~dp0"
py -3 server.py
if errorlevel 1 (
    echo Python 3 command failed, trying default python...
    python server.py
)
pause
