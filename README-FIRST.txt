NUR AL-DHIKR — HOW TO OPEN THE APP
==================================

This is a web app (a PWA). It runs in your browser, but browsers refuse to
run web-app code when it is opened straight from a folder — that is why
double-clicking index.html shows an explanation page instead of the app.

EASIEST (pick the launcher for your system, in this same folder):
  Windows ....... double-click  Start-Here-Windows.bat
  macOS ......... double-click  Start-Here-Mac.command
  Linux ......... run          ./Start-Here-Linux.sh

A terminal window opens (leave it open) and the app opens in your browser.

MANUAL, any system — from this folder run:
  python3 -m http.server 8080
then open:  http://localhost:8080

HOSTED (optional): drop this folder on Netlify Drop or GitHub Pages and
open the URL. After the first visit the app works fully offline, and you
can install it from your browser menu ("Add to Home Screen" / "Install").

Your data (bookmarks, logs, settings) is stored in the browser you open
the app in — it never leaves your device.
