# Support

## I found a bug

Open an issue and include:

- what you did, what you expected, what happened instead;
- the app version (Settings → About, or the top of `docs/RELEASES.md`);
- your browser and, if relevant, whether you are on a phone or desktop;
- a screenshot if it is a visual problem.

## I found wrong religious data

**This is the most important kind of report, and it is handled differently.**
Please say which item (library, category, item id or the Arabic text), what the
app currently shows, and what the correct value is **with its source** — a
book, an edition, a hadith collection with number, a tafsir with author.

The project does not accept a fix that is merely plausible. Data corrections
route to a scholar; engineers flag the absence of citation rather than filling
it in. A report without a source is still useful — it becomes an honest
`Unknown` — but a report _with_ a source can become correct.

## I need help using the app

Start with the in-app Help/About surfaces and `USAGE.md`. Prayer times need a
location (or a manual city choice, which works offline). Everything except
first-run Hadeeth/tafsir/word-study text works with no network at all.

## Security or privacy

See [`SECURITY.md`](SECURITY.md). The short version: the app has no account, no
server, and no analytics, so there is nothing to leak to us — but your data
lives in your browser's local storage, and a crafted backup file is untrusted
input. Report anything that looks wrong rather than working around it.
