@echo off
echo ============================================================
echo YouTube Remote Control - Quick Start
echo ============================================================
echo.

echo Step 1: Installing Python dependencies...
echo.
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    echo Make sure Python and pip are installed.
    pause
    exit /b 1
)
echo.

echo Step 2: Generating extension icons...
echo.
cd ..\extension
python generate_icons.py
if %errorlevel% neq 0 (
    echo WARNING: Failed to generate icons.
    echo You can create them manually later.
)
cd ..\backend
echo.

echo Step 3: Getting your IP address...
echo.
echo Your IP addresses:
ipconfig | findstr /i "IPv4"
echo.
echo Note the IPv4 Address for your WiFi/Ethernet adapter
echo.

echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo NEXT STEPS:
echo.
echo 1. Install the browser extension:
echo    - Chrome: chrome://extensions/ ^> Developer mode ^> Load unpacked
echo    - Firefox: about:debugging ^> Load Temporary Add-on
echo    - Select folder: %CD%\..\extension
echo.
echo 2. The Flask server will now start...
echo    - Access locally: http://localhost:5000
echo    - Access from mobile: http://^<YOUR-IP^>:5000
echo.
echo 3. Open YouTube and play a video
echo.
echo 4. Access from your phone/tablet on the same WiFi
echo.
echo Press any key to start the Flask server...
pause >nul

echo.
echo ============================================================
echo Starting Flask Backend...
echo ============================================================
python app.py
