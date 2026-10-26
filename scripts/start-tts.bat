@echo off
title ProInterview Neural TTS Server (Port 8001)
echo ========================================================
echo   ProInterview Neural TTS Service (Piper ONNX)
echo ========================================================

set ROOT_DIR=%~dp0..
set SCRIPT_PY=%ROOT_DIR%\server\tts\standalone_tts_server.py
if not exist "%SCRIPT_PY%" (
    set SCRIPT_PY=C:\Users\cheta\Downloads\hemanth\realestic avatar\HumanAI-Lab\portable_avatar_speech_kit\backend\standalone_tts_server.py
)

:: Locate Python executable
set PYTHON_EXE=python
if exist "%ROOT_DIR%\.venv\Scripts\python.exe" (
    set PYTHON_EXE=%ROOT_DIR%\.venv\Scripts\python.exe
) else if exist "%ROOT_DIR%\venv\Scripts\python.exe" (
    set PYTHON_EXE=%ROOT_DIR%\venv\Scripts\python.exe
) else if exist "%ROOT_DIR%\..\realestic avatar\HumanAI-Lab\backend\venv\Scripts\python.exe" (
    set PYTHON_EXE=%ROOT_DIR%\..\realestic avatar\HumanAI-Lab\backend\venv\Scripts\python.exe
) else if exist "C:\Users\cheta\Downloads\hemanth\realestic avatar\HumanAI-Lab\backend\venv\Scripts\python.exe" (
    set PYTHON_EXE=C:\Users\cheta\Downloads\hemanth\realestic avatar\HumanAI-Lab\backend\venv\Scripts\python.exe
)

echo Using Python: "%PYTHON_EXE%"
echo Running Script: "%SCRIPT_PY%"
echo Target: http://127.0.0.1:8001
echo.

"%PYTHON_EXE%" "%SCRIPT_PY%" --port 8001
pause
