# Database backups and recovery

## Existing recovery history

Cloudflare D1 Time Travel is always on for current D1 databases. Cloudflare documents a 7-day recovery window on Workers Free and 30 days on Workers Paid, without a separate enable step. This app uses the current D1 service. Provider documentation: https://developers.cloudflare.com/d1/reference/time-travel/

Current production database: pickadate-staging, ID 67731bbf-c164-4ab8-86c4-e37106e0c3c8. In Cloudflare open Storage & databases > D1 > pickadate-staging > Time Travel. Before a migration, record a bookmark. A recovery to an older bookmark affects every couple and can undo newer changes, so review the scope and take a fresh export before restoring. Do not test recovery on production.

## Encrypted external backup, activation pending

scripts/backup.mjs exports the complete D1 SQL snapshot over the official export API, compresses it, then encrypts with AES-256-GCM and a fresh IV. It never writes an unencrypted export during backup and never logs credentials, records or signed download links. Account records, password hashes, invitation links and inline photos make the database confidential even though passwords are hashed. Only encrypted .pdbak files may be uploaded as artifacts. Artifact retention is 7 days to limit recovery-copy retention.

The prepared GitHub Actions workflow is .github/workflows/backups.yml. It is NOT active until both of these steps are complete:

1. An administrator adds CLOUDFLARE_BACKUP_TOKEN (a token scoped to this Cloudflare account with the minimum D1 permissions needed to export) and BACKUP_KEY (a randomly generated 32-byte key encoded as base64) as GitHub Actions secrets. Store a separate secure copy of BACKUP_KEY outside GitHub. Losing it makes encrypted backups unrecoverable. Never put either secret in a commit or chat.
2. Install the backup workflow on the repository's default branch, or change the default branch after reviewing the existing GitHub Pages setup. GitHub only runs schedules from its default branch. The current production application branch is revamp/couple-spaces and the default branch is main. The workflow checks out the production branch explicitly. After credentials are configured and the workflow is on the default branch, run it manually and verify an encrypted artifact before relying on the daily 03:30 UTC schedule (09:00 IST).

No production backup has been exported in this session because backup credentials are not available. The existing Cloudflare build token is not exposed to this workflow and must not be copied from logs.

## Restore drill

`node test-backup.mjs` uses synthetic SQL only. It tests encryption/decryption, tamper and wrong-key rejection, export polling, restoration into a fresh SQLite database, integrity, references and inline photo preservation. This is not a production restore drill.

For a real recovery drill, download one encrypted artifact, set BACKUP_KEY securely in the operator's environment and run `node scripts/backup.mjs decrypt input.pdbak new-output.sql` in a private temporary directory outside the repository. The command refuses to overwrite an existing file. Import the SQL into a fresh, isolated D1 database, never the live database. Check row counts, photos, invitation dates, and access controls. Recovery restores old sessions and tokens too, so invalidate sessions and recovery tokens in the restored database before exposing it. Remove the temporary plaintext export once the drill is complete. Production replacement requires separate explicit approval of the restore point and data-loss window.

The CLI currently rejects exports above 128 MB. Increase this only after a storage/memory review. A free GitHub plan or disabled Actions can prevent scheduled runs; check job results and artifact age. The user-facing scrapbook export is a useful separate copy but does not replace an operator database backup.
