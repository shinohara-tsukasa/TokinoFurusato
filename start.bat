@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Toki no Furusato Toki no Furusato launcher

set PORT=8003
set HOST=127.0.0.1
set SESSION_ID=tokifuru-%RANDOM%%RANDOM%
set "URL=http://%HOST%:%PORT%/web/index.html?sid=%SESSION_ID%&ts=%RANDOM%%RANDOM%"

cd /d "%~dp0"
set "CADDY=%~dp0caddy\caddy.exe"
set "CFG=%~dp0caddy\Caddyfile_autogen"
set "LOG=%~dp0caddy\access.log"
set "CADDYLOG=%~dp0caddy\caddy.log"

if not exist "%CADDY%" (
  echo caddy.exe not found:
  echo   "%CADDY%"
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient; $c.Connect('%HOST%',%PORT%); $c.Close(); exit 0}catch{ exit 1 }"
if %errorlevel%==0 (
  echo %HOST%:%PORT% is already in use.
  echo Close the existing server or change PORT in this BAT, then retry.
  pause
  exit /b 1
)

(
  echo {
  echo     admin off
  echo }
  echo(
  echo :%PORT% {
  echo     bind 127.0.0.1
  echo     root * .
  echo(
  echo     log {
  echo         output file caddy/access.log
  echo     }
  echo(
  echo     @htmlutf8 {
  echo         path *.html *.htm
  echo     }
  echo     header @htmlutf8 Content-Type "text/html; charset=utf-8"
  echo(
  echo     @nocache {
  echo         path /web/index.html /web/ping.txt
  echo     }
  echo     header @nocache Cache-Control "no-store"
  echo     header @nocache Pragma "no-cache"
  echo     header @nocache Expires "0"
  echo(
  echo     file_server
  echo }
) > "%CFG%"

set CADDY_PID=
start "" /b cmd /c ""%CADDY%" run --config "%CFG%" --adapter caddyfile > "%CADDYLOG%" 2>&1"

powershell -NoProfile -Command "$hostName=$env:HOST;$port=[int]$env:PORT;$deadline=(Get-Date).AddSeconds(10);while((Get-Date) -lt $deadline){try{$c=New-Object Net.Sockets.TcpClient;$c.Connect($hostName,$port);$c.Close();exit 0}catch{Start-Sleep -Milliseconds 200}}exit 1"
if errorlevel 1 (
  echo Caddy did not become ready on %HOST%:%PORT%.
  echo Check:
  echo   %CADDYLOG%
  echo   %CFG%
  echo.
  pause
  exit /b 1
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% " ^| findstr /C:"LISTENING"') do (
  set CADDY_PID=%%P
)
if not defined CADDY_PID (
  echo Caddy PID could not be determined.
  echo Check:
  echo   %CADDYLOG%
  echo.
  pause
  exit /b 1
)

start chrome "!URL!"

echo Opened Toki no Furusato Toki no Furusato in Chrome:
echo   !URL!
echo.
echo Close the game tab when you are done.
echo The local server will stop automatically.
echo.

powershell -NoProfile -Command "$log='%LOG%';$sid='%SESSION_ID%';$openNeedle='sid='+$sid+'&event=open';$aliveNeedle='sid='+$sid+'&event=alive';$closeNeedle='sid='+$sid+'&event=close';$idle=5.0;$tick=250;$deadline=120;$start=Get-Date;$lastWrite=$null;$lastSeen=$null;$closeSeen=$false;while($true){$now=Get-Date;if(Test-Path $log){$item=Get-Item $log;if($lastWrite -eq $null -or $item.LastWriteTimeUtc -ne $lastWrite){$lastWrite=$item.LastWriteTimeUtc;$tail=Get-Content $log -Tail 120;foreach($line in $tail){if($line.Contains($openNeedle) -or $line.Contains($aliveNeedle)){$lastSeen=$now}if($line.Contains($closeNeedle)){$closeSeen=$true}}}}if($closeSeen){break}if($lastSeen -ne $null -and (($now-$lastSeen).TotalSeconds -ge $idle)){break}if($lastSeen -eq $null -and (($now-$start).TotalSeconds -ge $deadline)){break}Start-Sleep -Milliseconds $tick}"
timeout /t 1 /nobreak >nul
taskkill /PID !CADDY_PID! /T /F >nul 2>&1
del /f /q "%LOG%" >nul 2>&1
del /f /q "%CADDYLOG%" >nul 2>&1

endlocal & exit /b 0
