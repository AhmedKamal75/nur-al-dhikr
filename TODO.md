# TODO — Digital Inquisitor Audit Findings (v5.1.0, 2026-09-04)

# Status update 2026-09-04: all items fixed except U5 (needs a real device).

# `npm test`: 813/813 green after fixes. eslint/prettier not runnable here

# (dev deps not installed); edits follow existing style. Re-run `npm run check` on a dev machine.

# PLAYER AUDIT + FIXES (v5.2.1, 2026-09-04)

# Report: "player broken, fullscreen and outside". Verified live in headless

# Chromium (Playwright, app served over HTTP): engine advances correctly

# (Al-Falaq 5/5 files, An-Nas console live), CDN healthy (206), zero JS errors.

# Two real defects found and fixed, both re-verified live, suite 845/845 green.

#

- [x] **P1 — "X / 0" counter everywhere.** The boot mirror (`app/boot.js`
      `onAyahChange`) dropped the engine's total/end, so the reader console AND
      the fullscreen glass bar (`mushaf-fs-controls__ayah`) read "1 / 0".
      FIXED: mirror now carries total + end. Live-verified: "1 / 7", "2 / 4", "1 / 6".
- [x] **P2 — console chips tapped the wrong action.** `.player-bar__chip::after`
      (44px hit-expansion) had no `position: relative` on its parent, so every
      chip's invisible hit box anchored to the bar and stacked over its neighbors
      (e.g. tapping Repeat toggled Sleep). FIXED: one-line `position: relative`
      (`assets/css/components.css:1447`). Live-verified: repeat→×3, echo toggle,
      stop unmounts the bar, zero errors.
- [x] Checked healthy, no change: engine advance/surah scoping, fullscreen
      enter/exit (idle auto-fade is by design; pointer activity wakes controls),
      reader immersive bar, Audio view (60 rows), one-voice stops, buffering/error
      toasts, offline-first resolution order in `services/player.js`.

# FEATURE AUDIT + IMPLEMENTATIONS (v5.2.0, 2026-09-04)

# `npm test`: 828/828 green (813 + 15 new). New domain modules are in the SW

# precache list (sw.js APP_SHELL) per the precache coverage gate.

#

# PART 2 (same day): About feature guide, hadith bookmarks, reminder presets,

# echo mode, ambient display, language plumbing. Suite: 845+/845 green.

Source: full audit of code + data + live web verification (sunnah.com) + `npm test` (813/813 green).
Priority order: 🔴 critical → 🟠 moderate → 🟡 minor/polish. Check off with `[x]` when fixed + re-verified.

## 🔴 Critical (fix before any release claim)

- [x] **T1 — Wrong hadith number on tawakkul dua (`data/duas.json`)**
      File: `data/duas.json` → `dua-mor-ex-002` ("Allahumma Anta Rabbi… alayka tawakkaltu…").
      Claims `Sunan Abi Dawud 5050`, but Abu Dawud 5050 is the bed-dusting dua
      ("Bismika Rabbi wada'tu janbi…", verified on sunnah.com).
      FIXED: now cites Ibn al-Sunni 'Amal al-Yawm wal-Laylah 57 / al-Tabarani al-Du'a 343,
      narrator Abu al-Darda via Talq ibn Habib, grade Daif ("very weak", Albani Silsilat al-Da'ifa 6420),
      honest virtues text. Documented in `data/SOURCES.md`.
- [x] **T2 — Ayat al-Kursi virtues conflates two hadiths (`data/adhkar.json`)**
      File: `data/adhkar.json` → `adh-mor-001` virtues (EN+AR).
      Text merges Muslim 810 (greatest-ayah dialogue with Ubayy — verified) with the
      "after every prayer → Paradise" narration (Nasa'i/Ibn Hibban) and the
      "before sleeping → no devil till morning" narration (Bukhari 2311 / Hakim),
      attributing the blend to "(al-Hakim, sahih)".
      FIXED: virtues split with separate cites — Muslim 810 / al-Nasa'i 100 (sahih per Albani) /
      Bukhari 2311, EN+AR; reference now Sahih Muslim 810. Same conflation fixed on
      `adh-eve-001` (dropped Hakim cite, now Muslim 810 + Bukhari 2311). Consistent with existing `adh-pos-003`.

## 🟠 Moderate (attribution / grading honesty)

- [x] **T3 — Tirmidhi 3391 wording/citation mismatch**
      Files: `data/adhkar.json` → `adh-mor-023` (morning …النُّشُورُ, cites Tirmidhi 3391);
      `adh-eve-014` (evening …الْمَصِيرُ, cites Tirmidhi 3391);
      `data/duas.json` → `dua-mor-ex-001`, `glm-topical-me-001/002`, `glm-jum-023`.
      Verified on sunnah.com: Tirmidhi 3391 morning ends وَإِلَيْكَ الْمَصِيرُ, evening ends
      وَإِلَيْكَ النُّشُورُ — the app uses the Hisn al-Muslim/Abu Dawud convention (morning=النشور).
      Both wordings are authentically attested, but the citation is imprecise.
      FIXED: all six items now cite "Sunan Abi Dawud; Jami' at-Tirmidhi (3391)" with a notes field
      explaining the wording direction; dropped the unverifiable "Muslim 2799" claim on
      adh-mor-023/adh-eve-014. Source: https://sunnah.com/tirmidhi:3391
- [x] **T4 — 99 Names list hides Tirmidhi 3507 weakness (`data/asma.json`)**
      File: `data/asma.json` metadata claims "authentic 99 Names … (Tirmidhi 3507)".
      The 3507 name-enumeration hadith is graded gharib/da'if by Tirmidhi himself and many scholars.
      Per-item `reference.url`/`notes` point to blogs (`myislam.org`, Yaqeen article URL in a hadith field).
      FIXED: metadata source + category description state the gharib grading (EN+AR); all 23 blog
      `url` fields moved into "Further reading" notes; 99 "Source:" labels renamed "Further reading".
- [x] **T5 — Ambiguous cross-reference (`data/quranic.json`)**
      File: `data/quranic.json` → `quranic-002` notes: "Also reported: Quran 23."
      The dua is Al-A'raf 7:23; "Quran 23" reads as surah 23.
      FIXED: notes now "Qur'an 7:23".
- [x] **S1 — `h()` HTML sink has zero callers today but no guard (`js/core/utils.js:214`)**
      `h()` supports `el.innerHTML = value` via `{html: …}`; grep confirms no current callers (good),
      but any future caller passing user/backup content = stored XSS.
      FIXED: `html` branch deleted, replaced with a comment forbidding re-adding it without a
      sanitizer + contract test.
- [x] **S2 — Static `index.html` file-notice uses `innerHTML` (`index.html:128`)**
      Self-contained static string (no user input) → not exploitable today, but it is the one
      unsanitized `innerHTML` assignment outside the escaped render pipeline.
      FIXED: annotated as static-only with a never-interpolate-without-escaping comment.

## 🟡 Minor / UX / resilience (polish, still actionable)

- [x] **U1 — Sub-44px touch targets in Manage stepper (`assets/css/cards.css:2759-2801`)**
      `.manage-seg__btn` (44×36) and `.manage-seg__value input` (52×36) fail the 44px-height rule
      the app itself gates elsewhere (`--touch-target: 44px`, `variables.css:185`).
      FIXED: both raised to `min-height: var(--touch-target)`.
- [x] **U2 — Sub-44px leftovers (`assets/css/quran.css:205` 36px; `cards.css:1540` 34px; `cards.css:1856` 40px; `cards.css:1811` 40px; `quran.css:1404` 40px tab)**
      Each has an explanatory comment, but they are still <44px exact-size controls.
      FIXED: `.tafsir-tab` (quran.css) + `.fast-dot` (cards.css) got `::after` hit-area expansion
      to 44px (documented .chip pattern). No change needed for `.ayah-card__badge`, `.hadith-card__number`
      (non-interactive badges, not touch targets) and `.event-row` (plain div, not clickable: calendar.js:72,284).
- [x] **U3 — 12px type below body floor (`assets/css/cards.css:1296`, `accessibility.css:183`)**
      12px is the gated floor for secondary text — acceptable — but verify tashkeel legibility
      at 12px in Amiri on 390px viewports; if the denominator/complement carries diacritics, bump to 13px.
      VERIFIED no change: cards.css:1296 is the focus-counter denominator (tabular numerals, no Arabic),
      accessibility.css:183 is a ✓ glyph. Neither carries tashkeel.
- [x] **U4 — Hardcoded EN fallbacks to sweep (`js/` grep `toLocaleString`, countdown units)**
      v4.1 localized most; do a final grep for raw "AM/PM", month names, and unit strings in
      `js/views/ramadan.js`, `js/views/prayer.js`, `js/domain/ramadan.js` and route through `t()`.
      VERIFIED no change: all `toLocaleDateString`/`toLocaleString` call sites already branch on
      `lang` (e.g. prayer.js:136-148, ramadan.js:271, calendar.js:72-74); no raw AM/PM or month names found.
- [x] **U5 — Real-browser pass (was: needs a real device; now: headless Chromium)**
      Pinch-zoom vs swipe-turn arbitration + wake-lock re-arm + 503-offline Retry on mushaf pages
      are all implemented; re-verify on a real device after T1–T5 edits since data edits touch the same views.
      DONE round-2b via headless Chromium (Playwright-bundled shell present on
      the machine; temporary harness, removed after the run — recreate with
      playwright-core + `python3 -m http.server`): all 9 routes render with
      ZERO console errors; counter-tap re-renders; settings TOC scrolls
      (scrollY 328); offline quran serves 107KB from SW cache (no blank, no
      skeleton-stuck); AR toggle sets dir=rtl lang=ar; back chevron mirrors
      (chevronRight in RTL, verified unit-level with seeded navBackStack);
      ambient shows the honest locationNeeded empty state + exit (no fake
      countdown without location); drawer/fs taps crash-free.
      STILL device-only (no headless equivalent): pinch-vs-swipe arbitration,
      wake-lock re-arm, haptics, adhan audio, compass sensor.
- [x] **U6 — Docs: stamp this audit**
      Append the verdict line to README release notes or `docs/` (e.g. "Inquisitor audit 2026-09-04:
      813 tests green; T1–T5 fixed; U1–U2 expanded to 44px") so the next audit starts from evidence.
      DONE: corrections log appended to `data/SOURCES.md` ("2026-09 independent audit corrections").

## Verified-clean (do NOT "fix")

- Qur'an corpus: Al-Fatiha + Al-Baqarah 255 byte-match the Uthmani-simple Tanzil text;
  `data/quran/` ↔ `quran-meta` verse counts gated by tests. No change.
- Sayyid al-Istighfar (Bukhari 6306), Rabbana atina refs (notes Bukhari 4522 / Muslim 2690),
  Muslim 810 greatest-ayah wording: verified correct. No change.
- Render pipeline: `js/ui/card.js`, hadith/quran/focus views escape all content via `escapeHTML`;
  Arabic nodes carry `lang="ar" dir="rtl"`; restore path enforces PERSISTED_KEYS allowlist
  (`js/core/state/restore.js:96`); custom reciter servers http(s)-validated
  (`js/core/config.js:703`); no API keys/secrets in repo; network limited to recitation CDN +
  on-demand tafsir + no analytics. No change.
- `npm test`: 813/813 green at audit time. Re-run after every fix (`npm run check`).

---

# Feature-request audit (2026-09-04) — what was claimed missing vs. reality

Most "missing" items already exist (verified by grep + test run). Only the
genuinely-missing, web-feasible items were built (A–D below, all tested).

## Already implemented — no work needed

- Qur'an: true fullscreen + reader immersive mode, wake lock (`js/app/fullscreen.js`),
  landscape two-page spread (`services/mushaf.js`), swipe page turns + pinch zoom
  (`app/events.js`), ayah-range playback with per-ayah repeat (`services/surahPlayback.js`
  `start({from,to,repeat})`, `REPEAT_CYCLE`), audio sleep timer, tajweed engine +
  drill, word study (POS/i'rab/verb-form/root), roots browser, tafsir tabs,
  paper themes, full-text search, reciter catalog + offline per-surah downloads
  with storage indicator (`views/audioManager.js`, `views/settings.js`).
- Prayer: 7-method astronomy, Qibla+WMM2025 compass, prayer log, sunnah tracker
  (`domain/sunnah.js`: duha/witr/tahajjud/rawatib), qada' backlog (`domain/qada.js`),
  traveler mode, multiple saved location profiles, custom adhan import,
  suhoor/iftar alerts, "Open in Maps" nearby-mosque link (`views/prayer.js:446`),
  PWA shortcuts (Qur'an/Morning/Evening/Tasbih in `manifest.json`).
- Adhkar: focus mode with auto-advance, haptics + tick sound + ripple, tasbih
  counter, favorites/collections/notes, mood browsing, dua journal
  (`domain/duaJournal.js`), sadaqah log (`domain/worship.js`), Zakat al-Fitr
  (`domain/zakat.js` `computeFitr`), Jumu'ah dua content in library.
- Hifz: SRS engine with struggled→1-day ladder, cloze word/ayah modes, due
  tracking, mutashabihat drill view (`views/mutashabihat.js`), multi-profile
  records (`initial.js:238`), khatma planner with on-track projection
  (`domain/khatma.js`), certificates, plan export/import (`domain/planExport.js`).
- Settings already carried `quranTranslationB` + `tasbihMilestone` keys with
  sanitizers but no UI — wired up by A and B below.

## Implemented 2026-09-04 (all with tests, 828/828 green)

- [x] **A — Translation-compare view.** `quranTranslationB` was a dead setting;
      now a "Compare translation" picker in Settings + second-translation line
      under each ayah in the classic reader (own dir/lang/edition label, CSS
      `ayah-card__translation--compare`). Files: `domain/translationCompare.js`,
      `app/quranData.js` (`ensureTranslationBDoc`, single-flight, silent-fail),
      `app/lazyData.js` hook, `views/quran.js`, `views/settings.js`,
      `assets/css/quran.css`, i18n `settings.compare*`, `tests/translationCompare.test.js`.
- [x] **B — Tasbih milestone ping.** `tasbihMilestone` was a dead setting; now
      every Nth tap gives a stronger buzz + higher tick (skipped on cycle-complete
      taps), with Off/10/25/33/50/100 chips in Settings → Counting feedback.
      Files: `domain/celebrate.js` (`milestoneHit`), `services/tasbih.js`,
      `views/settings.js`, i18n `settings.milestone*`, `tests/milestone.test.js`.
- [x] **C — Prayer-times .ics export.** "Export today's times (.ics)" row in the
      Prayer ⋯ menu → downloads a floating-local-time calendar file (15-min events,
      polar fallbacks excluded, midnight-wrap correct). Files:
      `domain/prayerExport.js`, `app/handlers/viewMenus.js` (`prayer-export-ics`),
      `views/viewSheets.js`, i18n `prayer.sheet.exportIcs`/`prayer.exportedIcs`,
      `tests/prayerExport.test.js`.
- [x] **D — Full-day prayer timeline.** Strip above the times list: six dots
      (next prayer filled) + moving "now" line, `dir=ltr` like a clock face,
      `role=img` with localized label; rows stay canonical. Files:
      `domain/prayerTimeline.js`, `views/prayer.js`, `assets/css/cards.css`,
      i18n `prayer.timelineLabel`, `tests/prayerTimeline.test.js`.

## Scoped follow-ups (verified missing, NOT built — need data/view/routes work)

- [x] Tafsir compare (second source column under the active tab; `settings.tafsirCompareB`,
      bundled + cached-remote only — remote fetch stays on the primary tab's download flow).
- [ ] Grammar-flashcard drill UI on the existing word-morphology data
      (`data/quran-words/` has POS/case/mood/verb-form per word).
- [x] Listen-and-repeat mode, reciter A/B compare, A–B range loop ×N
      (engine `loop`/`loopsLeft`, range-picker loop select, console loop chips).
      Still open: cross-surah playback ranges (stop at surah S ayah Y).
- [x] Verse speed control (0.5–2×, live, persisted `audio.verseRate`) + lock-screen
      Media Session controls (prev/next ayah or surah + metadata, `services/mediaSession.js`).
- [x] Recitation queues (playlists): persisted named `[{surah,from,to}]` lists, engine
      queue advance with junk-skipping + prefetch, Audio-view panel, save-from-range,
      queue position in all consoles, toggle-play. (`state.playlists`, `PLAYLIST_*`.)
- [x] Reading session timer: wall-clock in Qur'an/Mushaf banks into
      `dailyHistory[key].readingSec` (nav/tab-hide/pagehide flush), Statistics
      "Reading today" card. (Also fixed `STATISTICS_RECORD` wiping sibling day keys.)
- [x] Time-of-day adhan volume schedule: day volume + quiet-hours window at its own
      volume (`effectiveAdhanVolume`, wraps midnight), applied to adhan + tones;
      OS notification sound stays system-controlled (documented in UI).
- [ ] Long-press ayah quick actions.
- [ ] Uthmani vs IndoPak script toggle; multiple qira'at text (data project).
- [x] Hadith bookmarks + personal notes (`hadithNotes`, per-card note button + note
      display + modal editor, persisted + restore-sanitized, capped).
- [ ] Hadith memorization + adhkar-by-heart modes reusing the hifz SRS engine.
- [ ] Jumu'ah (Surah Al-Kahf) + daily-verse OS notification presets on the
      existing reminder scheduler (`services/notifications.js` `makeReminder` supports
      deep-link `targetView`).
- [ ] Shake-to-count (needs DeviceMotion permission UX + flakiness handling).
- [ ] Contextual home-panel reorder; time-of-day reading insight from local stats.
- [ ] App-wide second profile (hifz-only multi-profile exists); kids' mode.
- [ ] Auto-silence/DND during prayer: NOT feasible on the web (no browser DND API) —
      document as native-wrapper-only.
- [ ] Cross-device sync: needs a transport; explicitly out of scope for zero-server.
- [ ] Recitation playlists/queue — saved named lists of (surah, from, to) ranges played
      in order through the verse engine (research 2026-09-05: Quran.com/Muslim Pro parity).
- [ ] Monthly prayer timetable export/print (daily .ics exists; add month grid + print CSS).
- [ ] Elderly/low-vision one-tap mode (XL type + high-contrast + simplified nav preset).
- [ ] Verse transliteration line under the Arabic in the classic reader (data check:
      confirm per-ayah transliteration exists in `data/quran/` before building).

## Implemented 2026-09-04, part 2 (all tested)

- [x] **About → feature guide.** New "Feature guide — tap to open" panel on the
      About page: 12 tappable rows (Mushaf, Qur'an, Ahadeeth, Library, Prayer,
      Qibla, Tasbih, Ramadan, Zakat, Journal, Calendar, Statistics), each with a
      one-line helper and a deep link (existing `navigate` action only — no new
      handlers). Files: `views/about.js`, `assets/css/cards.css` (44px rows, RTL
      chevron flip), 16 i18n keys EN+AR (`about.guide*`, `about.gd.*`).
- [x] **Hadith bookmarks.** Bookmark toggle on every hadith card (4th action
      beside copy/share/listen), "Bookmarked" filter chip with live count in the
      book reader, persisted `hadithBookmarks` (`<bookId>:<n>` keys, allowlist
      sanitizer, 1000-cap). Files: `core/state/{initial,actions,reducer,restore}.js`,
      `views/hadith.js`, `app/handlers/items.js` (`hadith-bookmark`), 6 i18n keys
      EN+AR, `tests/hadithBookmarks.test.js`.
- [x] **Reminder presets.** One-tap "Friday: Surah Al-Kahf" (recurring Friday
      calendar note via interval:7 anchored on a Friday, fires as OS notification)
      and "Daily verse" (morning reminder deep-linking home) in Settings →
      Notifications; idempotent with already-added toast. Files:
      `domain/reminderPresets.js`, `app/handlers/system.js` (`add-preset`),
      `views/settings.js`, 9 i18n keys EN+AR, `tests/reminderPresets.test.js`.
- [x] **Listen-and-repeat (echo) mode.** Recitation-console chip: after each
      ayah holds 8s silence for recite-back, then advances; "Your turn" banner;
      skip/stop/mode-off/repeat-change cancel pending pauses (token+key guarded,
      no stale advance); ends cleanly at last ayah. Files:
      `services/surahPlayback.js`, `views/playerBar.js`, `app/handlers/quranAudio.js`
      (`recite-echo-toggle`), `app/boot.js` mirror, 5 i18n keys EN+AR, CSS banner,
      5 new engine tests in `tests/surahPlayback.test.js`.
- [x] **Ambient nightstand display.** New `#/ambient` route: giant next-prayer
      countdown (tested `nextPrayerCountdown()`), place + date, chrome hidden via
      `body.is-ambient` (same contract as mushaf fullscreen), wake lock while open
      (separate handle + route lifecycle + tab-return re-arm), exit button, entry
      in Prayer ⋯ menu. Files: `views/ambient.js`, `app/renderer.js`,
      `app/stateSub.js`, `app/fullscreen.js`, `assets/css/{layout,cards}.css`,
      `views/viewSheets.js`, 4 i18n keys EN+AR.
- [x] **Language plumbing.** `LANGUAGE_LABELS` + `languageLabel()` registry
      (Settings switcher no longer hardcodes two languages), `docs/ADD-LANGUAGE.md`
      recipe (copy dict → translate values → register → sanitizer allowlist →
      parity gate → native-speaker review), with suggested order Urdu → Bengali →
      Turkish → French → Indonesian.

## Arabic-content backlog (measured 2026-09-04, NOT translated)

UI chrome is fully bilingual (parity-gated). Library _content_ gaps — items
missing the Arabic side (English fallback shows instead). counts = items:

- `duas.json` (527): missing AR meaning 393 · AR virtues 419 · translit 213
- `adhkar.json` (168): missing AR meaning 52 · AR virtues 49 · translit 2
- `asma.json` (99): AR virtues 99 (names themselves are Arabic + transliterated)
- `daily-sunnah.json` (69): AR meaning 21 · AR virtues 46
- `pdf-duas.json` (75): AR meaning 32 · AR virtues 28
- `prophet-duas.json` (59): AR meaning 28 · AR virtues 28
- `reflections.json` (68): AR meaning 20 · AR virtues 20
- `special-days.json` (24): AR meaning 24 · AR virtues 24
- `quranic.json` (103): complete.

Deliberately unfilled by automation: these are religious meanings, not UI
strings — machine-filling them would violate the "never paraphrase a sacred
text" rule. Needs qualified human translators, file by file. Note the Arabic
_matn itself is always present_; English mode already shows matn + EN meaning.

---

# Digital Inquisitor audit, round 2 (v5.1.0 post-refactor, 2026-09-04)

Method: zero-memorization web verification (quran.com, sunnah.com) for every
text below; static read-only code audit (no live browser available — Phase 4
journeys verified against code + test gates, not pixels); full suite
845/845 green + `npm run lint` clean after the v5.2 refactor
(slices/ + config/ split, SW precache completion). No destructive input
testing performed. Prior findings T1–T5, S1–S2, U1–U6 NOT repeated here.
Priority order: 🔴 critical → 🟠 moderate → 🟡 minor. Check off with `[x]`.

## Verdict: 🌿 Jannah (minor polish only)

No critical theological errors, no reachable XSS/RCE, no data exfiltration,
offline-first honesty holds. One must-fix attribution error (T6), one
defense-in-depth hardening (S3), and minor/moderate UX polish (U7–U15).

## 🔴 Critical

None. Quran corpus samples (Al-Fatiha, 2:255, 114:1) match quran.com
Uthmani script word-for-word; Bukhari #1 matches sunnah.com with full isnad;
Quran-extracted adhkar graded `Quran` with verbatim notes; grades honest
(`Daif`/`Unknown` labeled, never inflated).

## 🟠 Moderate (fix before release claim)

- [x] **T6 — Wrong narrator on morning dua (`data/adhkar.json` → `adh-mor-010`)**
      Claims narrator "Abu Hurayrah", Sahih Muslim 2723. Verified on sunnah.com:
      Muslim 2723a is narrated by **Abdullah ibn Mas'ud** (عَنْ عَبْدِ اللَّهِ بْنِ
      مَسْعُودٍ; evening wording أَمْسَيْنَا, morning counterpart 2723b أصبحنا of
      the same narration). The Arabic matn itself is correct — only the narrator
      name + notes ("taught Abu Hurayrah") are wrong.
      FIXED: `adh-mor-010` + evening twin `adh-eve-010` (same error) now name
      Abdullah ibn Mas'ud, cite "Sahih Muslim; Sunan Abi Dawud" 2723; 5071
      (Abu Dawud 5071 verified same narrator, sahih per Albani), virtues
      rewritten to the verified wording (EN+AR). Logged in `data/SOURCES.md`.
      Source: https://sunnah.com/muslim:2723
- [x] **S3 — `__proto__` pollution via crafted backup import (defense in depth)**
      `SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/` **accepts `__proto__`**, so
      `out["__proto__"] = …` assignments pollute: `js/core/config/sanitize.js`
      `cleanFlags/cleanTargets/cleanOrders/cleanItemOverrides/cleanMetaOverrides/
cleanAddedItems/cleanAddedCategories/cleanFieldToggles` (+ `cleanHadithPrefs`
      flag maps), `js/core/state/restore.js:103,226,231,235` (`asObject`
      passthroughs: tajweedPracticeStats.byRule, quranWords, tasbih, ramadanLog,
      dailyChecklist), `restore.js:127-134` `hifzProfileStore`, `restore.js:276`
      `counters`, `restore.js:375` `statistics.favoriteCategories`,
      `js/core/schema.js:201-210` `normalizeCustomContentMap`.
      Reachability: crafted backup file / hand-edited localStorage imported by
      the victim (self-import only — no remote vector, no XSS sink reached;
      stored XSS boundary itself holds: `escapeHTML` + PERSISTED_KEYS allowlist
  - http(s) server validation all verified intact).
    FIXED: shared `isSafeKey()` + `cleanObject()` in `js/core/utils.js`,
    applied at every sink above AND the downstream index sinks
    (`app/net.js` buildItemIndex/documents, `domain/contentLens.js`
    lensLibrary) plus `sanitizeUserItem/Category` ids; hostile regression
    suite `tests/protoGuard.test.js` (7 tests). Full suite 852/852 green.
- [x] **U12 — `#/ambient` route missing from the navigation spec
      (`docs/APP-FLOW.md`)**
      29 routes specified; `VIEWS` has 30 — AMBIENT (v5.2.0, `views/ambient.js`,
      `renderer.js` `is-ambient`) has no spec row/back path, violating the
      "new routes are added to that file BEFORE the view" rule.
      FIXED: §2.1 now lists 30 routes with the ambient row (Prayer ⋯ menu entry,
      exit ✕ → prayer) and §5 gained the ambient column (chrome hidden, own ✕,
      route-scoped wake lock released on leave).
- [x] **U14 — Settings is one ~30-control scroll (`js/views/settings.js:151-259`)**
      11 panels (10 palettes, 8 shapes, sliders, reciter + 2 translation lists,
      6 card-field toggles, notifications, data). No memorization forced, but
      high cognitive load for low-vision/motor-impaired users.
      FIXED: sticky in-page table of contents (11 section-jump chips reusing the
      panel headers + 1 new `settings.toc` key EN/AR, panels carry
      `settings-sec-*` ids with scroll-margin, `settings-toc-go` handler
      scrolls without touching the hash router and respects reduceMotion).
      Files: `views/settings.js`, `app/handlers/system.js`,
      `assets/css/components.css` (`.settings-toc`), `core/i18n/{en,ar}.js`.

## 🟡 Minor (polish)

- [x] **U7 — Topbar back chevron never mirrors in RTL (`js/ui/shell.js:122-124`)**
      Always `chevronLeft`; Mushaf/reader nav already swap correctly.
      FIXED: `isRTL(lang) ? chevronRight : chevronLeft` (`js/ui/shell.js`).
- [x] **U8 — Physical `left/right` in book CSS (`assets/css/quran.css:545-594,943,946`)**
      Likely intentional (fixed physical book), but fragile under RTL.
      FIXED: documented as intentional with `physical: fixed book edges` comments
      (zones are positional screen edges; chevrons inside already swap per RTL;
      corner ornaments exist symmetrically in all four positions).
- [x] **U9 — Missing `lang="ar"` on Arabic nodes (`js/views/tafsirPanel.js:222,404,447`)**
      `dir="rtl"` present but no `lang` (siblings at :153,161,191,252,347 have it).
      FIXED: `lang="ar"` added to the word-study root text and the Mushaf font
      sample (the bismillah sample already had it — no change there).
- [x] **U10 — Small touch targets without 44px expansion**
      `.icon-btn--sm` 36px (`components.css:166-175`, hit via `::after` only —
      helps touch, not sighted aiming); `.chip__x` 36px with NO `::after`
      (`components.css:254-264`); `.tajpick__swatch` 32px, no `::after`, and
      `:focus-visible` removes the outline (`quran.css:2138-2155`); `.qword`
      inline spans with no padding (`quran.css:255-268`); `.quran-window-load`
      sentinel no `min-height` (`quran.css:2078-2085`).
      FIXED: `::after` hit expansion added to `.chip__x`, `.tajpick__swatch`
      (32px dot kept; visible `:focus-visible` ring was already present via
      `--shadow-focus` — kept), vertical-only expansion on `.qword`/`.pu`
      (inline layout untouched, no neighbor-tap stealing), `min-height:
var(--touch-target)` + centering on `.quran-window-load`. `.icon-btn--sm`
      already had the expansion — no change.
- [x] **U11 — Nav landmarks (`js/ui/shell.js:162,178`)**
      `div[aria-label]` (label ignored without role) and `<div
role="navigation">`. FIXED: both are now `<nav>` (class hooks unchanged,
      CSS/test selectors unaffected).
- [x] **U13 — Hadith view has no error branch (`js/views/hadith.js:21,95,248`)**
      Only `skeletonHadithCard` imported — no `loadErrorStateHTML` + Retry like
      quran/mushaf/search/tafsir/audio. FIX: add the error branch if the hadith
      tier is lazy; if the corpus is always local, comment why.
      VERIFIED no change: the finding was inaccurate — both the book grid
      (`indexFailed` → `hadith.loadFailed` + `hadith-retry-index`) and the book
      reader (per-book `errors` → `hadith.loadFailed` + `hadith-retry`, handlers
      in `app/handlers/items.js:303-307`) already render error + Retry. The
      bespoke `indexFailed` flag predates the shared `loadErrorStateHTML`
      helper, which is why the import scan missed it.
- [x] **U15 — Mushaf fullscreen tap zones in the AT tree
      (`js/views/mushafReader.js:293-294`, `quran.css:927-947`)**
      `tabindex="-1"`, transparent, no `aria-label` — pointer-only by design,
      keyboard path via the fs bar. FIX: add `aria-hidden="true"`.
      VERIFIED no change: the parent `.mushaf-fs-taps` already carries
      `aria-hidden="true"`, which hides the whole subtree (both buttons) from
      assistive tech — the finding missed the wrapper.
- [ ] **T7 — `Unknown`-grade review backlog (`data/duas.json`: 178 `Unknown`)**
      Honest labeling (not inflated to Sahih) — kept as backlog, not an error.
      FIX: scholar review pass to confirm-or-grade, file by file; never
      machine-fill (same rule as the Arabic-content backlog above).
      PROGRESS round-2b (2026-09-04, 178 → 98): every item's Arabic was
      content-matched against the bundled hadith corpus (34k docs, tashkeel-
      stripped), then each cited number was verified on sunnah.com and each
      grade taken from sunnah.com (Darussalam/Albani verdicts) — never from
      memory. Resolved 80: ~45 → Sahih (Sahihayn-verbatim or Albani/Darussalam
      Sahih), ~15 → Hasan, ~10 → Daif (incl. 1546/1555/3483/3516/3491/3520/
      3586/3599/3833 — labeled weak, not hidden), 1 → Quran (3:173 phrase),
      1 corrupt fragment fixed to its sourced wording (my-03-009 → 3599 tail).
      8 wrong citations corrected in the process (adhkar T6-style): 2191→5743,
      763→6316, 589→6377 (×2 items), 590→6367, 2730→Muslim 2730, 2707→Muslim
      2707, 1742→4115, 824→3742, 2654→2655, 1547→1546 (my-14-018), 3484→3235,
      2723-narrator (T6), plus new citations added where text matched
      (985/850/5085/3846/3586/3419/3599/3833/3173). Full per-item proof in the
      session record; spot-check any item via its sunnah.com number.
      STILL OPEN (~98): Tabarani/Ahmad/Hakim/Bazzar/Bayhaqi/Ibn-Abi-Shaybah/
      Abu-Ya'la/Adab-al-Mufrad/man-yaduni items (no bundled corpus to match;
      need per-item takhrij), paraphrase-derivations (my-02-013, my-03-012),
      no-source stubs (my-04-010). Method for continuation: content-match
      script (normalize tashkeel → substring windows) + sunnah.com number
      check + Darussalam/Albani grade; keep Unknown where unverifiable.

## Verified-clean round 2 (do NOT "fix")

- Phase 1: 2:255, 1:1-3, 114:1 ↔ quran.com; Bukhari 1 ↔ sunnah.com (isnad +
  matn); Muslim 810/Ubayy, Tirmidhi 3391/Abu Hurayrah (+Darussalam Sahih
  grading) re-verified. Asma list = 99 items. No عقيدة/textual errors found.
- Phase 2: zero analytics/telemetry/keys (network = same-origin data +
  user-tapped CDN/tafsir/maps only); SW 503 offline stub (no cache
  poisoning); notification-plan mirrors sanitized; no `RegExp` built from
  user queries (no ReDoS); no `eval`; no disabled security checks; storage
  plaintext-by-design (local-only, no secrets exist). Only S3 hardening above.
- Phase 3/4 (static): body ≥16px, `--lh-arabic` 2.05–2.15, Amiri preload +
  swap, 12px type floor holds, `lang/dir` set at runtime, modal focus
  trap + restore, skip-link + landmarks, forced-colors + reduced-motion +
  high-contrast gated by tests, error+Retry on every lazy tier (except U13),
  dead-`data-action` gate green, no forced-memorization flows. Only U7–U15.
- Phase 4 limitation: no live browser in this environment — state
  transitions (patch engine, modal/drawer/fullscreen lifecycles, entry-link
  gate) verified against code + gates; U5 (real-device pass) still open.
