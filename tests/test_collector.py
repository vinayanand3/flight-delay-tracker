import datetime as dt
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch,Mock
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import collect_flights as c
from build_dashboard import build

def raw(delay=None,arrival=None,status='active',scheduled='2026-09-14T01:00:00Z'):
    return {'flight':{'iata':'AA1'},'airline':{'name':'American'},'flight_status':status,'departure':{'iata':'ATL','delay':delay,'scheduled':scheduled},'arrival':{'iata':'ORD','delay':arrival},'aircraft':None}

class CollectorTests(unittest.TestCase):
    def test_unknown_is_not_zero(self):
        f=c.normalize_flight(raw())
        self.assertIsNone(f['max_delay_minutes']);self.assertFalse(f['delay_known']);self.assertFalse(f['is_delayed'])
        self.assertEqual(f['delay_category'],'unknown')
    def test_boundary_and_null_objects(self):
        self.assertFalse(c.normalize_flight(raw(15))['is_delayed'])
        self.assertTrue(c.normalize_flight(raw(16))['is_delayed'])
        self.assertEqual(c.normalize_flight({'departure':None,'arrival':None,'flight':None,'airline':None})['delay_category'],'unknown')
    def test_cancelled_not_double_counted(self):
        f=c.normalize_flight(raw(60,status='cancelled'))
        s=c.build_summary([f],'2026-09-14')
        self.assertEqual(s['totals']['delayed'],0);self.assertEqual(s['totals']['cancelled'],1)
        self.assertIsNone(s['totals']['on_time'])
    def test_invalid_delays(self):
        for value in (True,'broken',float('nan'),float('inf')):self.assertIsNone(c.delay_value(value))
    def test_weighted_summary(self):
        s=c.build_summary([c.normalize_flight(raw(20)),c.normalize_flight(raw(40)),c.normalize_flight(raw(0)),c.normalize_flight(raw())],'2026-09-14')
        self.assertEqual(s['totals']['delay_rate_pct'],66.7);self.assertEqual(s['totals']['avg_delay_minutes'],30)
    def test_rotation_budget(self):
        start=dt.date(2026,9,1)
        groups=[c.airports_for_day((start+dt.timedelta(days=i)).isoformat()) for i in range(31)]
        self.assertEqual(sum(map(len,groups)),93)
        self.assertEqual(set(sum(groups[:3],[])),set(c.US_AIRPORTS))
    def test_identity_includes_leg(self):
        self.assertNotEqual(c.flight_key(c.normalize_flight(raw(20))),c.flight_key(c.normalize_flight(raw(20,scheduled='2026-09-14T20:00:00Z'))))
    def test_http_failure_sanitized(self):
        with patch.object(c.requests,'get',return_value=Mock(status_code=429)):
            with self.assertRaisesRegex(c.CollectionError,'HTTP 429'):c.fetch_flights_for_airport('ATL')
    def test_api_error_http_200(self):
        with patch.object(c.requests,'get',return_value=Mock(status_code=200,json=lambda:{'error':{'message':'SECRET'}})):
            with self.assertRaisesRegex(c.CollectionError,'invalid data'):c.fetch_flights_for_airport('ATL')
    def test_corrupt_index_preserves_snapshot(self):
        with tempfile.TemporaryDirectory() as t,patch.object(c,'DATA_DIR',Path(t)):
            (Path(t)/'index.json').write_text('broken')
            with self.assertRaises(json.JSONDecodeError):c.save_daily_data('2026-09-14',[],{})
            self.assertFalse((Path(t)/'2026-09-14.json').exists())
    def test_failure_records_budget_no_snapshot(self):
        with tempfile.TemporaryDirectory() as t,patch.object(c,'DATA_DIR',Path(t)),patch.object(c,'API_KEY','test'),patch.object(c,'fetch_flights_for_airport',side_effect=c.CollectionError('API HTTP 429')):
            with self.assertRaises(c.CollectionError):c.main()
            health=json.loads((Path(t)/'collection-health.json').read_text())
            self.assertEqual(health['attempts'][0]['requests'],1)
            self.assertEqual(health['attempts'][0]['status'],'failed')
            with self.assertRaisesRegex(c.CollectionError,'Already attempted'):c.main()
            self.assertFalse((Path(t)/'index.json').exists())
    def test_archive_build(self):
        data=build(Path(__file__).resolve().parents[1]/'docs/data')
        self.assertGreaterEqual(len(data['days']),52)
        self.assertEqual(len(data['fields']),len(data['records'][0]))
        self.assertIn('2026-06-01',data['missing_dates'])

if __name__=='__main__':unittest.main()
