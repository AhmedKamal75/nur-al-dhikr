#!/bin/bash
# Nur al-Dhikr — run: ./Start-Here-Linux.sh
cd "$(dirname "$0")" || exit 1
echo
echo "  Starting Nur al-Dhikr..."
echo "  Keep this window open while you use the app."
echo "  (Closing it stops the app; your data lives in your browser.)"
echo "  Local server only (no HTTPS/install) — for sharing, use a static host."
echo
( sleep 1; xdg-open "http://localhost:8080/" 2>/dev/null || open "http://localhost:8080/" 2>/dev/null ) &
python3 -m http.server 8080
