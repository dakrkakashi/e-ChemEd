@echo off
title e-chemEd Stopper
cd /d "%~dp0"

echo ======================================================
echo           Stopping e-chemEd Platform...
echo ======================================================

node "%~dp0scripts\kill-pids.js"

echo.
