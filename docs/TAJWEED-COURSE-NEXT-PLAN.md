# Tajweed Course — Next Product Plan

**Status:** design/research baseline for the next course-enrichment wave  
**Current release:** v5.17.136  
**Owner requirement:** a real written, interactive beginner → advanced course; not video-only and not merely a quiz index.

## What the current product already has

The repository currently provides:

- 8 stages / 17 sessions in `data/tajweed-course.json`.
- 27 sourced Tajweed rule definitions/citation records.
- Guided and open-access paths.
- Search by session/rule.
- Rule-level practice, mixed practice, review-mistake rounds and classifier-based exercises.
- Contested Makharij/Sifat spreads instead of silently selecting one disputed count.
- Offline-first data and bilingual course structure.

The missing layer is **curriculum-level instructional depth**. The app already has a useful rule-lesson modal: sourced rule definition, family, Qur'anic examples with highlighting, citation, and a direct drill action. What is missing is the larger lesson/chapter layer around those rule units — objectives, sequencing, worked progression, misconceptions, checks, mastery/review and a beginner→advanced learning path.

## Product definition

A course lesson should feel like a compact self-study chapter:

1. **Orientation** — what this lesson is and what the learner should already know.
2. **Learning goals** — 2–4 observable outcomes.
3. **Teach** — a short, readable explanation in EN + AR.
4. **See it** — worked Qur'anic examples with the relevant letters/words highlighted.
5. **Notice** — a small identification interaction before formal drilling.
6. **Apply** — guided practice generated from the real Qur'anic corpus.
7. **Check** — a short mastery check with immediate explanation.
8. **Common mistakes** — concise corrective reminders.
9. **Source** — exact classical source/citation and, where relevant, a clearly labelled scholarly disagreement.
10. **Continue** — next lesson plus a revisit/review path.

The app should never imply that passing the check makes a learner's recitation equivalent to teacher correction. The course is self-study support, not an Ijazah or a substitute for qualified correction.

## Proposed curriculum architecture

Do not copy a competitor's lesson text or exact course. External curricula are useful as **shape benchmarks**, not content sources.

### Level 0 — Readiness

- Can identify Arabic letters and vowel signs.
- Understands basic shaddah/sukun/harakah notation.
- Can follow a Mushaf line and tap/inspect an ayah.
- Intro to what Tajweed is and why the course separates rules from recitation judgement.

### Level 1 — Foundations

- Makharij as a practical pronunciation map.
- Core Sifaat vocabulary.
- Heavy vs light letters.
- Qalqalah.
- Ghunnah.
- Guided letter/word identification in Qur'anic examples.

**Important:** the app should present disputed articulation-point counts as a scholarly spread when relevant; it must not silently teach one count as the app's unique verdict.

### Level 2 — High-frequency rules

- Noon Sakinah and Tanween: Izhar, Idgham, Iqlab, Ikhfa.
- Meem Sakinah: Izhar Shafawi, Ikhfa Shafawi, Idgham Shafawi.
- Noon/meem mushaddad and Ghunnah where supported by the sourced rule registry.
- Lam Shamsiyyah / relevant definite-article reading rules.
- Worked examples followed immediately by noticing tasks.

### Level 3 — Madd and pronunciation control

- Natural Madd.
- Connected/separated Madd.
- Madd related to stopping/sukun.
- Relevant secondary Madd families already represented by the sourced rule registry.
- Practical count recognition.
- Heavy/light application where it intersects with reading.

### Level 4 — Waqf, Ibtida and reading flow

- Stopping/starting concepts supported by the verified source set.
- Signs and practical reading decisions supported by the app's documented methodology.
- Hamzat al-Wasl / Hamzat al-Qat' where already sourced.
- Shaddah-start and other orthographic/reading edge cases represented in the current research.

### Level 5 — Integrated recitation practice

- Mixed-rule Qur'anic passages.
- Rule spotting across an ayah rather than isolated tokens.
- Contextual practice in selected short/medium Surahs.
- Look-alike Ayat / Mutashabihat as a separate memory/retrieval path.
- Mistake review and spaced revisit.

### Level 6 — Advanced/reference study

- Makharij and Sifaat disagreements presented as source-backed spreads.
- Detailed rule/reference pages for learners who want depth.
- Cross-links from Qur'an/Mushaf to the exact lesson.
- No invented “one true” scholarly position when the source registry records disagreement.

## Lesson data model

Do not put long prose directly into the view.

A lesson should be a structured content object, for example:

```json
{
  "id": "madd-natural",
  "level": 1,
  "objectives": {
    "en": ["...", "..."],
    "ar": ["...", "..."]
  },
  "teach": {
    "en": "...",
    "ar": "..."
  },
  "examples": [
    {
      "surah": 2,
      "ayah": 255,
      "focus": ["madd_2"],
      "note": { "en": "...", "ar": "..." }
    }
  ],
  "notice": {
    "type": "identify-rule",
    "rule": "madd_2"
  },
  "practice": {
    "mode": "find-spans",
    "rule": "madd_2"
  },
  "check": {
    "type": "mcq-or-identify",
    "rule": "madd_2"
  },
  "commonMistakes": {
    "en": ["..."],
    "ar": ["..."]
  },
  "source": {
    "work": "tuhfat-al-atfal",
    "lines": "35-41",
    "review": "sourced"
  }
}
```

The examples must come from the bundled Qur'anic corpus, not hand-retyped sacred text. The source registry remains the authority for the rule's provenance.

## Content integrity rules

- Religious teaching prose must be source-backed or explicitly marked as the app's instructional paraphrase derived from the cited source.
- Qur'anic text must be selected from the canonical bundled corpus rather than retyped.
- Never fabricate grades, rulings, counts, classifications or citations.
- When authorities disagree, render the disagreement and source attribution rather than inventing a unified answer.
- EN and AR content are a pair: no lesson can ship with one language missing.
- Every lesson must work offline after the relevant data is bundled/cached.
- Do not copy competitor lesson scripts, wording, branding or proprietary exercises.

## Interaction design rules

The lesson should be **read first, act second**.

Use a flat progression:

**Learn → See → Try → Check → Review**

Do not bury teaching content behind a generic “More” control.

A lesson may use progressive disclosure for citations, optional deep reference, or a full source note, but the core explanation and first worked example should be visible.

## Completion model

A learner can:

- mark a lesson complete;
- revisit any completed lesson;
- jump directly in Open mode;
- continue from the next unlocked lesson in Guided mode;
- review weak rules from Practice without losing course progress.

Completion is a progress aid, not a gate that hides the underlying Qur'anic material.

## Research basis

Current external course benchmarks show that serious Tajweed curricula are staged and practice-oriented rather than flat lists. Arabic101's current Intermediate Tajweed course, for example, uses six stages and 30 lessons and explicitly recommends a lesson-per-day rhythm, with separate revision and Q&A lessons. Its Tajweed catalogue also separates beginner, intermediate and advanced levels. [Arabic101 Intermediate Tajweed](https://academy.arabic101.org/courses/intermediate-tajweed/)

Other current Tajweed programmes similarly emphasize Makharij/Sifaat, Noon/Meem Sakinah, Madd, Qalqalah, stopping and repeated applied practice rather than memorizing rule names alone. These are useful benchmarks, not sources for copying course content.

The project's existing research dossier and sourced rule registry remain the authoritative basis for actual religious teaching content.

## Next implementation gate

Before adding a large body of lesson prose:

1. Define the lesson schema and renderer.
2. Build one complete exemplar lesson to test the interaction grammar.
3. Validate the exemplar in EN/AR, light/dark, narrow/desktop and offline mode.
4. Have the content/source review pass verify the teaching text and examples.
5. Only then scale the same structure across the curriculum.

This prevents a large content dump from becoming a new form of product slop.
