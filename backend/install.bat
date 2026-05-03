@echo off
set PATH=%PATH%;C:\Program Files\Git\cmd;%USERPROFILE%\AppData\Local\Programs\Git\cmd
echo Git version check:
git --version
echo Starting npm install...
npm install express cors dotenv mongoose @whiskeysockets/baileys pino qrcode-terminal socket.io bullmq ioredis
echo NPM Exit Code: %ERRORLEVEL%
