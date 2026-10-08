# Practice IA — Next Product Plan

**Current problem:** the top-level Practice door lands directly on Tasbih, with 99 Names Quiz as its only child. Tajweed drills and Mutashabihat/Hifz practice live elsewhere. The owner considers the result under-organized and under-developed.

## Product decision

**Practice is a task launcher, not a content library and not a second dashboard.**

The existing content ownership stays where it belongs:

- Qur'an owns Qur'an reading, study, Tajweed Course, Mutashabihat and deeper memorization context.
- Practice owns the act of **rehearsing** learned material.
- Tasbih remains a first-class practice tool.
- 99 Names remains a first-class recall exercise.
- The same underlying engines may be reachable from Qur'an without duplication.

This means the Practice door can expose a concise set of task-shaped entries without moving the underlying features.

## Proposed Practice surface

### 1. Tasbih
**Purpose:** count a chosen dhikr.

Keep the current focused counter as the actual destination. The Practice surface should describe it in task language, not pretend it is an educational course.

### 2. Tajweed Practice
**Purpose:** identify and apply Tajweed rules.

Launch the existing rule-level drills, mixed rounds and mistake review. The full written lesson remains under Qur'an → Tajweed Course.

Surface state should be small and useful:
- rules practised recently;
- weak-rule review availability;
- continue button where a real session exists.

No gamified leaderboard, no shame language.

### 3. Qur'an Recall
**Purpose:** retrieval practice for memorization.

This is where Mutashabihat and future Hifz review can be launched. It does not duplicate the Mushaf or Study Mode.

Initial destination can be Mutashabihat because that feature already exists and has a clear recall task.

### 4. 99 Names
**Purpose:** recall the Names and their meanings.

Keep the current Quiz engine, including weak-item review. Do not pretend it is a generic Islamic quiz engine unless the scope is actually expanded.

## What should NOT be in the Practice surface

- Prayer times or prayer methodology — Prayer owns those.
- Calendar/Ramadan — Prayer/Worship owns those.
- Generic statistics — You owns that.
- Collections/favorites — those are personal organization, not practice tasks.
- A generic "More" bucket.
- Duplicate copies of the full Tajweed course, Mushaf, Word Study or Hifz UI.

## Navigation model

The user sees one top-level **Practice** door.

Inside it is a short flat list of actual practice tasks:

**Tasbih · Tajweed Practice · Qur'an Recall · 99 Names**

No nested six-level accordion.

Each row answers three questions immediately:

1. **What will I practise?**
2. **What happens when I open it?**
3. **Can I continue/review something I already started?**

The list can show a quiet secondary status such as "Review 3 rules" or "12 names" without becoming a statistics dashboard.

## Future expansion

This architecture leaves room for:

- Hifz scheduled review;
- verse recall;
- Tajweed weak-rule review;
- vocabulary/Word Study drills, if that feature gains a real exercise model;
- pronunciation exercises once a safe, evidence-backed mechanism exists.

These are task additions, not new navigation categories.

## Implementation constraint

Prefer a lazy Practice landing view so the renderer's static-view budget does not grow.

Do not duplicate route ownership. The Practice launcher should navigate to the existing destinations/actions and reuse their state engines.

First implementation pass should be visual-only:

- one calm Practice heading;
- four purpose-built task rows;
- clear primary action;
- minimal status;
- EN/AR parity;
- light/dark;
- keyboard-safe;
- 360/393/1024/1440 evidence.

Then run the full Chromium gate before considering the IA change complete.
