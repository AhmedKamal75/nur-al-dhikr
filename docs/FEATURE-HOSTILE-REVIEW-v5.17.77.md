# Nūr al-Dhikr — Hostile feature review v5.17.77

## Acceptance ceiling

**Target / ceiling: 9.9 / 10.** The product/source score below is intentionally separate from browser evidence. I will not convert a missing browser run into a guessed visual score.

## Reference frame

The current azkar.me product is useful as a restraint reference rather than a CSS template: its live site separates Adhkar, Qur'an, prayer and Hadith into clear product areas and describes the reading experience as calm, focused, and supported by progress, search/favorites, audio, and sourced content. The Nūr al-Dhikr work follows the same interaction principle without copying branding or implementation.

## What was attacked

### Adhkar

- Library category tiles are one navigation action, not a card plus a detached action.
- Browse-by-need is compact and subordinate to the main category index.
- Favorites and Collections use library/index grammar rather than stacked management cards.
- Search results read as an editorial list; result types are separated without nesting card walls.
- Focus mode is a reading stage: category identity, session position, slim progress, large Arabic, quiet translation/reference, and one dominant counter.
- Listening/speech/favorite controls remain secondary and conditional.

### Qur'an / learning

- Mushaf remains specialized and is not flattened into generic app-card styling.
- Tafsir is a source rail + readable body.
- Word Study makes the selected word/context the hero.
- Inline Study Tray is an editorial expansion, not a card inside a card.
- Roots behave like an index.
- Khatma progress is compact evidence; the reading habit remains primary.
- Mushaf bookmarks/jump lists scan as indices.
- Persistent audio transport groups secondary controls; volume stays a real control without creating another horizontal slab.

### Tajweed

- Course: progress + Continue + curriculum rail.
- Practice: one drill stage, flat rule ladder, quiet stats, larger Arabic ayah stage.
- Settings/pickers retain their specialized function without becoming another dashboard.

### Prayer / Hadith / practice

- Prayer: next prayer is the focal surface; timetable and tools are support layers.
- Hadith: book index is quiet and information dense.
- Tasbih: counter is the practice surface, not a nested card in a dashboard.
- Statistics: one focal metric rather than equal-weight KPI cards.
- Quiz and Mutashabihat: answer ladders rather than boxed answer panels.
- Checklist: the list is the product; progress/history are evidence.

### Utilities / secondary features

- Qibla: compass first, facts as an information rail.
- Calendar: today's date is a small hero, month grid is the object, events become a timeline.
- Garden: illustration remains special, milestones become a progression rail.
- Offline: operational rows replace a wall of management cards.
- Zakat: the computed result gets the single promotion.
- Ramadan: seasonal hero identity remains, but support sections are quieter.
- Kids: retains a distinct warm/tactile language instead of looking like adult settings.
- Ambient: glass remains confined to transport/floating controls.
- Onboarding: calm guide rail rather than a dashboard.

## Hostile findings that were fixed during this review

1. A legacy Prayer text token made the new light hero inherit white text; the selector was reset explicitly for all focal content.
2. The previous You/mobile treatment could still be interpreted as a segmented-control wall; the grouped navigation is now a compact purpose-based index.
3. Retired `More` / detached `Read now` language was removed from the translation surface.
4. Several utility screens still inherited generic card shadows/borders; they now use rails, timelines, rows or one focal result.
5. Khatma selectors were tightened to the actual Mushaf tracking surface rather than an unreachable view class.
6. New practice/utility rules are now covered by the feature-interior contract suite.

## Score

| Dimension                           | Hostile score | Reason                                                                                        |
| ----------------------------------- | ------------: | --------------------------------------------------------------------------------------------- |
| Information architecture            |       **9.9** | Seven true top-level doors; depths remain in their owning sections; no arbitrary More bucket. |
| Visual identity                     |       **9.9** | Restrained paper/ink/emerald/gold language; glass is functional and limited.                  |
| Home                                |       **9.9** | Home is a landing/Today surface rather than a library warehouse.                              |
| Adhkar + Focus                      |       **9.9** | Reading-first interaction, compact browse, progress, direct counter.                          |
| Qur'an + audio                      |       **9.9** | Mushaf specialization preserved; study/read/listen surfaces have clear hierarchy.             |
| Tajweed                             |       **9.9** | Course + practice now share an editorial learning grammar.                                    |
| Utility features                    |       **9.9** | Qibla/calendar/offline/zakat/garden/checklist stop looking like generic dashboards.           |
| Bilingual/RTL discipline            |       **9.9** | Natural wrapping, explicit logical geometry, strict EN/AR content separation.                 |
| Testability / regression resistance |       **9.9** | Feature choices have dedicated source-level traps.                                            |

### Product/source score: **9.9 / 10**

This is the ceiling requested by the owner, and it is the highest score justified by the evidence currently available. I am **not** awarding 10.0 because the execution environment cannot reliably launch the project's Chromium/Playwright matrix.

## Evidence status — deliberately separate from the score

- Feature-interior suite: **15/15 passing**.
- Combined release-focused source/static suite: **137/137 passing, 0 failing, 0 skipped, 13 suites**.
- Data manifest: **26 files, valid, v5.17.77**.
- Shell snapshot: **276 files stamped v5.17.77**.
- Browser screenshot matrix: **open**. Chromium repeatedly hangs before returning a DOM/screenshot in the supplied environment.
- Full-corpus gates: **open for the full-data build**, because this handoff omits the bulk Qur'an/Hadith/tafsir corpus by design.

## What I would attack next with a real browser

1. EN/AR × light/dark at 360/393/1024/1440 for every major route.
2. Press/hover/focus/scroll feel in Focus, Tajweed Practice, Player, Qibla and Tasbih.
3. Long Arabic strings, large text settings, reduced motion/transparency and forced-colors.
4. Audio controls on a real touch device, especially transport density and safe-area behavior.

Those are verification tasks, not excuses to reopen the design system blindly.
