#!/usr/bin/env python3
"""Budgeted daily active-flight samples. Never claim complete airport coverage."""
import datetime as dt
import json
import math
import os
import sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT/'docs/data'
API_KEY = os.environ.get('AVIATIONSTACK_API_KEY','')
BASE_URL = 'https://api.aviationstack.com/v1'
US_AIRPORTS = ['ATL','ORD','DFW','DEN','LAS','CMH','DTW','LGA','TPA']
MAX_REQUESTS = 93  # rolling 31-day local ceiling, shared usage elsewhere is unknown

class CollectionError(RuntimeError):
    pass

def atomic_json(path, value, compact=False):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp = path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(value,indent=None if compact else 2,allow_nan=False)+'\n')
    tmp.replace(path)

def read_json(path, default):
    # Corrupt history is an error, never an excuse to replace it with an empty list.
    return json.loads(path.read_text()) if path.exists() else default

def airports_for_day(date):
    offset = (dt.date.fromisoformat(date).toordinal()%3)*3
    return US_AIRPORTS[offset:offset+3]

def fetch_flights_for_airport(code):
    try:
        response = requests.get(BASE_URL+'/flights',params={'access_key':API_KEY,'dep_iata':code,'flight_status':'active','limit':100},timeout=25)
        if response.status_code != 200:
            raise CollectionError(f'{code}: API HTTP {response.status_code}; previous snapshot preserved')
        payload = response.json()
    except (requests.RequestException, ValueError):
        # requests exceptions contain the URL and access_key, so never print them.
        raise CollectionError(f'{code}: API network or JSON error') from None
    if not isinstance(payload,dict) or payload.get('error') or not isinstance(payload.get('data'),list):
        raise CollectionError(f'{code}: API returned an error or invalid data')
    pagination = payload.get('pagination') or {}
    return payload['data'], {'airport':code,'returned':len(payload['data']),'available':pagination.get('total'),'page_limit':100,'complete':False}

def delay_value(value):
    if isinstance(value,bool) or value is None:
        return None
    try:
        n = float(value)
        return max(0,n) if math.isfinite(n) else None
    except (ValueError,TypeError):
        return None

def categorize_delay(minutes):
    if minutes is None:return 'unknown'
    if minutes <= 0:return 'on_time'
    if minutes <= 15:return 'minor'
    if minutes <= 45:return 'moderate'
    if minutes <= 120:return 'significant'
    return 'severe'

def normalize_flight(raw):
    dep,arr,airline,flight = (raw.get(k) or {} for k in ('departure','arrival','airline','flight'))
    dd,ad = delay_value(dep.get('delay')),delay_value(arr.get('delay'))
    known = [v for v in (dd,ad) if v is not None]
    delay = max(known) if known else None
    status = raw.get('flight_status') or 'unknown'
    def endpoint(source,value):
        return {**{k:source.get(k) for k in ('airport','iata','terminal','gate','scheduled','estimated','actual')},'delay_minutes':value}
    return {'flight_iata':flight.get('iata'),'flight_icao':flight.get('icao'),'flight_date':raw.get('flight_date'),'airline_name':airline.get('name'),'airline_iata':airline.get('iata'),'status':status,'departure':endpoint(dep,dd),'arrival':endpoint(arr,ad),'aircraft_icao':(raw.get('aircraft') or {}).get('icao'),'codeshared':flight.get('codeshared'),'delay_known':bool(known),'is_delayed':delay is not None and delay>15 and status not in ('cancelled','diverted'),'max_delay_minutes':delay,'delay_category':categorize_delay(delay)}

def flight_key(f):
    return (f.get('flight_iata') or f.get('flight_icao'),f['departure'].get('iata'),f['arrival'].get('iata'),f['departure'].get('scheduled'))

def build_summary(flights,date_str):
    delayed = [f for f in flights if f['is_delayed']]
    known = [f for f in flights if f['delay_known']]
    def grouped(key):
        groups = {}
        for f in flights:
            name = key(f) or 'Unknown'
            g = groups.setdefault(name,{'total':0,'known_delay':0,'delayed':0,'total_delay_minutes':0})
            g['total']+=1;g['known_delay']+=int(f['delay_known'])
            if f['is_delayed']:g['delayed']+=1;g['total_delay_minutes']+=f['max_delay_minutes']
        for g in groups.values():
            g['delay_rate_pct']=round(g['delayed']/g['known_delay']*100,1) if g['known_delay'] else None
            g['avg_delay_minutes']=round(g['total_delay_minutes']/g['delayed'],1) if g['delayed'] else None
        return groups
    cats = {k:0 for k in ('on_time','minor','moderate','significant','severe','unknown')}
    for f in flights:cats[f['delay_category']]+=1
    return {'schema_version':2,'date':date_str,'collected_at':dt.datetime.now(dt.timezone.utc).isoformat(),'totals':{'flights':len(flights),'delayed':len(delayed),'cancelled':sum(f['status']=='cancelled' for f in flights),'on_time':None,'unknown_delay':len(flights)-len(known),'delay_rate_pct':round(len(delayed)/len(known)*100,1) if known else None,'avg_delay_minutes':round(sum(f['max_delay_minutes'] for f in delayed)/len(delayed),1) if delayed else None},'delay_categories':cats,'by_airport':grouped(lambda f:f['departure']['iata']),'by_airline':grouped(lambda f:f['airline_name'] or f['airline_iata'])}

def save_daily_data(date,flights,summary):
    index = read_json(DATA_DIR/'index.json',[])
    if not isinstance(index,list):raise CollectionError('Invalid archive index')
    index = sorted([e for e in index if e.get('date')!=date]+[summary],key=lambda e:e['date'])
    atomic_json(DATA_DIR/f'{date}.json',{'date':date,'flights':flights,'summary':summary})
    atomic_json(DATA_DIR/'index.json',index)
    # Historical snapshots are retained. No automatic deletion of research data.

def main():
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    if (DATA_DIR/f'{today}.json').exists():
        print(f'{today}: snapshot already exists; skipping API calls')
        return
    if not API_KEY:raise CollectionError('AVIATIONSTACK_API_KEY is not configured')
    ledger_file = DATA_DIR/'collection-health.json'
    health = read_json(ledger_file,{'attempts':[]})
    cutoff = (dt.date.fromisoformat(today)-dt.timedelta(days=30)).isoformat()
    attempts = [a for a in health['attempts'] if a['date']>=cutoff]
    if any(a['date']==today for a in attempts):raise CollectionError('Already attempted today; skipping repeated API usage')
    codes = airports_for_day(today)
    if sum(a['requests'] for a in attempts)+len(codes)>MAX_REQUESTS:raise CollectionError('Rolling 31-day request budget exhausted')
    attempt = {'date':today,'requests':0,'airports':codes,'status':'started'}
    attempts.append(attempt)
    health = {'attempts':attempts,'budget':MAX_REQUESTS,'window_days':31,'note':'Only requests recorded by this collector are counted. Other API usage is unknown.'}
    raw,coverage=[],[]
    try:
        for code in codes:
            attempt['requests']+=1
            atomic_json(ledger_file,health)
            flights,meta = fetch_flights_for_airport(code)
            raw.extend(flights);coverage.append(meta)
        if not raw:raise CollectionError('No active records returned; archive unchanged')
        normalized=[];seen=set()
        for raw_flight in raw:
            f = normalize_flight(raw_flight)
            key = flight_key(f)
            if key[0] and key not in seen:
                seen.add(key);normalized.append(f)
        if not normalized:raise CollectionError('No identifiable flight records; archive unchanged')
        summary=build_summary(normalized,today)
        summary['coverage']={'mode':'rotating_active_sample','complete':False,'airports_requested':codes,'airports':coverage,'requests':attempt['requests'],'delay_threshold_minutes':15}
        save_daily_data(today,normalized,summary)
        attempt['status']='success'
        print(f'{today}: saved {len(normalized)} observations from {", ".join(codes)}')
    except CollectionError:
        attempt['status']='failed'
        raise
    finally:
        atomic_json(ledger_file,health)

if __name__=='__main__':
    try:main()
    except CollectionError as exc:
        print(str(exc),file=sys.stderr)
        sys.exit(1)
