# Pick a Date

Static product prototype for personalised couple spaces. Open `index.html` in a browser or serve this directory with a static HTTP server.

One package: ₹259 one-time per personalised subdomain and couple space. Includes all planner, invitation, roulette, ticket, countdown and scrapbook features, with up to 50 compressed photos.

Implemented: marketing page, personalisation, themes, local photo compression, browser-saved preview, date invitations, simulated replies, roulette with locks, countdown, PNG ticket export, and capped local scrapbook.

This is a preview, not a production multi-tenant service. No payments are collected, no subdomains are provisioned, and no data syncs between devices. Browser storage can be cleared or reach its quota before 50 photos. Do not use it as the only copy of a memory.

Next: authenticated accounts, database and private object storage, tenant routing and wildcard DNS/TLS, server-side subdomain reservation, verified Razorpay checkout/webhooks, partner invite tokens and authorisation, retention/service terms, and production deployment. Never treat local browser state as payment entitlement or partner consent.


## Working application

Requires Node 24 or newer. Run `npm start`, then open http://127.0.0.1:4174/tool. No package installation is needed. The original marketing preview is at `/`.

The application uses Node SQLite and stores records under `data/`, which is excluded from source control. Passwords use salted scrypt hashes. Sessions use hashed random tokens and HttpOnly, SameSite cookies. Space APIs require ownership; invitation URLs use random bearer tokens and let their holders view and reply only to that invitation. Mutation routes verify Origin. Authentication and public replies have a basic in-process rate limiter.

Implemented server-backed flows: register/sign in/sign out, create multiple couple spaces with unique slugs, create invitations, open private reply links on another browser/device, accept/counter/reschedule, refresh owner replies, and save up to 50 scrapbook memories with compressed photos. Profiles include names, note, cover photo and theme. Preview clients are not an entitlement system.

Local-only default binding is 127.0.0.1. For deployment configure PORT, HOST, PUBLIC_ORIGIN (exact HTTPS origin), and optional PICKADATE_DB. Use persistent disk and back up the SQLite database. Public deployment still requires TLS, tested hosting configuration, account recovery/email verification, production rate limiting, privacy/service terms, deletion/export controls, payment verification and subdomain routing. No live payment or subdomain provision is implemented. Do not expose this development build as a paid production service yet. Invitation times use the viewer's local timezone; shared timezone selection remains to be implemented.

Validation: JavaScript syntax checks and HTTP integration checks for registration, login/logout, durable records, cross-account access denial, public partner replies, scrapbook saving and rejected cross-origin mutations.


Latest workflow: the preview carries names, email, address, theme, note and photo into account onboarding. Saved spaces now offer profile editing, cover-photo display, copy-link controls and canvas PNG date-ticket export. Cover photos and themes also appear on partner invitation pages.


Cloudflare deployment: use worker.mjs with wrangler.jsonc and the public assets directory. Run python prepare-cloudflare.py after source edits, then node test-worker.mjs. D1 staging database is provisioned with schema.sql. Configure builds from revamp/couple-spaces with no build command and npx wrangler deploy as the deploy command. The intended main domain is suratwala.in; customer addresses will be first-level subdomains. Existing live DNS has not been changed.
