#!/usr/bin/env python3
"""Build a compact, reproducible public dataset from preserved daily snapshots."""
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['date','flight','airline','origin','destination','delay','status','dep_scheduled','dep_actual','arr_scheduled','arr_actual','dep_delay','arr_delay','delay_known']

def build(data_dir):
    days, records = [], []
    for path in sorted(data_dir.glob('????-??-??.json')):
        snapshot = json.loads(path.read_text())
        date = path.stem
        dt.date.fromisoformat(date)
        if snapshot['date'] != date:
            raise ValueError(f'Date mismatch: {path.name}')
        flights = snapshot['flights']
        if snapshot['summary']['totals']['flights'] != len(flights):
            raise ValueError(f'Flight count mismatch: {path.name}')
        days.append({'date': date, 'collected_at': snapshot['summary']['collected_at'], 'count': len(flights), 'coverage': snapshot['summary'].get('coverage', {'mode':'legacy_active_sample','complete':False})})
        for f in flights:
            dep, arr = f['departure'], f['arrival']
            records.append([date, f.get('flight_iata') or f.get('flight_icao') or 'Unknown', f.get('airline_name') or f.get('airline_iata') or 'Unknown', dep.get('iata') or 'Unknown', arr.get('iata') or 'Unknown', f.get('max_delay_minutes'), f.get('status','unknown'), dep.get('scheduled'), dep.get('actual'), arr.get('scheduled'), arr.get('actual'), dep.get('delay_minutes'), arr.get('delay_minutes'), f.get('delay_known')])
    if not days:
        raise ValueError('No daily snapshots available')
    start, end = (dt.date.fromisoformat(days[i]['date']) for i in (0,-1))
    available = {d['date'] for d in days}
    missing = [(start+dt.timedelta(days=i)).isoformat() for i in range((end-start).days+1) if (start+dt.timedelta(days=i)).isoformat() not in available]
    return {'schema_version':1,'fields':FIELDS,'days':days,'missing_dates':missing,'records':records}

if __name__ == '__main__':
    result = build(ROOT/'docs/data')
    output = ROOT/'docs/data/dashboard.json'
    output.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
    print(f"Dashboard: {len(result['days'])} snapshots, {len(result['records'])} observations, {len(result['missing_dates'])} missing days")
