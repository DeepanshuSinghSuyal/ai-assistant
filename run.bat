@echo off
title Roamies - JARVIS
cls
echo ====================================================
echo   Roamies AI Assistant (Google Gemini + JARVIS)
echo ====================================================
echo.
echo [1/2] Syncing Google Gemini API Key and Voice settings...
call node scripts\setup-gemini.mjs
echo.
echo [2/2] Launching Roamies Canvas & Control Panel...
call node scripts\serve-showcase.mjs
pause
