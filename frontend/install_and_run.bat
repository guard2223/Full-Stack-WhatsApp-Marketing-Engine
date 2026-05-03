@echo off
echo =======================================================
echo Updating NPM Settings for slower networks...
echo =======================================================
call npm config set strict-ssl false
call npm config set registry http://registry.npmjs.org/
echo Starting installation (this might take a few minutes)...
echo =======================================================
call npm install --no-audit --no-fund --legacy-peer-deps
echo =======================================================
echo Starting Frontend (Next.js)...
echo =======================================================
call npm run dev
pause
