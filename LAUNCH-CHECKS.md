# Launch checks, 23 October 2026

## Scope

Free couple spaces at suratwala.in. No payments or subscriptions. Support and free-service/refund information are at /help and linked from the landing, account and couple pages. Public bug reports use the repository's GitHub issues; no private support inbox or response-time promise has been invented.

## Local checks passed

- Existing invitation, owner/tenant isolation, origin, recovery and scrapbook tests.
- Photo values are rejected above the compressed-size cap rather than truncated. Header/MIME and base64 checks reject invalid or disguised data. These checks validate signatures and size, not a full server-side image decode; the browser decodes and re-encodes uploaded photos.
- Intact photo storage, invalid encoding and mismatched MIME rejection, compressed 350,000-character photo limit and 500,000-byte request limit.
- Exactly 50 active memories, simultaneous saves at capacity, delete frees capacity, restore cannot exceed capacity.
- Ticket text wraps unbroken strings and grows the image height to retain the footer. Timezone and agreed changes appear once. A PNG preview with a direct save link and optional native share control supports phone saving.
- Encrypted SQL backup and restore into a fresh in-memory SQLite database. Wrong keys and modified archives are rejected. Integrity, references and inline photo preservation pass. This is a synthetic drill, not a production restore.

## Automated browser matrix

Prepared in tests/launch.spec.mjs with Chromium desktop, Pixel 7 emulation in Chromium and iPhone 13 emulation in WebKit. Includes 320px layout checks, independent owner/partner browser contexts, counterproposal approval, canonical date/countdown data equality, owner/partner PNG downloads, photo decoding/compression, 5 MB input rejection, HEIC rejection and capacity/restore checks. GitHub Actions runs these checks from launch/checks and revamp/couple-spaces. HTML reports, traces on failures and screenshots use synthetic QA data only.

Run `npm install`, `npx playwright install --with-deps chromium webkit`, then `npm run test:devices` in an environment with browser-test support. This session has no browser control tool or installed browser-test packages, so browser tests run in GitHub Actions. Check its actual result before marking this matrix passed.

## Physical-device checks still required

No physical phone or separate hardware has been tested in this session. Browser emulation is not a substitute for real camera selection, iOS Photos, Safari download settings or native share sheets. On Android Chrome and iPhone Safari, use a synthetic couple and follow /help#phone-check. Confirm camera/gallery JPEG uploads, an HEIC error where applicable, portrait/landscape layouts, download and long-press save to Photos, native sharing, and the complete owner/partner flow on two devices. Avoid testing with real private photos until this is complete.

## Backup and launch dependencies

Cloudflare documents always-on D1 Time Travel with seven days on Free. BACKUPS.md records the recovery procedure. An additional encrypted external-backup workflow is prepared but is not active: it needs dedicated GitHub Actions secrets and installation on the default branch. No production export or destructive restore was performed. Verify an actual encrypted artifact and restore it to isolated D1 before relying on external backups.

Email verification/reset code exists, but email delivery is still unconfigured. Private support contact, email delivery and backup credentials remain operator setup items. Current support clearly states its public-reporting scope. Keep these limitations visible when deciding whether to launch publicly.
