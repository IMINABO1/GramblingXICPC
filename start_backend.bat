@echo off
REM Kill all existing Python processes to ensure clean start
taskkill /F /IM python.exe >nul 2>&1

REM Wait a moment for processes to terminate
timeout /t 2 /nobreak >nul

REM Start the backend server from project root
echo Starting backend server on http://localhost:8000
python -m uvicorn backend.main:app --reload --port 8000
