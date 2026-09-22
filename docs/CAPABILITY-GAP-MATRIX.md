# Capability-gap matrix — Nur al-Dhikr vs documented rivals (RIVAL-01)

Status: documentation only (plan task RIVAL-01). No code changes proposed
here ship without their own plan tasks. Rival capabilities are taken from
their public product pages/listings as of 2026 (links at the bottom), not
from installed-app teardowns — treat cells marked "reported" accordingly.

Rule for every proposal below: it must name a concrete user need AND name
something it removes or consolidates. New dashboard chrome is not a gap
fix.

## Current app surface (33 views, verified by census)

Read: home · library · category · mood · focus · search · mushaf (604pp) ·
quran reader + word study/roots/grammar · hadith browser + memorization ·
tafsir panels · mutashabihat · translations compare. Worship: prayer times

- triggers · qibla compass · ramadan · zakat (incl. fitr) · tasbih +
  garden · checklist · khatma · journal · certificate · quiz. Tools: audio
  manager (verse + file modes, offline packs, playlists) · collections ·
  favorites · statistics · offline library · settings · editor · ambient ·
  kids. All offline-first after first visit (service-worker shell + data
  cache); bilingual EN/AR with parity gate.

## Matrix (documented capabilities only)

| Capability (rival-documented)           | Quran.com Study Mode | Muslim Pro bundle | Athan Pro bundle | Hisn al-Muslim taxonomy | Nur al-Dhikr today                                            | Gap?                                                                                                                                  |
| --------------------------------------- | -------------------- | ----------------- | ---------------- | ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Word-level detail + tafsir side-by-side | Yes (study mode)     | Partial           | No               | N/A (adhkar book)       | Yes: word study, roots, 3 tafsir slots + compare              | No gap                                                                                                                                |
| Reflections / community notes on verses | Yes (reflections)    | No                | No               | No                      | Partial: personal journal + reflections data                  | Possible: expose journal-per-ayah explicitly; consolidates nothing new, reuses journal view                                           |
| Related verses / cross-links            | Yes                  | No                | No               | No                      | Partial: roots + mutashabihat                                 | Genuine gap candidate: "related verses" rail inside ayah study; must REPLACE the third compare slot's chrome, not add a fourth column |
| Bookmarks / copy / share per verse      | Yes                  | Yes               | Partial          | N/A                     | Yes: bookmarks, copy, share cards                             | No gap                                                                                                                                |
| Offline Quran + audio                   | Partial              | Yes               | Yes              | Yes (text)              | Yes: shell + packs + file mode                                | No gap                                                                                                                                |
| Prayer times + adhan + qibla            | No                   | Yes               | Yes              | No                      | Yes: times, triggers, custom adhan import, compass            | No gap                                                                                                                                |
| Learning/memorization tracks            | Partial              | Yes               | Partial          | No                      | Yes: hifz SRS, by-heart mode, khatma plans, quiz, certificate | No gap                                                                                                                                |
| Canonical adhkar taxonomy (Hisn)        | No                   | Partial           | Partial          | Yes                     | Yes: library + moods + morning/evening + searchable sources   | Verify, don't duplicate: audit taxonomy coverage against Hisn chapters before proposing any new category                              |
| Carpets: tasbih + garden metaphors      | No                   | Partial           | Partial          | No                      | Yes                                                           | No gap                                                                                                                                |
| Family/kids surface                     | No                   | Yes               | Yes              | No                      | Yes: kids mode + quiz                                         | No gap                                                                                                                                |

## Proposed genuine gaps (each ≤ one plan task, each with a removal)

1. **Related-verses rail in ayah study** — user need: "this wording
   appears elsewhere; show me where" (today: roots view is two taps
   away and lists lemmas, not verses). Removal: fold the C-slot compare
   column behind the existing B-slot overflow instead of widening the
   modal.
2. **Per-ayah journal entry point** — user need: attach a private note to
   the verse being read (today: journal exists but is destination-only).
   Removal: none needed (no new view; one button in the existing study
   sheet reusing the journal store).
3. **Hisn-taxonomy coverage audit** — user need: confidence no canonical
   dua is missing. Removal: none (docs/audit task; any added category
   must merge two existing thin ones).

Anything else is declared NOT a gap until a rival documents a
capability absent above AND a user need is attached.

## Reference set (context, not evidence)

- Quran.com Study Mode update 2026-01-22: https://quran.com/ar/product-updates/new-study-mode-on-quran-com
- Muslim Pro Holy Quran product page: https://www.muslimpro.com/holy-quran-app/
- Athan Pro (Play listing, updated 2026-08-11): https://play.google.com/store/apps/details?hl=en_US&id=com.quanticapps.athan
- Hisn al-Muslim: https://www.hisnmuslim.com/
