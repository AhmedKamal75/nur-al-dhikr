#!/bin/bash
# Nur al-Dhikr — double-click me (macOS) or run: ./Start-Here-Mac.command
cd "$(dirname "$0")" || exit 1
echo
echo "  Starting Nur al-Dhikr..."
echo "  Keep this window open while you use the app."
echo "  (Closing it stops the app; your data lives in your browser.)"
echo
( sleep 1; open "http://localhost:8080/" 2>/dev/null || xdg-open "http://localhost:8080/" 2>/dev/null ) &
python3 -m http.server 8080
