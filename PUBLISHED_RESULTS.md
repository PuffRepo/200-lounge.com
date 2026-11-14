# Published match images

S9 result pages request `/api/results/<table-id>`. A successfully loaded PNG replaces the HTML scoreboard. Until it loads, or if it fails, the recorded-score scoreboard remains visible. The MMR table is unchanged.

The website proxy derives `/public/results/<table-id>.png` from the origin of the existing `S9_PUBLIC_DATA_URL`. No new environment variable, Discord token, public bucket or image regeneration is required on the website. The configured feed must be the bot service with the matching published-image endpoint deployed.

The bot service resolves the exact `results.png` attachment from `table_publications.results_id`. It checks that the table is applied in active S9, validates the message author and attachment location, and serves only verified PNG bytes. Signed Discord CDN links stay behind the proxy and can be refreshed without changing database records. The website receives no Discord token or message metadata.

This shows the PNG actually posted by the bot. If the bot originally used its local renderer (for example because Lorenzi could not safely render a literal international name), that is the image displayed. Missing/deleted Discord attachments use the scoreboard fallback rather than a regenerated substitute.

Deployment order:

1. Deploy the bot repository's `codex/published-results-images` change into `v2-production-integration`. The existing supervisor command, volume and variables remain unchanged. Expect the existing roster reconciliation delay during restart.
2. Check `/public/results/84.png` on the bot feed origin, using another applied, published match ID if necessary. A PNG should be returned. Unknown/reversed tables return 404; retrieval failures return 503.
3. Deploy this website change into `codex/s9-website-review`.
4. Refresh a match page and confirm the image is the same as its Discord results post. With the image request blocked in browser developer tools, confirm the scoreboard remains readable.

Older applied matches work if their recorded results messages and attachments still exist and the bot has permission to read them. No MMR replay, import or database migration is needed.

Tests: `npm test`, `npm run build`, `npm run test:smoke`. Bot tests include publication eligibility, image identity, corrupted/oversized PNGs, cache expiry, reversal races, and no token forwarding to the CDN. Browser interaction and a real production Discord attachment require post-deployment verification.
