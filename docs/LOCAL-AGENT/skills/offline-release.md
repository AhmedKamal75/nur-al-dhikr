# Skill: Offline Release

Whenever a release changes JS/CSS/service-worker or data:

1. bump all required version markers
2. run `npm run snapshot-shell`
3. run `npm run manifest:generate`
4. run `npm run compress-data` if data changed
5. run `npm run check`
6. run Chromium E2E
7. inspect the offline shell and update path

Never ship a new file under `js/` without adding it to the service-worker shell.
Never call a stale-shell state a visual bug until the cache/version state is checked.
