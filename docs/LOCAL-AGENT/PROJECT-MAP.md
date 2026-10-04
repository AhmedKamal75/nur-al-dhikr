# PROJECT MAP — Local Agent Quick Map

Use `docs/AGENT-MAP.md` for the current subsystem table and `docs/agent-map-full.md` for exhaustive lookup.
This file is a fast decision map.

| Need to change          | Start here                              | Important companion                |
| ----------------------- | --------------------------------------- | ---------------------------------- |
| top-level product doors | `js/core/config/nav.js`                 | `js/ui/shell.js`, route config     |
| route/view registry     | `js/core/config/views.js`               | `js/app/renderer.js`               |
| Home                    | `js/views/home.js`                      | home handlers + home CSS           |
| Adhkar browser          | route/view in `js/views/`               | `data/adhkar*`, shared tiles       |
| Focus Mode              | `js/views/` + feature handlers          | audio, counter, state              |
| Player/audio            | `js/services/audio*.js`, player UI/view | audio state + controls             |
| Qur'an library          | Qur'an views                            | data/quran metadata                |
| Mushaf                  | Mushaf view/modules                     | study tray, tafsir, bookmarks      |
| Tajweed                 | Tajweed views/domain/data               | `docs/TAJWEED-RESEARCH-DOSSIER.md` |
| Prayer                  | prayer views/domain                     | settings + schedule data           |
| Qibla                   | compass/Qibla view/domain               | device capability handling         |
| Calendar                | calendar view/domain                    | Hijri calculations/data            |
| Khatma                  | Khatma view/domain/state                | progress model                     |
| Garden/statistics       | progress views/domain/state             | statistics selectors               |
| Settings                | settings views/config                   | `sanitize.js`, i18n                |
| all i18n                | `js/core/i18n/en.js`, `ar.js`           | i18n tests                         |
| design tokens           | `assets/css/variables.css`              | `assets/css/*.css`, design tests   |
| shared visual shell     | `js/ui/*.js`, global CSS                | shell/router                       |
| state/persistence       | `js/core/state/`                        | storage/idb                        |
| event handlers          | `js/app/handlers/`                      | `data-action` allowlist            |
| offline shell           | `sw.js`                                 | `tests/app-shell-hashes.json`      |
| data provenance         | `data/` + `docs/DATA-SCHEMA.md`         | trusted sources                    |
| test contract           | `tests/`                                | `docs/TESTING.md`                  |

## Source-of-truth rules

- nav chrome derives from route→door config
- settings derive from config + sanitizer
- labels derive from i18n
- data counts derive from corpus/manifest
- cached JS/CSS derives from shell snapshot

Never create a second static list when the source already exists.
