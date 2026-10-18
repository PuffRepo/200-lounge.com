# Reduce leaderboard page data

Review branch: `codex/leaderboard-payload-review`, based on website release
3c3a8d7. No deployment or production data changes were performed for this patch.

The homepage sent the entire roster as objects, repeating twelve property names
for every player. Next serializes that into page props even though the table
initially displays only fifty rows. A 1,916-player roster caused the reported
419 kB large-page-data warning.

The page now serializes each row as values in a shared column order. Trailing
known defaults are omitted for unplayed players and reconstructed exactly in
the browser. The existing leaderboard receives the same named objects, same
column order and full roster. Search, sorting, country/MMR/event filters and
pagination retain their existing input. Discord IDs remain exact strings,
Unicode names remain literal, and null statistics stay distinct from zero.
Raw averages keep full precision for sorting and still display floored decimals.

This reduces actual JSON rather than raising the warning threshold, deleting
players, deferring a second request or changing the public API contract. The
server-only snapshot and history data are not added to page props.

Validation: 17 unit tests, `npm run build`, and `npm run test:standalone` passed.
The HTTP smoke test builds a synthetic 1,916-player S9 roster, parses the actual
__NEXT_DATA__ script and verifies all players are present with exact IDs, names
and credited MMR. Its serialized page JSON is 102,570 bytes, below Next's
131,072-byte threshold. This is a local representative fixture measurement;
the live production payload has not been measured from this workspace.

The normal smoke checks also retain flags, floored averages, archive redirects,
S9 pages/APIs and unavailable/stale data handling. No bot release, database
migration, Railway variable or build configuration change is needed. Release by
merging this branch into codex/s9-website-review and pushing only when ready;
that branch may auto-deploy. After deployment, check /?season=9 and verify that
search and country filtering can still find players beyond the first fifty.
