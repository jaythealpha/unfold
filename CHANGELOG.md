# Changelog

## 1.0.1 — 2026-10-30

- Repository housekeeping for the public release: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, a pull-request template, and a CI workflow that runs the tests on Node 18/20/22, Gate 1 on every example, a check that the demo pages match a fresh build, and a quick Gate 2.
- LICENSE is the plain MIT text again, so GitHub detects it; the three.js notice moved to NOTICE.md.
- The README shows the demo GIF and status badges.

## 1.0.0 — 2026-10-30

First public release.

- Five example phones: Galaxy S24, Galaxy Z Fold8, Galaxy Z Flip8, iPhone 17 Pro, iPhone Duo.
- Playback speeds are now labelled by how fast they run: 1× (the slowest, 60 s for the whole bar), 2× (the default), 3× and 5×.
- Every page and printed manual says it is an unofficial illustration.
- Packaged as a Claude Code plugin; the examples are online at https://jaythealpha.github.io/unfold/.
- Checked before release by five Claude agents (three first-time users, a repair-technician reviewer, an open-source maintainer); see VALIDATION.md. From their findings:
  - one explicit rule for when a part counts as verified, and every example re-scored by it (Galaxy Z Flip8: 40% → 18%)
  - corrected screw counts, lengths and fastening in the examples; rewrote cautions that followed source wording too closely
  - long sliding parts (a stylus) wait clear of the phone before they slide in
  - the printed manual frames each step's parts, and Gate 2 photographs two of its pages
  - `fastening.spec` may be `{ko, en}`; clearer Gate 1 messages for sliding parts and same-step layers
