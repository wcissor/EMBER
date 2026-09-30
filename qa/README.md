# Aglink Console — QA harness

Tests for `../aglink-console.html`, the single-file prototype. The harness is not part of the app file.

```sh
cd qa
npm install                 # playwright + axe-core
./fetch-fonts.sh            # optional: cache Onest + Noto Sans Mono so runs use the real fonts offline
npm run matrix              # route matrix  → screenshots/<width>/<scheme>/<lang>/<route>.jpg, report.json
npm run flows               # behaviour flows → screenshots/states/*.jpg, flows.json
npm run perf                # time to first paint / headline, long tasks
```

## Route matrix (`run.mjs`)

It covers 26 routes × az / ru / en × light / dark × 1440×900 and 390×844, which is 312 states. The app runs with `?debug=1`, so a missing translation key renders as `[key]`. Each state fails on any of these:

- a console error or warning, or an uncaught page error
- horizontal page scroll (`scrollWidth > innerWidth`)
- text overflowing its box (`scrollWidth > clientWidth`) on labels, buttons, headings, table cells, tabs, tags and navigation items
- a missing translation key
- sampled text contrast under 4.5:1 (up to 400 text nodes, composited against the real background). Disabled controls are exempt, as WCAG allows.
- any axe-core violation for wcag2a, wcag2aa, wcag21a, wcag21aa or wcag22aa. Axe is injected by the harness, not shipped in the file. It runs with `preload: false` because the page's CSP (`connect-src 'none'`) blocks axe's stylesheet fetch.
- a view without exactly one `<h1>`

## Behaviour flows (`flows.mjs`)

- **Consent gate:** separate blocks, required boxes unticked, Continue disabled until both are ticked. The document drawer shows version, effective date and language; Escape closes it and returns focus. The ledger record has all its fields, cannot be changed, and its SHA-256 matches the rendered text. Optional consents are recorded.
- **Contractor role:** coordinates hidden, 403 on Activity and on Members.
- **Forced errors:** 500 shows a request ID, plus 404, 403, and 429 with a countdown and automatic retry. A 401 opens the re-auth modal and keeps the page. Also covered: maintenance (banner and now), the empty fleet, and identical 404s for foreign and unknown IDs.
- **API rules:** the 24-hour raw-data cap, the 2,000-point cap, opaque IDs and keyset cursors.
- **Offline:** the banner shows the snapshot time, status reads Paused, a queued acknowledgement is marked Pending and is sent on reconnect.
- **Realtime:** the stream resumes from the last sequence, shows Reconnecting, and reconnects with backoff.
- **Material Terms change:** banner, review page, blocking screen after the effective date, acceptance recorded, history shown in Privacy & data and in Activity.
- **API key:** the secret is shown once, then only the masked prefix, and the server stores only a hash.
- **Support access:** validation, countdown banner and revoke.
- **Alert rules:** validation messages, Send test and save. Snooze requires a reason.
- **Exports:** an export becomes ready and appears in Activity; coordinates are off by default.
- **Keyboard and performance:**
  - Command palette works with the keyboard; the debug panel opens.
  - The 10,000-row table renders only visible rows and keyset paging reaches the end.
  - Filters and sort come from the URL, and grid navigation uses a roving tabindex.
  - No long tasks over 50 ms while scrolling or navigating; first contentful paint is under 1 s.
- **Storage and locales:**
  - The app works with localStorage and sessionStorage blocked.
  - The pseudo-locale (`?lang=xx`) renders and sets `html[lang]`.
  - Azerbaijani suffix harmony is correct in dark mode on mobile.

## Latest results

See the summary at the end of the hand-off. The raw results are in `report.json` (matrix) and `flows.json` (flows).
