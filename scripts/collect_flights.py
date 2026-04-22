#!/usr/bin/env python3
"""
Flight Delay Data Collector
Collects US flight delay data from AviationStack API (primary)
and saves daily snapshots to the data/ directory.
"""

import os
import json
import datetime
import requests
import sys
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
API_KEY = os.environ.get("AVIATIONSTACK_API_KEY", "")
BASE_URL = "https://api.aviationstack.com/v1"

# Monitored US airports by IATA code
US_AIRPORTS = [
    "ATL", "ORD", "DFW", "DEN", "LAS", "CMH", "DTW", "LGA", "TPA"
]

# ─── Data Collection ───────────────────────────────────────────────────────────

def fetch_flights_for_airport(iata_code: str, flight_type: str = "departure") -> list:
    """Fetch delayed flights for a given airport using AviationStack."""
    params = {
        "access_key": API_KEY,
        "dep_iata" if flight_type == "departure" else "arr_iata": iata_code,
        "flight_status": "active",
        "limit": 100,
    }
    try:
        resp = requests.get(f"{BASE_URL}/flights", params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [])
    except Exception as e:
        print(f"  ⚠ Error fetching {flight_type}s for {iata_code}: {e}", file=sys.stderr)
        return []


def fetch_all_us_flights() -> list:
    """Collect flight data across all major US airports."""
    all_flights = []
    seen_flight_ids = set()

    for airport in US_AIRPORTS:
        print(f"  → Fetching departures from {airport}...")
        flights = fetch_flights_for_airport(airport, "departure")
        for f in flights:
            fid = f.get("flight", {}).get("iata", "") or f.get("flight", {}).get("icao", "")
            if fid and fid not in seen_flight_ids:
                seen_flight_ids.add(fid)
                all_flights.append(f)

    print(f"  ✓ Collected {len(all_flights)} unique flights")
    return all_flights


def normalize_flight(raw: dict) -> dict:
    """Normalize a raw API flight record into a clean schema."""
    dep = raw.get("departure", {})
    arr = raw.get("arrival", {})
    airline = raw.get("airline", {})
    flight = raw.get("flight", {})
    aircraft = raw.get("aircraft", {})

    dep_delay = dep.get("delay") or 0
    arr_delay = arr.get("delay") or 0

    return {
        "flight_iata": flight.get("iata", ""),
        "flight_icao": flight.get("icao", ""),
        "airline_name": airline.get("name", ""),
        "airline_iata": airline.get("iata", ""),
        "status": raw.get("flight_status", "unknown"),

        "departure": {
            "airport": dep.get("airport", ""),
            "iata": dep.get("iata", ""),
            "terminal": dep.get("terminal", ""),
            "gate": dep.get("gate", ""),
            "scheduled": dep.get("scheduled", ""),
            "estimated": dep.get("estimated", ""),
            "actual": dep.get("actual", ""),
            "delay_minutes": dep_delay,
        },
        "arrival": {
            "airport": arr.get("airport", ""),
            "iata": arr.get("iata", ""),
            "terminal": arr.get("terminal", ""),
            "gate": arr.get("gate", ""),
            "scheduled": arr.get("scheduled", ""),
            "estimated": arr.get("estimated", ""),
            "actual": arr.get("actual", ""),
            "delay_minutes": arr_delay,
        },

        "aircraft_icao": aircraft.get("icao", "") if aircraft else "",
        "is_delayed": dep_delay > 15 or arr_delay > 15,
        "max_delay_minutes": max(dep_delay, arr_delay),
        "delay_category": categorize_delay(max(dep_delay, arr_delay)),
    }


def categorize_delay(minutes: int) -> str:
    if minutes <= 0:
        return "on_time"
    elif minutes <= 15:
        return "minor"       # ≤15 min
    elif minutes <= 45:
        return "moderate"    # 15–45 min
    elif minutes <= 120:
        return "significant" # 45 min–2 hr
    else:
        return "severe"      # 2hr+


def build_summary(flights: list, date_str: str) -> dict:
    """Build aggregated summary statistics from a list of normalized flights."""
    total = len(flights)
    delayed = [f for f in flights if f["is_delayed"]]
    cancelled = [f for f in flights if f["status"] == "cancelled"]

    delays_by_airport = {}
    delays_by_airline = {}

    for f in flights:
        dep_iata = f["departure"]["iata"]
        airline = f["airline_name"] or f["airline_iata"]

        # Per airport
        if dep_iata not in delays_by_airport:
            delays_by_airport[dep_iata] = {"total": 0, "delayed": 0, "total_delay_minutes": 0}
        delays_by_airport[dep_iata]["total"] += 1
        if f["is_delayed"]:
            delays_by_airport[dep_iata]["delayed"] += 1
            delays_by_airport[dep_iata]["total_delay_minutes"] += f["max_delay_minutes"]

        # Per airline
        if airline not in delays_by_airline:
            delays_by_airline[airline] = {"total": 0, "delayed": 0, "total_delay_minutes": 0}
        delays_by_airline[airline]["total"] += 1
        if f["is_delayed"]:
            delays_by_airline[airline]["delayed"] += 1
            delays_by_airline[airline]["total_delay_minutes"] += f["max_delay_minutes"]

    # Compute delay rates
    for airport, stats in delays_by_airport.items():
        stats["delay_rate_pct"] = round(stats["delayed"] / stats["total"] * 100, 1) if stats["total"] else 0
        stats["avg_delay_minutes"] = round(stats["total_delay_minutes"] / max(stats["delayed"], 1), 1)

    for airline, stats in delays_by_airline.items():
        stats["delay_rate_pct"] = round(stats["delayed"] / stats["total"] * 100, 1) if stats["total"] else 0
        stats["avg_delay_minutes"] = round(stats["total_delay_minutes"] / max(stats["delayed"], 1), 1)

    delay_categories = {"on_time": 0, "minor": 0, "moderate": 0, "significant": 0, "severe": 0}
    for f in flights:
        delay_categories[f["delay_category"]] = delay_categories.get(f["delay_category"], 0) + 1

    total_delay_minutes = sum(f["max_delay_minutes"] for f in delayed)

    return {
        "date": date_str,
        "collected_at": datetime.datetime.utcnow().isoformat() + "Z",
        "totals": {
            "flights": total,
            "delayed": len(delayed),
            "cancelled": len(cancelled),
            "on_time": total - len(delayed) - len(cancelled),
            "delay_rate_pct": round(len(delayed) / total * 100, 1) if total else 0,
            "avg_delay_minutes": round(total_delay_minutes / max(len(delayed), 1), 1),
        },
        "delay_categories": delay_categories,
        "by_airport": delays_by_airport,
        "by_airline": delays_by_airline,
    }


# ─── Persistence ───────────────────────────────────────────────────────────────

def save_daily_data(date_str: str, flights: list, summary: dict):
    """Save raw flights and summary for a given date."""
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)

    # Save full flight records
    daily_file = data_dir / f"{date_str}.json"
    with open(daily_file, "w") as f:
        json.dump({"date": date_str, "flights": flights, "summary": summary}, f, indent=2)
    print(f"  ✓ Saved daily data → {daily_file}")

    # Update cumulative index
    index_file = data_dir / "index.json"
    index = []
    if index_file.exists():
        try:
            index = json.loads(index_file.read_text())
        except Exception:
            index = []

    # Upsert this date's summary
    index = [e for e in index if e.get("date") != date_str]
    index.append(summary)
    index.sort(key=lambda x: x["date"])

    with open(index_file, "w") as f:
        json.dump(index, f, indent=2)
    print(f"  ✓ Updated index.json ({len(index)} days)")


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not API_KEY:
        print("❌ AVIATIONSTACK_API_KEY environment variable not set.", file=sys.stderr)
        print("   Get a free key at https://aviationstack.com (100 req/month free)", file=sys.stderr)
        sys.exit(1)

    today = datetime.date.today().isoformat()
    print(f"\n🛫 Flight Delay Collector — {today}")
    print("=" * 50)

    print("\n[1/3] Fetching flight data from AviationStack...")
    raw_flights = fetch_all_us_flights()

    if not raw_flights:
        print("⚠ No flights returned. Check API key and quota.", file=sys.stderr)
        sys.exit(1)

    print("\n[2/3] Normalizing flight records...")
    flights = [normalize_flight(f) for f in raw_flights]

    print("\n[3/3] Building summary and saving...")
    summary = build_summary(flights, today)
    save_daily_data(today, flights, summary)

    print(f"\n✅ Done! Collected {summary['totals']['flights']} flights")
    print(f"   Delayed: {summary['totals']['delayed']} ({summary['totals']['delay_rate_pct']}%)")
    print(f"   Avg delay: {summary['totals']['avg_delay_minutes']} min")


if __name__ == "__main__":
    main()
