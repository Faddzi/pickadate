# Account recovery and scrapbook privacy

Run `python prepare-cloudflare.py`, `npm run check` and `npm test` after edits. Apply the additive account_state, account_tokens and memory_trash definitions from schema.sql to D1 before deploying. Existing users remain usable and start unverified. Verification is an account status, not a restriction on existing spaces.

## Email configuration

Choose one runtime configuration:

- Resend: RESEND_API_KEY secret and MAIL_FROM containing a verified sending address.
- Cloudflare Email Sending: EMAIL send_email binding and MAIL_FROM from an onboarded sending domain. Arbitrary-recipient sending requires Workers Paid. Do not add the binding until sending access is available.

PUBLIC_ORIGIN optionally overrides links; the Worker defaults to https://suratwala.in. Never derive recovery links from untrusted hostnames. Keep keys in Worker secrets and out of source control. Without a sender, verification is disabled and reset requests report that account emails are unavailable. Email tests use an in-memory sender. Real delivery still requires configured credentials and an inbox test.

Registration sends verification when a sender is configured. Owners can resend from the dashboard. Verification links expire in 24 hours and reset links in 30 minutes. Tokens contain 256 random bits, are stored only as hashes, are scoped by purpose, and are consumed atomically. Links use fragments to keep raw tokens out of HTTP logs and referrers. Successful reset verifies email, replaces the salted scrypt password and revokes existing sessions. Reset responses are identical for existing and unknown addresses. IP and account rate limits restrict abuse. Background delivery errors omit recipient, token and provider response details.

## Memories

Owner-only JSON export contains profile, notes, dates, ratings and inline photos, including memories still in trash. It excludes credentials, sessions and invitation tokens. Downloaded copies should be stored privately.

Deletion asks for in-product confirmation and moves a memory into trash. It disappears from the active scrapbook and can be restored for 30 days, subject to the 50-active-memory cap. The daily 03:00 UTC Worker cron permanently removes expired trash. Privacy API visits also run cleanup. Local privacy APIs use the same cleanup. Hosting backups can retain older records under the provider's retention policy.

Tests cover verification, reset expiry/reuse/purpose isolation, password replacement, session revocation, generic reset responses, sender availability, owner-only exports, deletion, restoration and scheduled purge. The existing invitation and tenant tests also remain required.
