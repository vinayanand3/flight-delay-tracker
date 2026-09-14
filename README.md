# Airframe: flight intelligence

A free, public dashboard for casual exploration of daily US flight delay samples. Built with static HTML, CSS, and JavaScript for GitHub Pages. No frontend API key, application server, paid map, or JavaScript build dependency is required.

## Dashboard

- Dark and light themes with saved preference and reduced-motion support.
- Linked calendar-range, departure-airport, and airline filters.
- Weighted sample delay rate, average delay among delayed observations, and severe delays.
- Daily trend with real calendar gaps, clickable airport map, airline rankings, route matrix.
- Searchable, paginated flight explorer with historical departure and arrival details.
- CSV export of the current selection, with spreadsheet formula escaping.
- Collection calendar and definitions explaining incomplete coverage.
- Refresh on reopening the tab, every five minutes while visible, and on demand. Refresh failures keep the previous in-memory dataset. A snapshot older than 48 hours is labeled stale.

## Important data context

As audited on September 14, 2026, the repository contains **52 snapshots and 34,108 flight observations**, spanning April 22 through September 14, with **94 missing calendar days**. Every historical record has API status `active`. This is not a complete inventory of US flights, a cancellation monitor, or an official on-time performance source.

The legacy collector replaced missing delay values with zero. Historical zero values cannot prove a flight was on time. New snapshots preserve unknown delays. Marketing codeshares can count the same aircraft more than once. Historical records are preserved without inventing causes, filling gaps, or deleting old snapshots.

See [AUDIT.md](AUDIT.md) for findings and limitations.

## Free collection strategy

The [AviationStack free plan](https://aviationstack.com/pricing) lists 100 monthly requests. This collector queries **three airports per UTC day**, rotating through ATL, ORD, DFW, DEN, LAS, CMH, DTW, LGA, and TPA. Each airport is sampled every third day. Each query requests one page of up to 100 active departures; pagination is deliberately capped to preserve the free allowance.

A rolling 31-day ledger limits tracked requests to 93. Existing snapshots and same-day attempts prevent duplicate calls. Failed requests are conservatively counted locally. This does not reveal or override provider usage from earlier collectors or other applications. Existing quota exhaustion may continue until the provider resets the allowance. No paid subscription or additional API was activated.

Schedule: **01:17 UTC daily**, equivalent to 21:17 EDT or 20:17 EST on the previous local date. GitHub scheduling is best effort, not an exact refresh guarantee. Snapshot filenames use the UTC collection date.

## Local preview and checks

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python -m unittest discover -s tests
node --test tests/metrics.test.mjs
python3 scripts/build_dashboard.py
python3 -m http.server 8765 --directory docs
```

Open http://localhost:8765. Do not open index.html with file:// because module loading and fetch require an HTTP server.

## Publish in this repository

1. Merge the dashboard branch into `main`.
2. In **Settings > Pages > Build and deployment**, set **Source: GitHub Actions**. The audited repository currently uses branch publishing from `main` and `/docs`; the new workflow requires this one-time change.
3. Run **Publish flight dashboard** manually if it did not run from the merge.
4. Confirm a successful Pages deployment at https://vinayanand3.github.io/flight-delay-tracker/.
5. The existing `AVIATIONSTACK_API_KEY` Actions secret is retained. Do not add it to website files.

The collection workflow saves its request ledger even on collection failure, then reports failure. The Pages workflow runs after collection completion, including failed collections, and republishes the last valid snapshots. `workflow_run` is intentional: commits created with `GITHUB_TOKEN` do not reliably start another push-triggered workflow. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Files

| Path | Purpose |
| --- | --- |
| `scripts/collect_flights.py` | Budgeted, rotating daily collector |
| `scripts/build_dashboard.py` | Reproducible dashboard dataset from all snapshots |
| `docs/index.html` | Dashboard shell |
| `docs/assets/dashboard.js` | Views, filters, export, and refresh |
| `docs/assets/metrics.js` | Pure, tested calculations |
| `docs/assets/dashboard.css` | Responsive dark/light design and reduced motion |
| `docs/data/YYYY-MM-DD.json` | Preserved full daily snapshots |
| `docs/data/index.json` | Daily summary archive |
| `docs/data/dashboard.json` | Generated dataset consumed by the dashboard |
| `docs/data/collection-health.json` | Request accounting, created on the first new collection attempt |
| `docs/flights.html` | Redirect for the previous flight explorer URL |
| `.github/workflows/pages.yml` | Explicit static Pages deployment |

The previous `flights-log.json` and standalone JSX prototype are legacy artifacts and are no longer consumed or refreshed by the new dashboard. All current views use the full snapshot archive through `dashboard.json`.

The dashboard dataset grows with the archive. For much larger archives, split it by month and fetch selected months on demand. The present archive is small enough for client-side exploration.
