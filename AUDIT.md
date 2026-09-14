# Flight tracker audit

Audited September 14, 2026 against repository commit `41ecca5` and read-only GitHub settings and run history. Changes are prepared on `feat/flight-intelligence-dashboard`; the audit does not certify an unexecuted production rollout.

## Findings

| Priority | Finding and evidence | Resolution |
| --- | --- | --- |
| High | 52 daily files over 146 calendar days: 94 dates missing. 34,108 records total. September 5 run `33947525388` failed with HTTP 429 at all nine airports. Recent September 6 through 14 collections succeeded. | Visible coverage calendar, missing-day chart gaps, stale-data handling; free request budget and rotation. HTTP 429 is confirmed for the inspected failed run, not independently established for every gap. |
| High | Nine daily requests require 270 to 279 monthly requests, exceeding the documented 100-request free allowance. | Three daily queries, rotation across nine airports, 93-request rolling 31-day ceiling, no automatic retries or pagination. Each airport updates every third day. |
| High | `flight_status=active` excludes cancelled, scheduled, and landed flights. All 34,108 archived records are active. | Keep the economical sample but label all metrics as observations. Remove unsupported cancellation and official on-time claims. |
| High | Missing delays were converted to zero. 9,487 historical records have zero maximum delay; their original null provenance cannot be recovered. | Preserve nulls in new collection, retain legacy data, explain ambiguity. No fabricated correction of historical records. |
| Medium | One page, maximum 100 raw records per airport, no pagination. Codeshare marketing records may duplicate a physical flight. | Explicit sample limitation; page metadata captured going forward. No claim of unique aircraft movements. |
| Medium | Deduplication used flight number alone, dropping distinct legs with the same identifier. | Identity now includes flight number, origin, destination, and scheduled departure. Historical lost records cannot be recovered from normalized snapshots. |
| Medium | API errors were swallowed per airport and could yield silent partial success. Raw requests exceptions could contain the API key URL. | Fail collection on an airport request error, sanitize output, preserve prior flight data, persist request accounting. No raw exception URLs. |
| Medium | Corrupt index was silently replaced with an empty list. Snapshots older than 180 days were deleted while their index summaries remained. | Fail on corrupt JSON. Preserve all daily snapshots. No automatic historical deletion. |
| Medium | Prior UI advertised 30 airports, a 30-day window, and 9 PM ET year-round despite nine configured airports, full-history calculations, and UTC cron. | Accurate scope, real calendar filters, fixed UTC schedule with correct DST explanation. |
| Medium | Cancellation and delay sets could overlap in summary arithmetic, with negative on-time values possible. | No official on-time field computed; cancelled/diverted observations do not enter the delayed numerator. |
| Medium | Implicit Pages rebuild behavior after bot commits is fragile for chaining workflows. | Explicit `workflow_run` publishing after collection; push and manual deployment also supported. Requires Pages source migration to Actions. |
| Low | Old flight UI loaded React and Babel from external CDNs and a separate rolling log. | Dependency-free browser JavaScript modules; old URL redirects to the integrated explorer. Google Fonts are optional, with local fallback fonts. |

## What was already correct

- Pages is enabled at https://vinayanand3.github.io/flight-delay-tracker/, publicly accessible, with HTTPS enforced and `main:/docs` as its original source.
- `AVIATIONSTACK_API_KEY` exists as an Actions secret. Only its name and metadata were inspected; its value was not read.
- The latest published Pages deployment and collection were successful at audit time.
- All 52 daily summary objects match their index entries, and their flight and delayed counts reconcile to the archived records.
- No duplicate flight-number/scheduled-departure/origin identity was found within daily files. This does not rule out codeshares under different flight numbers.

## Definition decisions

Delay means a recorded maximum departure or arrival delay **greater than 15 minutes**, preserving the historical threshold. It is not BTS completed-arrival on-time performance. A known new delay is present if at least one endpoint supplies a finite numeric value; if neither does, it is unknown. Legacy delay zeros remain visible with a provenance warning.

The sampled delay rate divides delayed observations by observations with usable delay values. Average delay weights individual delayed observations. Missing days and empty selections have no estimated values. Dates are collection dates in UTC. Airport and airline filters intersect across all visualizations. Airline names are preserved from the API, including naming variations and possible codeshares.

The map is a locally authored schematic geographic outline with airport coordinates, not an operational airspace or navigation map. Marker sizes encode record count and colors encode sampled delay-rate bands. Weather, causes, cancellations, and operational alerts are not invented.

## Design application

Applied the project-installed VibeCurb visual and motion principles: consistent theme tokens, Manrope headings and DM Sans data labels, tabular numerals, purposeful restrained state transitions, responsive hierarchy, hover and keyboard focus states, and reduced-motion support. The user requested a functional rebuild, so existing collector and UI logic was corrected rather than restricted to cosmetic changes. The concept's restraint takes precedence over the motion skill's exhaustive animation suggestions.

## Validation

- 12 Python tests cover nulls, thresholds, status overlap, invalid numerics, weighted summaries, rotation, identity, HTTP/API errors, corrupt history, request accounting, and archive building.
- 6 JavaScript tests cover weighted metrics, unknown and empty values, the legacy threshold, calendar boundaries, combined filters, and safe CSV escaping.
- Browser checks: latest snapshot 833 observations; ORD filtering; flight search and detail dialog; route drill-down; theme persistence; custom no-data month; CSV download; refresh failure preserves loaded data; recovery; mobile horizontal overflow; reduced-motion layout.
- Desktop dark, desktop light, and mobile screenshots were visually inspected. No normal runtime console errors were observed. One intentionally aborted request was used to test the refresh error path.
- Historical daily snapshots and index were not rewritten. The generated public dataset reproduces the archived records.

## Remaining operational limits

No live API request was made during development, so the upgraded collector has unit-level and mocked HTTP validation, not a fresh provider response. No paid service was activated. The API account's actual remaining allowance and billing reset date are not exposed through the repository. Usage before this update or from another application is outside the new ledger; the initial billing period may still experience quota failures.

Scheduled workflows can run late, be disabled, or fail. GitHub may disable schedules on inactive public repositories after 60 days. The dashboard exposes staleness; Actions failure notifications depend on the repository owner's notification settings. It cannot guarantee a new successful dataset every day.

Publishing requires merging the branch, switching Pages source to GitHub Actions, and verifying the first deployment. The new collector must then be verified on its next scheduled run. No missing historical days can be backfilled from the present archive or free live-only API.

## Sources

- [AviationStack pricing and free allowance](https://aviationstack.com/pricing)
- [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Inspected failed collection](https://github.com/vinayanand3/flight-delay-tracker/actions/runs/33947525388)
- [Latest collection at audit](https://github.com/vinayanand3/flight-delay-tracker/actions/runs/34811871124)
