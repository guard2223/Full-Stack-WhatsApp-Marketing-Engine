@echo off
set SRC=E:\work\whatsapp_marketing_tool
set DEST=E:\work\github_export\WhatsApp-Marketing-SAAS

echo 🚀 Starting Saden WA GitHub Sync...

:: Sync Backend
echo 📁 Syncing Backend...
robocopy "%SRC%\backend" "%DEST%\backend" /E /XD node_modules sessions dist .git /XF .env db.json exclude_list.txt /R:0 /W:0

:: Sync Frontend
echo 📁 Syncing Frontend...
robocopy "%SRC%\frontend" "%DEST%\frontend" /E /XD node_modules .next .git /XF .env.local .env exclude_list.txt /R:0 /W:0

:: Copy Root Files
echo 📄 Copying Documentation...
copy "%SRC%\start_multiwa.bat" "%DEST%\start_multiwa.bat" /Y
copy "%SRC%\walkthrough.md" "%DEST%\walkthrough.md" /Y

echo ✅ Sync Completed! Your GitHub directory is now updated and clean.
pause
