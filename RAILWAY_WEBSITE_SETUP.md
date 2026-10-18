# Railway website setup — review before deploying

No Railway service, domain or production database was changed while preparing
this setup. The live domain could not be inspected from this cloud environment
(DNS/HTTPS checks were blocked); ownership and existing hosting remain unknown.
Use Railway-generated temporary domains first. Do not repoint 200-lounge.com
until its ownership and the existing site's archive requirements are confirmed.

## Architecture

- Existing `mindful-inspiration` / `200-lounge-v2`: one bot process, the existing
  backup supervisor, and an optional public-feed worker on `$PORT`.
- New `200-lounge-web` service: the Next.js website from
  `PuffRepo/200-lounge.com`, built using this Dockerfile, Node 24 and a non-root
  runtime. It has no bot token, SQLite volume or R2 backup credentials.
- The public worker serves only `/public/s9.json` and `/health`. It opens the
  existing SQLite database with `mode=ro` / query-only; it never serves files or
  starts another bot. Data is cached for at most 60 seconds between requests.
  Failed refreshes return 503 rather than re-dating stale data.

No additional R2 bucket, database import, role transition or database reset is
needed. Public results go through the allowlisted JSON schema, not raw SQLite
or private backups. The existing backup configuration remains unchanged.

## 1. Review and test the bot update first

The `PuffRepo/200-Bot-V2` review branch is `codex/stats-v2-review`. It contains
`/stats`, the export contract and optional feed worker. From your Windows bot
checkout, keep local bots disconnected:

```powershell
git fetch origin
git switch codex/stats-v2-review
git merge --ff-only origin/codex/stats-v2-review
.\.venv-v2-tests\Scripts\python.exe scripts\run_solo_tests.py
.\.venv-v2-tests\Scripts\python.exe -m unittest discover -s tests -p test_production_backups.py -v
```

Before release, verify a fresh real backup and existing scheduled backup logs.
Only when ready to deploy, push the reviewed bot branch to
`v2-production-integration` without force. This is the existing production
service: do not create another bot service or run a local bot.

In Railway's **existing bot service**, preserve this start command:

```text
/app/.venv/bin/python scripts/production_with_backups.py --config /app/private/production.json
```

Add the non-secret variable `LOUNGE_PUBLIC_FEED_ENABLED=1` only after the reviewed
feed code is deployed, then apply the configuration/redeploy once as needed.
Without that exact opt-in the public worker stays disabled. Keep one replica,
Python 3.13, `/app/private`, all current bot/backup secrets and the production
SQLite file. Never re-import or replace production from an older local file.

Under the bot service's networking settings, generate a public HTTPS domain
for the worker's target port. The worker uses Railway's injected `PORT`; if no
port is supplied, it defaults to 8080. If selecting a target port manually,
ensure it matches the configured `PORT` (8080 is a suitable explicit choice).
Do not expose database ports. Check these paths on the actual generated domain:

```text
/health
/public/s9.json
```

The first should show `ready: true`, S9 and a fresh timestamp. The second should
show real S9 public data only. An initial 503 can occur until the production
runtime has the S9 schema ready. Continue checking `Production bot ready` and
`BACKUP VERIFIED`; a failed public worker retries without restarting the bot.
The bot supervisor still terminates its children if the bot exits.

## 2. Create the separate website service

In Railway project `mindful-inspiration`, add a GitHub-backed **website** service
from `PuffRepo/200-lounge.com`. Grant the GitHub integration access to that fork
if it is not listed. Select branch `codex/s9-website-review` for the first
reviewed deployment and name the service `200-lounge-web`.

Use the repository Dockerfile and `railway.json`; no custom Start Command is
needed. The container runs `node server.js`, honors `$PORT`, and starts no bot.
Configure these non-secret **website-service** variables before deployment:

```text
S9_PUBLIC_DATA_URL=https://ACTUAL_BOT_GENERATED_DOMAIN/public/s9.json
S9_MAX_AGE_SECONDS=900
```

Replace the domain placeholder with the bot service domain verified in step 1.
Leave `S9_PUBLIC_DATA_FILE` unset in the hosted website. Do not put the bot token
or R2 keys in this service. Do not point the URL at a backup object.

The health check is `/api/health`; it returns 200 only when the public feed is
reachable, schema-valid and fresh. Otherwise the deployment should fail its
readiness check, rather than appear healthy with fake or legacy S9 ratings.
Creating a Railway service starts billable resources according to your plan;
review the resource estimate before creating/deploying it.

Generate a public Railway domain for this website service. Use it first; don't
change DNS or a custom domain yet. Inspect the home, player, match and statistics
pages with real data. Compare a genuine player's current website/API MMR with
Discord `/mmr`; allow up to about a minute for a changed source balance to refresh.
Verify `/api/all_players` and `/api/discord/ACTUAL_DISCORD_ID` preserve exact IDs.
No fabricated production match or bot restart for testing is needed.

Explicit S5–S7 archive URLs still need their original read-only MySQL credentials
and reachable database. They were not supplied or tested here. Don't claim
those archives are live merely because S9 works; preserve the old site while
archive hosting is resolved. Missing country/friend-code and ban data are not
invented from private registry records.

## 3. Domain and MogiBot follow-up

After reviewing the generated-domain website, confirm control of 200-lounge.com
and inspect its existing hosting/DNS before moving it. Railway will provide the
required DNS records for a custom domain; use those actual values rather than
invented IPs/CNAMEs. Keep existing mail/verification records intact.

Finally verify MogiBot's **actual configured source URL** and refresh interval.
The new `/api/all_players` can supply S9 ratings, but changing this website does
not prove that `/teamsmmr` reads it or invalidate MogiBot's independent cache.
Do not retire the old endpoint until consumers and archives are accounted for.

## Tests and rollback

```text
npm ci --ignore-scripts
npm test
npm run build
npm run test:standalone
```

The standalone smoke suite runs the same `server.js` artifact used by the
container, including `/api/health`, pages, APIs, large IDs, unplayed players and
stale-feed 503 checks, using synthetic local public JSON. It starts no Discord
bot. Docker build/smoke validation, when available, is reported separately.

To disable only the public worker, set `LOUNGE_PUBLIC_FEED_ENABLED=0` on the
existing bot supervisor and redeploy its settings; do not change the database
or backup credentials. The website then fails closed as its feed becomes
unavailable. You can stop the separate website service without stopping the
bot. Reverting web code or DNS does not require restoring an old database.

Validation in the cloud environment: 180 V2 tests, 10 backup tests, 11 website
adapter tests and the standalone smoke suite passed. A container image built
with the same application/runtime stages and an offline dependency stage using
the already downloaded npm cache also passed actual HTTP/asset/port/non-root
and stale-readiness checks. `npm ci --offline` verified lockfile artifact hashes;
no checksum or TLS checks were disabled. Clean dependency installation over
this environment's Docker network could not be completed (direct DNS failed;
the HTTPS proxy required the supplied CA). A CA-enabled registry ping succeeded,
but the complete networked install remained stalled and was canceled. The
normal Dockerfile retains verified HTTPS installation; Railway's actual remote
build is still a deployment-time check. No test image or fixture was deployed.
