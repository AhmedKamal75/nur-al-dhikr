# Adding a UI language (e.g. Urdu, Turkish, French, Indonesian)

The loader (`js/core/i18n.js`) is already a language registry — `t()`
falls back per-key to English, so a new language can ship incrementally
without blanking the UI. The contract gate (`tests/contracts.test.js`)
pins en↔ar parity only; extend it when the new language is complete.

## Recipe

1. **Copy the dictionary:** `cp js/core/i18n/en.js js/core/i18n/ur.js`,
   rename the export (`export const ur = {...}`), translate every VALUE.
   Rules:
   - Never rename/remove keys, never touch `{placeholders}` (names and
     count must match en exactly — the placeholder-parity test checks).
   - Keep HTML out of values (they render raw into templates).
   - Translate meaning, not words — especially `about.*`, `verifyNote`,
     and anything with ﷺ or Qur'anic quotations.
2. **Register it** in `js/core/i18n.js`: import + add to `dict`, add the
   native label to `LANGUAGE_LABELS` (e.g. `ur: 'اردو'`), and extend
   `isRTL()` only if the language reads right-to-left.
3. **Sanitizer:** extend the `language` allowlist in `js/core/config.js`
   (today `['en', 'ar']`) so the setting survives restore + validation.
4. **Settings switcher:** nothing to change — it renders
   `availableLanguages()` with `languageLabel()`.
5. **Verify:** `npm run check`. The key-parity test will list every key
   you still need to translate; `t()` covers the rest with English until
   you do. Have a native speaker review religious strings before calling
   the language "supported" in the README.
6. **Content vs chrome:** this covers UI chrome. Library *content*
   (dua meanings, virtues) is per-item `{en, ar}` data — a third content
   language is a data project (see the Arabic-content backlog in
   TODO.md), not this recipe.

## Suggested order (most Muslims first)

Urdu → Bengali → Turkish → French → Indonesian. Note the Qur'an reader
already ships Urdu, French, Turkish and Indonesian *translation editions*
(`data/translations/`) — the study content is there; only the chrome is
missing.
