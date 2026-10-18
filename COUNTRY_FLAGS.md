# S9 country flags

Review branch: `codex/s9-country-flags-review`.
Companion bot branch: `PuffRepo/200-Bot-V2:codex/flags-mmr-card-review`.

The S9 adapter used to overwrite all country values with empty strings. It now
allowlists the public snapshot's `players[].country_code`, normalizes valid
ISO alpha-2 codes, and forwards them to leaderboard, profile and API results.
The country filter is populated from the same S9 roster. Old snapshots without
country fields remain compatible. Missing/invalid countries stay blank.

Flags use bundled flag-icons 7.5.0 SVG assets (MIT, license in public/flags),
including leaderboard and profile images. No external flag CDN or Windows emoji
font is needed. Unknown countries render no image rather than a broken URL.
The existing page design and explicit archival season routing are preserved.

The bot supplies recorded countries by stable Discord ID. A website change
cannot recover missing countries itself. The companion bot patch uses explicit,
unambiguous imported country fields and adds staff-only `/set_country` with
an audited source/reason. It does not guess MKC accounts from names.

Validate with `npm test`, `npm run build`, and `npm run test:standalone`.
The smoke test serves synthetic data locally and verifies leaderboard/profile
flag URLs, the bundled SVG response, APIs, pages, and stale-feed failures.
It does not connect a Discord bot or use production SQLite.

Review both branches before release. The currently configured website
`codex/s9-website-review` branch may auto-deploy when pushed; this new review
branch is separate. After the reviewed bot and website changes are released,
allow up to 60 seconds for the bot's feed cache, reload the website and inspect
an actual player's verified country. No new environment variables are needed.
Do not re-import the production roster or fabricate a production match.
