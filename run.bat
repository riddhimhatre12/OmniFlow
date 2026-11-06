@echo off
echo Starting OMNI-Flow with Node 22...
set "PATH=C:\Users\admin\AppData\Local\nvm\v22.14.0;%PATH%"
cd /d "%~dp0"
npm.cmd run dev

