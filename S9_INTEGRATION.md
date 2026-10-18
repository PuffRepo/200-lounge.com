# S9 website adaptation — review only

This is an adaptation of billypom/200-lounge.com master at
`b6fde3d19153d3d09eea6e11d5842ca060dc5184`. It preserves the existing page layout,
stylesheets, fonts, images and archive SQL paths. S9 is the default on the
leaderboard, player, match, records and statistics pages and on the public API.
Explicit S5–S7 URLs retain the existing MySQL adapter; S8 data is not invented.
The approved S9 rank colors include Emerald/Ruby and the new upper thresholds.
Registered unplaced players no longer disappear or crash their player page.

## Data source

The bot review branch `codex/stats-v2-review` adds a read-only
`scripts/export_public_s9.py` command and matching V2 `/stats` accounting.
Use its schema-v1 JSON export, not a SQLite file, SQL dump or R2 backup.
The website uses one of these **server-only** variables:

- `S9_PUBLIC_DATA_FILE`: absolute path to an atomically refreshed sanitized JSON.
- `S9_PUBLIC_DATA_URL`: HTTPS URL serving only that public JSON (no auth URL,
  embedded credentials or redirect). Used when no local file is configured.
- `S9_MAX_AGE_SECONDS`: optional 60–86400, default 900.

No database credentials are needed for S9. Keep existing archive credentials
server-side if archives remain enabled. No `NEXT_PUBLIC_` credential variables
are introduced. Never serve `/app/private/production.sqlite3` or point the feed
at the existing private backup bucket. A separate sanitized feed may be public;
its publication mechanism still depends on the website's actual hosting.

This patch provides the export/adapter contract, **not** an active refresh
scheduler or live hosting configuration. Suggested export interval is five
minutes; default fail-closed age is fifteen minutes. Feed HTTP requests have a
ten-second timeout and API responses are `no-store`, with `X-S9-Generated-At`.
Stale, unavailable, wrong-season or malformed S9 data returns 503 and a clear
page state. It never silently substitutes legacy season ratings.

The loader validates the public schema and rebuilds allowed objects to exclude
private extra fields. All Discord IDs stay strings. Full original table
balances/deltas remain consistent snapshots; refunded effective deltas appear
as separate values. Aggregates use effective deltas once. Current player MMR
includes penalties/credits; placements do not count as wins or losses. The
player chart separately shows a current balance point. Country, friend codes
and public ban status are unavailable in this V2 contract and are not inferred
from private registry/strike records. Existing MKC mappings work only where
V2 actually has a verified MKC ID.

## Local validation

Node 24 was used. From this checkout:

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run test:smoke
```

The smoke script starts and stops a localhost **website** with synthetic public
fixture JSON; it never starts Discord, opens the bot database or calls Railway.
It exercises rendered pages and APIs, unplayed players, missing resources,
exact IDs and stale-feed 503 behavior. Fixtures are never a default data source.
The original CSS/font/image files are unchanged. Real archive database access
was not tested because no archive credentials/service were provided.

For an optional local browser session, explicitly configure a freshly generated
sanitized file and run `npm run dev`. Keep the production bot disconnected.
A timestamped synthetic file may be used locally only; do not publish it as
real S9 results. Never deploy this website with test fixture data.

## Release dependencies

No deployment, DNS, production data change, or public-feed publication has been
performed. Before releasing, confirm the website host, fork/repository ownership,
archive database availability, a reviewed export-refresh process, and where the
sanitized feed will live. Deploy the bot command and website independently after
review; neither should redeploy simply because these development files exist.

The `/api/all_players` and `/api/discord/:id` adapters can serve MogiBot S9 data
once deployed and fed correctly. Its actual configured source URL and refresh
delay are still unverified. Test a known genuine player's S9 MMR against `/mmr`
and the API before checking `/teamsmmr`, allowing the verified cache interval.
Do not claim that a stale MogiBot cache has been fixed by changing this code alone.
