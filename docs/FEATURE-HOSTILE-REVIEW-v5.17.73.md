# Nūr al-Dhikr — feature-hostile review, v5.17.73

## Review stance

The shell is no longer the main risk. The question is now: **does each important feature feel deliberately designed for its job, or did we merely place working controls inside a generic page?**

The live `azkar.me` site is the reference for taste, not code. Its public product page describes a quiet daily-remembrance experience centered on authentic adhkar, a smart counter, progress tracking, favorites, search, reminders, the complete Qur'an, and audio listening; its current navigation exposes adhkar, Qur'an, hadith, prayer, activities and calendar as distinct destinations. The live page also advertises Qur'an reading with Uthmani text, per-ayah Tafsir al-Muyassar, recitation from 28 readers, and saved reading position. See the live page before making any future parity claims.

## Feature findings

### 1. Azkar browser — now coherent

**Old failure mode:** category tiles and mood browsing could easily become a second Home, with duplicated actions and rainbow styling.

**Current contract:** one tile is one action; semantic icon; restrained primary accent; compact mood navigation; Home does not contain the complete category grid.

**Still intentionally different from azkar.me:** Nūr al-Dhikr has deeper management/custom-content capabilities, so the manage mode must remain more powerful than the public reference. Power belongs behind the manage lens; reading mode stays calm.

### 2. Focus mode — feature, not card viewer

The focus stage is the most important adhkar interaction after the category browser. It now has:

- quiet category + position identity;
- a thin session progress line;
- a large Arabic reading stage with controlled measure;
- one obvious primary counter;
- quiet secondary actions;
- previous/next and reset controls in a restrained tray;
- preserved by-heart, audio, source, grade, notes and accessibility behavior.

The design principle is: **read → tap → move on**. Every other control is subordinate to that loop.

### 3. Qur'an player — feature depth exposed progressively

Nūr al-Dhikr already has full-surah audio, verse-by-verse recitation, offline packs, playlists, compare mode, repeat, rate, sleep timer and reciter selection. The risk was not capability; it was control density.

The v5.17.73 player pass therefore groups secondary controls together and reduces persistent chrome. The player should answer the following in one glance:

1. what is playing;
2. who is reading;
3. where I am;
4. play/pause;
5. seek;
6. how to reach secondary controls.

Everything else can be progressive disclosure.

### 4. Tajweed course — learning product, not settings page

The course has real scholarly depth: staged lessons, open/guided paths, source citations, examples, drills, classify rounds, review of missed rules, and a documented taxonomy/provenance dossier. That depth was visually too easy to present as a dense admin ladder.

The feature-interior pass therefore emphasizes:

- overall learning progress;
- one clear Continue target;
- stage grouping;
- the next session as a distinct state;
- locked sessions as honest, readable states rather than dimmed mystery cards;
- practice questions as focused tasks, not decorative modal panels.

The course taxonomy must still be treated as a pedagogical scaffold where the source texts disagree; no UI wording should imply that an app-created stage structure is itself a canonical classical chapter structure.

### 5. Other feature classes to attack next

A hostile reviewer should next inspect these by **task**, not by route count:

| Feature         | Hostile question                                                                         |
| --------------- | ---------------------------------------------------------------------------------------- |
| Prayer          | Can I see the next prayer and act on it instantly, without scanning a dashboard?         |
| Hadith          | Does reading a hadith feel like reading a source, or like searching a database?          |
| Word study      | Can I inspect one word without opening a laboratory of panels?                           |
| Tafsir compare  | Does comparison clarify, or does multi-column chrome overwhelm the ayah?                 |
| Hifz / By-heart | Is recall the focal action, with grading secondary?                                      |
| Tasbih          | Is counting physically obvious and everything else quiet?                                |
| Statistics      | Does it inform without turning worship into a game dashboard?                            |
| Settings        | Can a person predict where a preference belongs?                                         |
| Offline library | Does storage state read as trustworthy system information instead of file-management UI? |
| Share cards     | Does the exported artifact look like Nūr al-Dhikr rather than a screenshot generator?    |

## 9.9 ceiling

A 9.9 is not awarded merely because source code is clean. The remaining acceptance bar is:

- **9.9 visual/product quality** only after browser screenshots verify the feature interiors in EN/AR, light/dark, phone/desktop;
- no feature should have a primary task hidden behind a secondary action;
- no unexplained control cluster should survive;
- Arabic and English must be equally composed, not merely translated;
- the player, Focus and Tajweed surfaces must feel like one product while preserving their different purposes;
- no visual fix may silently remove a working feature or provenance contract.

Until that rendered matrix exists, any 9.9 number is provisional.
