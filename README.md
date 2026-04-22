# ✈ US Flight Delay Tracker

A fully automated pipeline that collects US flight delay data nightly and powers a live dashboard — all for free using GitHub Actions + GitHub Pages.

---

## 🗂 Repository Structure

```
flight-delay-tracker/
├── .github/
│   └── workflows/
│       └── collect_daily.yml     # Scheduled job (runs every night at 9 PM ET)
├── scripts/
│   ├── collect_flights.py        # Data collection script
│   └── requirements.txt
├── data/
│   ├── index.json                # Cumulative summary (auto-updated)
│   ├── 2025-04-21.json           # Daily snapshot files (auto-generated)
│   └── ...
├── docs/
│   └── index.html                # Live dashboard (served via GitHub Pages)
└── README.md
```

---

## 🚀 Setup (5 minutes)

### 1. Create a new GitHub repo
Create a new repository (public recommended — unlimited free Actions minutes).

### 2. Push this code
```bash
git init
git add .
git commit -m "🛫 Initial setup: flight delay tracker"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 3. Get a free AviationStack API key
1. Go to [aviationstack.com](https://aviationstack.com)
2. Sign up for the **free plan** (100 requests/month)
3. Copy your API key from the dashboard

> **Note on free tier:** The free plan gives 100 API calls/month. The script queries 30 airports once per run = ~30 requests/day. For a full month that's ~900 requests. **Upgrade to the $49.99/month Starter plan** for 10,000 requests/month to cover all airports reliably. Alternatively, the free tier works if you reduce `US_AIRPORTS` to ~3 airports in `collect_flights.py`.

### 4. Add the API key as a GitHub Secret
1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `AVIATIONSTACK_API_KEY`
4. Value: your API key
5. Click **Add secret**

### 5. Enable GitHub Pages
1. Go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / Folder: `/docs`
4. Click **Save**

Your dashboard will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### 6. Run your first collection manually
1. Go to **Actions** tab → **Daily Flight Delay Collection**
2. Click **Run workflow** → **Run workflow**
3. Watch it collect data! (~2 minutes)

---

## ⏰ Schedule

The workflow runs automatically every night at **9:00 PM Eastern Time** (01:05 UTC).

GitHub Actions cron is in UTC. EST = UTC-5, EDT = UTC-4. The cron is set to `5 1 * * *` which covers 9 PM ET year-round (accounting for DST is approximate — GitHub may run ±30 min off schedule during peak times).

---

## 📊 Data Schema

### `data/index.json`
An array of daily summary objects:
```json
[
  {
    "date": "2025-04-21",
    "collected_at": "2025-04-22T01:07:23Z",
    "totals": {
      "flights": 842,
      "delayed": 187,
      "cancelled": 12,
      "on_time": 643,
      "delay_rate_pct": 22.2,
      "avg_delay_minutes": 38.5
    },
    "delay_categories": {
      "on_time": 643,
      "minor": 67,
      "moderate": 71,
      "significant": 38,
      "severe": 11
    },
    "by_airport": {
      "ATL": { "total": 94, "delayed": 21, "delay_rate_pct": 22.3, "avg_delay_minutes": 41 }
    },
    "by_airline": {
      "Delta Air Lines": { "total": 142, "delayed": 28, "delay_rate_pct": 19.7, "avg_delay_minutes": 33 }
    }
  }
]
```

### `data/YYYY-MM-DD.json`
Full daily snapshot including every individual flight record with departure/arrival times, delay minutes, airline, airports, and status.

---

## 📈 Dashboard Features

- **KPI Cards**: Total flights, delayed count, average delay, cancellations, 30-day average
- **30-Day Trend Chart**: Delay rate % and average delay minutes over time
- **Delay Category Donut**: Distribution of on-time vs minor/moderate/significant/severe delays
- **Airline Bar Chart**: Top 10 airlines ranked by average delay
- **Airport Grid**: All monitored airports with delay rates and color-coded severity
- **History Table**: Day-by-day breakdown with at-a-glance delay badges

---

## 🔧 Customization

**Change monitored airports:** Edit `US_AIRPORTS` in `scripts/collect_flights.py`

**Change collection time:** Edit the cron in `.github/workflows/collect_daily.yml`
- `5 1 * * *` = 9:05 PM ET
- `5 2 * * *` = 10:05 PM ET
- `5 6 * * *` = 2:05 AM ET

**Collect more data:** Add more airports to the list, or run multiple times per day with additional cron entries.

---

## 💰 Cost

| Resource | Cost |
|---|---|
| GitHub Actions (public repo) | **Free** (unlimited minutes) |
| GitHub Pages | **Free** |
| AviationStack Free Tier | **Free** (100 req/month — limit airports to ~3/day) |
| AviationStack Starter | $49.99/month (10,000 req — covers all 30 airports) |

---

## 📝 License

MIT
