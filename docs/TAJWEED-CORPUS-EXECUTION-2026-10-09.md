## Cross-rasm mismatch reproduction — 2026-10-10

The mismatch is tracked at https://github.com/AhmedKamal75/nur-al-dhikr/issues/31. Direct execution
against the actual checked-in source strings reproduced three examples:

- **2:4 and 2:8 — Madd Badal:** the corpus writes `أٓ`, while Mushaf uses a tatweel plus
  hamza-above/fatha/alif cluster (`ـَٔا`). The former received `madd_badal`; the latter fell
  through to `madd_2`.
- **4:1 — Madd Iwad:** corpus `رَقِيبٗا` had no final `madd_iwad`, while Mushaf `رَقِيبًا` did.
  The inverted-tanween mark keeps its ordinary behavior elsewhere and is recognized here only in
  the ayah-final-before-alif shape.
- **2:18 — Iqlab:** `صُمُّۢ` had ghunnah but no Iqlab, while Mushaf `صُمٌّۢ` included Iqlab.
  U+06E2 (small-high-meem) is an explicit signal even when separate tanween is omitted.

These examples are reproduced, not a claim of full-corpus closure. The new
`scripts/audit-tajweed-rasm.mjs` reports canonical-word-aligned mismatches and potential highlighted
letter-ordinal drift. It does not change Qur'an text and is not a scholarly oracle. The local agent's
reported **1,221 / 6,236 ayahs** and **52.5%** per-word discrepancy remain to be independently
recalculated from a pinned source snapshot. Ledger row 99 stays OPEN pending full corpus output,
native Node/CI, Chromium EN/AR × light/dark × phone/desktop glyph review, and scholarly review.

