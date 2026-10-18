# Score averages and available seasons

Review branch: `codex/averages-s9-only-review`, based on released website commit
95580a5. This branch is separate from Railway's `codex/s9-website-review` branch.

Partner AVG and AVG Score display exactly two decimals, floored rather than
rounded, on both leaderboard and player pages. For example, 82.999 becomes
82.99; 82 becomes 82.00; zero remains 0.00; missing data displays N/A. Formatting
uses decimal digits rather than floating-point multiplication so 1.15 does not
accidentally become 1.14. Underlying statistics and sort values keep their full
precision.

The archived S5/S6/S7 exports exist in the bot repository, but the website's old
archive handlers depend on a legacy MySQL database that is not configured for
this deployment. This patch takes the requested S9-only fallback. It does not
claim the archives are impossible to restore; a read-only archive data adapter
can be a separate feature.

Desktop and mobile navigation expose only season 9. Old season 5/6/7 URLs for
leaderboard, players, mogis, stats and records redirect temporarily to the S9
leaderboard, avoiding accidental display of a different season's match under
an old ID. Internal links stay in S9. Archived API queries return an explicit
400 Season 9-only response and cannot fall through to a legacy database.
Unsupported seasons still return the existing 404/400 responses. The old
/new_stats page redirects to /stats?season=9.

Validation: `npm test`, `npm run build`, `npm run test:standalone`. Unit tests
exercise decimal boundaries, zero/missing values and API season guards. The
standalone HTTP smoke test verifies old-season redirects on all five data pages,
S9 APIs/pages, flag assets, two-decimal output and stale-feed failures.

No database or Railway configuration changes are required. Releasing requires
merging this review branch into `codex/s9-website-review` and pushing that branch,
which may auto-deploy. No release was performed for this patch.
