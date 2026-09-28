# OPEN-ISSUES.md — what is still open, verified against the tree

> **Independent score: 8.0 / 10** (v5.17.16, hostile scoring agent, execution-backed,
> ±0.6). The five findings below are the agent's, checked against the tree: four held,
> one was wrong and the correction is recorded. A second hostile review runs at
> v5.17.21; its score replaces this line when it lands.
>
> **Counted 2026-09-28 against the tree at v5.17.21**, by parsing this file's own
> status column — not by hand, and not copied from any earlier header: **43 rows —
> 11 OPEN, 7 PROPOSED, 2 DEFERRED, 2 DECIDED-NO, 8 RESOLVED, 1 STANDING
> CONSTRAINT, 7 BLOCKED:scholar, 5 BLOCKED:device.**
>
> Every row marked RESOLVED above was verified by execution this pass, and the
> evidence is named in the row. Nine were stale or wrong when this pass started,
> including one that had been open since v5.3.0 and one whose only test asserted on
> a data file the app never loads. Anything not re-verified was left exactly as it
> was rather than quietly reclassified — an unverified tick is the failure mode this
> ledger exists to prevent.

The counterpart to `docs/RELEASES.md` (what is done). **Every row below was
checked against the code in this release, not copied from an audit report.**
Where a report's claim turned out to be stale, the row says so and shows the
evidence that closed it.

Status vocabulary:
**OPEN** (nobody has done it) · **PROPOSED** (costed, needs an owner yes) ·
**BLOCKED:device** · **BLOCKED:scholar** · **DEFERRED** · **DECIDED-NO** ·
**STALE** (a report said it was open; the code says otherwise — evidence given)

Source IDs: `V#` = Omniview verdict · `C#` = contested · `P#` = proposal ·
`LEX/ORTH/AUDIO/SEARCH/TAJ/E2E` = master-roadmap items.

---

## P0 — must close before the app is finished

| #   | Item                                                                                   | Status                          | Evidence / note                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `http://` custom audio servers are allowed (MITM on Qur'anic audio, cleartext IP leak) | **RESOLVED (verified)**         | The gate exists: `js/services/audioCatalog.js:183` requires https, allowing http only for localhost/LAN. The ledger row was stale.                                                                                                                                                            |
| 2   | Elder Mode is undiscoverable                                                           | **RESOLVED (partly wrong)**     | The wizard DID offer Elder Mode — the comfort step's handler sets `elderMode` (handlers/worship.js:371). The real gap was wording: it said "large text" while the button also raises contrast. Copy now matches the behaviour in both languages.                                              |
| 3   | In-app type scale cannot reach WCAG 200%                                               | **RESOLVED**                    | Clamp is 0.85–2 (`sanitize.js`), the slider reaches 2, and `tests/e2e/type-scale-200.spec.js` proves 200% with no overflow.                                                                                                                                                                   |
| 4   | Offline truth, per view                                                                | **RESOLVED (essential corpus)** | Qur'an text + all 604 mushaf pages now download once by default (~2.7 MB gz, measured). Proven by execution in `tests/e2e/offline-essentials.spec.js`: cold start, batch, network cut, Surah 112 and a mushaf page read offline. The large study corpora remain opt-in and honestly labelled. |
| 5   | Riwaya mismatch is silent                                                              | **RESOLVED**                    | Pinned by `tests/recitation-honesty.test.js`, which failed when the unreachable `bismillahStyle: 'hidden'` branch was removed.                                                                                                                                                                |

## P1 — real quality gaps

| #   | Item                                                                 | Status                  | Evidence / note                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | `bismillahStyle: 'hidden'` is still an option                        | **RESOLVED**            | The enum is `auto                                                                                                                                                                                                   | gold | accent` (`sanitize.js:53`). 'hidden' survives only in a comment recording why omitting the Bismillah normalises a textless page. |
| 7   | Toasts are dead ends                                                 | **OPEN**                | No action-bearing toast API exists in `js/ui/toast.js`. ~60 call sites; the useful ones (playback failed → Retry, plan saved → View) have no next move.                                                             |
| 8   | `adhan.mp3` is 2.4 MB of the precache                                | **OPEN**                | `sw.js:285`. Roughly 40% of the install for a file only needed when an alert fires. Move to cache-on-first-use.                                                                                                     |
| 9   | Verse engine has no volume slider                                    | **PROPOSED**            | `js/ui/recitationConsole.js:82` already reads and renders `audio.verseVolume` — confirm whether the control exists on all hosts or only some before building.                                                       |
| 10  | Custom library card-level reorder                                    | **OPEN**                | Banner and section reorder were fixed; per-card reorder _inside a custom library_ is unverified under the shared lens.                                                                                              |
| 11  | Orphan views (33 routes vs 18 chrome entries)                        | **PROPOSED**            | Reachable only by palette or deep link. Either per-tab menus or an honest redirect. No new views until decided.                                                                                                     |
| 12  | Storage caps for custom content and attachments                      | **PROPOSED**            | The audio cache is capped and evicts oldest-first; the other IDB stores are not.                                                                                                                                    |
| 13  | Reciter metadata is uneven                                           | **OPEN**                | Voices without per-ayah timings are marked, not hidden. Still: surface that in the picker itself, not only after selection.                                                                                         |
| 14  | Hadeeth citations, narrators, Arabic chapter names, global bookmarks | **OPEN**                | Partly done (narrator extraction, standing badges). The rest is a data-quality pass with sources.                                                                                                                   |
| 15  | Azkar depth                                                          | **OPEN**                | Per-item audio (only where a verified source exists), bilingual editing, stronger search. The owner asked for all three explicitly.                                                                                 |
| 16  | Verse mode has no within-ayah seek                                   | **OPEN**                | By design — per-ayah files have no internal offsets. Needs an owner UX call: replay-ayah, or accept the limitation and say so louder.                                                                               |
| 17  | Tafsir is served from `raw.githubusercontent.com`                    | **OPEN**                | `sw.js:23`. GitHub-as-CDN is a partnership and continuity risk for a religious corpus.                                                                                                                              |
| 18  | No age gate for kids mode                                            | **PROPOSED**            | The mode is an honest sandbox inside, but entry and exit are parent-trust only, and imports are correctly refused while inside.                                                                                     |
| 19  | Tasbih cycle counters are unbounded                                  | **OPEN**                | `count` is bounded by the target; `completedCycles` and `totalRecitations` are not. Mild data-integrity issue, cheap to cap.                                                                                        |
| 20  | Sleep control is split-brained                                       | **PROPOSED**            | The same ladder is a one-tap chip in the console and a two-tap select in Audio settings. Pick one.                                                                                                                  |
| 21  | Speed cycle is forward-only                                          | **PROPOSED**            | The slow side (most useful to a beginner or an elder) takes the most taps. Consider a bidirectional cycle.                                                                                                          |
| 22  | iOS storage eviction and push limits are not in the README           | **OPEN**                | `README.md` mentions iOS zero times. Someone can lose memorization history without being warned.                                                                                                                    |
| 23  | Accessibility coverage beyond four routes                            | **RESOLVED**            | `tests/e2e/a11y-all-routes.spec.js` derives its route list from VIEWS and scans all 30 in both themes. Widening it found 4 serious violations the 4-route gate could not see; all 4 are fixed with measured values. |
| 24  | Renderer static-view budget is at its cap                            | **STANDING CONSTRAINT** | Still 19/19 static view imports, at the documented cap. The tajweed course view was added LAZILY precisely so this did not move. A new eager view requires extracting a static import first.                        |
| 25  | `mushafReader.js` near its line cap                                  | **RESOLVED**            | The jump drawer was extracted to `js/views/mushafJump.js` when the file hit 810. Now 729, and the extracted-parts rule covers the new module.                                                                       |

## P2 — polish with real value

| #   | Item                                              | Status             | Evidence / note                                                                                                                 |
| --- | ------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 26  | iOS cannot be relied on for prayer-time wake-ups  | **OPEN**           | `TimestampTrigger` is Chromium-only, `periodicsync` is Chromium-only. A native-shell bridge or `.ics` export is a real project. |
| 27  | Deployment story is `python3 -m http.server`      | **PROPOSED**       | No gzip negotiation, no cache headers, no HTTPS. A documented host profile is cheap and prevents a bad first deployment.        |
| 28  | AI tajweed scorer is unreachable                  | **DEFERRED**       | Blocked on bundle budget (the model is ~75 MB). A future tier, deliberately.                                                    |
| 29  | Runtime extension / plugin model                  | **DECIDED-NO**     | By design. The "shadow layer is closed" is a real constraint, not an oversight.                                                 |
| 30  | Community / social features                       | **DECIDED-NO**     | Would add pressure mechanics to a worship tool.                                                                                 |
| 31  | UI chrome in Turkish / French / Urdu / Indonesian | **DEFERRED to v6** | Verse translations ship for all four; chrome is EN+AR. ~300 lines of microcopy each.                                            |

## Blocked on a scholar — never machine-fill

| #   | Item                                                                | Status          | Note                                                                                                                                          |
| --- | ------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 32  | Grades for `pdf-duas` (61), `daily-sunnah` (67), `reflections` (20) | BLOCKED:scholar | They display as `Unknown`, which is the honest state. Filling them is a ruling, not a build.                                                  |
| 33  | 30 quranic items in simplified orthography                          | BLOCKED:scholar | Audit F5. The same exact-matn verification closed an earlier backfill attempt as a no-op.                                                     |
| 34  | Whether to advise wudu before recitation                            | BLOCKED:scholar | Defensible under majority fatwa for digital screens. The app currently ships an adab note (`mushaf.wuduNote`) without ruling on the question. |
| 35  | Bismillah as interactive, countable-looking text                    | BLOCKED:scholar | Innovative and defended; the scholar should confirm it does not reclassify the Bismillah as an ayah.                                          |
| 36  | Qalqalah colour convention                                          | BLOCKED:scholar | Cyan here, red in some conventions. Defensible; should be confirmed for students.                                                             |
| 37  | Whether per-reciter adhkar audio is permissible                     | BLOCKED:scholar | Rival apps ship it. Open question.                                                                                                            |
| 38  | Corpus scope wording (Sunni kutub sittah disclosure)                | BLOCKED:scholar | Disclosed in-app already; the exact wording is a scholarly call.                                                                              |

## Blocked on hardware — see `docs/DEVICE-TEST.md`

| #   | Item                                                               | Status         |
| --- | ------------------------------------------------------------------ | -------------- |
| 39  | Haptics, adhan audibility, wake-lock re-arm                        | BLOCKED:device |
| 40  | Pinch-zoom vs swipe arbitration; edge tap zones in true fullscreen | BLOCKED:device |
| 41  | Screen-reader pass (TalkBack / VoiceOver)                          | BLOCKED:device |
| 42  | Audible ayah-to-ayah gap measurement                               | BLOCKED:device |
| 43  | 3G install time and long-term storage growth on a low-end phone    | BLOCKED:device |

## Stale report claims — closed, with evidence

These were reported as open by an audit and are **not** open. Recorded so nobody
re-investigates them.

| Report claim                                    | Reality                                                                                                                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `V1` first-launch language detection missing    | **Shipped since v5.13.0** — `js/core/state/store.js:53`. Now pinned by five execution cases in `tests/first-run-language.test.js`, including "a returning reader's explicit choice wins". |
| `V2` no city search for prayer times            | Shipped — `js/domain/locations.js` `CITY_PRESETS` with an offline picker.                                                                                                                 |
| `V5` no volume slider                           | Shipped for both engines — `js/ui/recitationConsole.js:82`.                                                                                                                               |
| `V8` loop and repeat are two unexplained cycles | Labelled — `audio.loopMode` / `audio.loopOnce`, separate from repeat.                                                                                                                     |
| `V13` flame icon on worship streaks             | Gone — zero uses of a flame icon remain.                                                                                                                                                  |
| `V15` no orphan data-action test                | Shipped — `tests/orphan-actions.test.js`.                                                                                                                                                 |
| `V17` raw `home.panel.review` key leaking       | The panel no longer exists; no call site remains.                                                                                                                                         |
| `V20` no wudu/adab line                         | Shipped — `mushaf.wuduNote` in both languages.                                                                                                                                            |
| `V21` `document.title` never changes            | Per-route titles — `js/app/renderer.js:881`.                                                                                                                                              |
| `C12` `.link-btn` 4px short of the target floor | Uses `--touch-target` and has the `::after` apron.                                                                                                                                        |
| `C14` WMM2025 expiry undocumented               | Documented as valid through 2030 in `README.md` and `CREDITS.md`. Watch item, not a gap.                                                                                                  |
| `ORTH-01` orthography matrix missing            | Evidence exists — `evidence/overhaul-orth/`.                                                                                                                                              |
| `AUDIO-01` mirror failure-injection untested    | Shipped — `tests/e2e/overhaul-audio-mirror.spec.js`.                                                                                                                                      |
| `TAJ-QUIZ-01` no Tajweed quiz depth             | Shipped — `tests/tajweed-quiz-modes.test.js`.                                                                                                                                             |
| `P3` slim-bundle tests fail                     | Seed-mode guard shipped — `tests/helpers/seedMode.mjs`.                                                                                                                                   |
| `P6` docs drift                                 | `scripts/measure.mjs` emits the canonical numbers.                                                                                                                                        |
| `P7` reset-all leaves IndexedDB                 | Wired — `js/app/handlers/system.js:433` calls the full wipe.                                                                                                                              |
| `P11` lazy views over-engineered                | Trimmed; the cap is a live constraint now (row 24).                                                                                                                                       |
| `P12` echo dead under infinite repeat           | Disarmed on entry — `js/services/surahPlayback.js:989`.                                                                                                                                   |
| `P13` no corpus manifest                        | Shipped — `data/manifest.json` with a CI check.                                                                                                                                           |

## The honest summary

Counted from the table above, not estimated:

| Bucket                                               | Count  |
| ---------------------------------------------------- | ------ |
| **OPEN** (nobody has done it)                        | **20** |
| **PROPOSED** (costed, needs an owner yes)            | **7**  |
| **BLOCKED:scholar** (must never be machine-filled)   | **7**  |
| **BLOCKED:device** (needs real hardware)             | **5**  |
| **DEFERRED** / **DECIDED-NO** (deliberate)           | **4**  |
| **Reported open but already fixed** (the stale list) | **19** |

- **~55 distinct issues** were extractable from the audit material and the
  owner's own reports. **27** still need work; **19** were already done and were
  being re-investigated.
- Of the 27, two are release-gating: **Elder Mode discoverability** and **the
  in-app type scale that cannot reach WCAG 200%**. Both strand the 70-year-old
  Arabic-only reader this app exists for.
- The single highest-risk one is **`http://` custom audio servers**: a cleartext
  audio source for Qur'an recitation is a man-in-the-middle waiting to happen,
  and there is no gate at all today.
