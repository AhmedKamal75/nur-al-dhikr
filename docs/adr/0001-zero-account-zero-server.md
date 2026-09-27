# 0001. Zero account, zero server

- Status: Accepted
- Date: 2026-09-24 (recorded; the constraint predates the first commit)

## Context

The obvious shape for a worship app is a backend: accounts, sync of bookmarks
and memorization progress across devices, server-side content updates, push
notifications.

That shape brings obligations: hosting cost, a database holding religious
practice data, an account system to secure, a privacy policy that means
something, and a single point of failure. It also puts a legal surface around
data that some users will not want stored anywhere.

The app already has a working substitute for the only capability that genuinely
needed a server — moving data between devices — in the form of an exportable,
importable backup file.

## Decision

We will ship **no account system, no server, and no analytics**. All state
lives in the reader's own browser. Cross-device movement happens through a
backup file the person controls.

## Consequences

Easier: the app cannot leak what a person prays; it survives a hosting shutdown
or a platform policy change; there is no compliance surface for religious data;
install size and first paint stay small because there is no origin to wait for.

Harder: no real-time content updates (content is versioned and cached by the
service worker); multi-device sync is manual; push notifications on iOS are
unreliable, which we document rather than hide.

We accept all three costs. They are the price of the first four benefits.

## Alternatives considered

- **Accounts + sync.** Best multi-device experience; costs privacy surface,
  hosting, and a breach story. Rejected — a worship log is not a product
  analytics event.
- **Anonymous sync token.** Keeps the account out; still puts practice data on
  a server. Rejected for the same reason, with more complexity.
