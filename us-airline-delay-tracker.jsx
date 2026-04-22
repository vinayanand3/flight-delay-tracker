import { useState, useMemo, useRef, useEffect } from "react";

// ── Airlines ──────────────────────────────────────────────────────────────────
const AIRLINES = [
  { code: "AA", name: "American Airlines",  color: "#0078D4" },
  { code: "DL", name: "Delta Air Lines",    color: "#E01933" },
  { code: "UA", name: "United Airlines",    color: "#0047AB" },
  { code: "WN", name: "Southwest Airlines", color: "#FF6900" },
  { code: "B6", name: "JetBlue Airways",    color: "#0033A0" },
  { code: "AS", name: "Alaska Airlines",    color: "#00569C" },
  { code: "F9", name: "Frontier Airlines",  color: "#00843D" },
  { code: "NK", name: "Spirit Airlines",    color: "#CCAA00" },
  { code: "G4", name: "Allegiant Air",      color: "#FF6600" },
  { code: "SY", name: "Sun Country",        color: "#0057A8" },
  { code: "HA", name: "Hawaiian Airlines",  color: "#6B2D8B" },
  { code: "MX", name: "Breeze Airways",     color: "#00B5E2" },
];
const AIRLINE_MAP = Object.fromEntries(AIRLINES.map(a => [a.code, a]));

// ── Routes ────────────────────────────────────────────────────────────────────
const AIRLINE_ROUTES = {
  AA: [{ from:"DFW", to:"LAX" }, { from:"DFW", to:"JFK" }, { from:"DFW", to:"ORD" }, { from:"DFW", to:"MIA" }, { from:"CLT", to:"ATL" }, { from:"CLT", to:"BOS" }, { from:"PHX", to:"LAX" }, { from:"PHX", to:"DFW" }, { from:"MIA", to:"JFK" }],
  DL: [{ from:"ATL", to:"LAX" }, { from:"ATL", to:"JFK" }, { from:"ATL", to:"ORD" }, { from:"ATL", to:"DFW" }, { from:"DTW", to:"JFK" }, { from:"MSP", to:"ATL" }, { from:"SLC", to:"LAX" }, { from:"SEA", to:"ATL" }, { from:"ATL", to:"BOS" }],
  UA: [{ from:"EWR", to:"LAX" }, { from:"EWR", to:"ORD" }, { from:"ORD", to:"LAX" }, { from:"IAH", to:"LAX" }, { from:"IAH", to:"ORD" }, { from:"DEN", to:"ORD" }, { from:"SFO", to:"ORD" }, { from:"SFO", to:"JFK" }, { from:"DEN", to:"LAX" }],
  WN: [{ from:"LAS", to:"LAX" }, { from:"LAS", to:"DEN" }, { from:"LAS", to:"PHX" }, { from:"MDW", to:"LAX" }, { from:"MDW", to:"DEN" }, { from:"BWI", to:"ATL" }, { from:"HOU", to:"DEN" }, { from:"HOU", to:"LAS" }, { from:"DAL", to:"LAS" }],
  B6: [{ from:"JFK", to:"LAX" }, { from:"JFK", to:"BOS" }, { from:"JFK", to:"FLL" }, { from:"BOS", to:"LAX" }, { from:"BOS", to:"FLL" }, { from:"FLL", to:"BOS" }],
  AS: [{ from:"SEA", to:"LAX" }, { from:"SEA", to:"SFO" }, { from:"SEA", to:"JFK" }, { from:"PDX", to:"LAX" }, { from:"PDX", to:"SEA" }, { from:"ANC", to:"SEA" }],
  F9: [{ from:"DEN", to:"LAX" }, { from:"DEN", to:"MCO" }, { from:"DEN", to:"ATL" }, { from:"DEN", to:"LAS" }, { from:"DEN", to:"SFO" }, { from:"DEN", to:"DFW" }],
  NK: [{ from:"FLL", to:"LAS" }, { from:"FLL", to:"MCO" }, { from:"MCO", to:"LAS" }, { from:"LAS", to:"ATL" }, { from:"MCO", to:"ORD" }, { from:"FLL", to:"ATL" }],
  G4: [{ from:"LAS", to:"SFB" }, { from:"LAS", to:"PIE" }, { from:"SFB", to:"LAS" }],
  SY: [{ from:"MSP", to:"LAS" }, { from:"MSP", to:"LAX" }, { from:"MSP", to:"MCO" }],
  HA: [{ from:"HNL", to:"LAX" }, { from:"HNL", to:"SFO" }, { from:"HNL", to:"SEA" }, { from:"LAX", to:"HNL" }, { from:"SFO", to:"HNL" }],
  MX: [{ from:"TPA", to:"BDL" }, { from:"TPA", to:"RDU" }, { from:"BDL", to:"TPA" }],
};

const REASONS = ["Weather", "Late Aircraft", "Air Traffic Control", "Mechanical", "Crew Availability", "Security", "Gate Conflict", "Unknown"];

function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rc(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateFlights(count = 1200) {
  const flights = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const daysAgo = ri(0, 89);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const airlineCode = rc(AIRLINES).code;
    const routes = AIRLINE_ROUTES[airlineCode] || [];
    const route = rc(routes);
    const delayMin = ri(15, 280);
    flights.push({
      id: i,
      airline: airlineCode,
      flightNum: `${airlineCode}${ri(100, 9999)}`,
      from: route.from,
      to: route.to,
      date: date.toISOString().split("T")[0],
      scheduledDep: `${String(ri(5, 22)).padStart(2,"0")}:${rc(["00","15","30","45"])}`,
      delayMin,
      reason: rc(REASONS),
      status: delayMin > 180 ? "Cancelled" : delayMin > 60 ? "Major Delay" : "Minor Delay",
    });
  }
  return flights.sort((a, b) => b.date.localeCompare(a.date));
}

const ALL_FLIGHTS = generateFlights(1200);

const today = new Date();
const toDateStr = d => d.toISOString().split("T")[0];
const D90 = new Date(today); D90.setDate(today.getDate() - 89);
const DATE_MIN = toDateStr(D90);
const DATE_MAX = toDateStr(today);

function delayBadge(min) {
  if (min > 180) return { label: "CANC", color: "#ff4444" };
  if (min > 60)  return { label: `${min}m`, color: "#ff8c00" };
  return { label: `${min}m`, color: "#4ade80" };
}
function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${m}/${d}/${y}`;
}

// ── Airline Search Dropdown ───────────────────────────────────────────────────
function AirlineSearch({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);

  const selected = value ? AIRLINE_MAP[value] : null;

  const matches = useMemo(() => {
    if (!query) return AIRLINES;
    const q = query.toLowerCase();
    return AIRLINES.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (code) => { onChange(code); setQuery(""); setOpen(false); };
  const clear   = () => { onChange(null); setQuery(""); };

  return (
    <div ref={ref} style={{ position: "relative", width: 260 }}>
      <label style={{ color:"#555", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"'Space Mono',monospace", display:"block", marginBottom:5 }}>Airline</label>

      {/* Input box */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.04)", border: `1px solid ${selected ? selected.color + "66" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 3, padding: "7px 10px", cursor: "text",
      }} onClick={() => setOpen(true)}>
        {selected && <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color, flexShrink: 0 }} />}
        <input
          value={open ? query : (selected ? selected.name : "")}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search airline…"
          style={{ background: "none", border: "none", outline: "none", color: selected && !open ? "#e8e8e8" : "#aaa", fontSize: 12, fontFamily: "'IBM Plex Sans',sans-serif", width: "100%", cursor: "text" }}
        />
        {selected && !open && (
          <button onClick={e => { e.stopPropagation(); clear(); }}
            style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:14, lineHeight:1, padding:0, flexShrink:0 }}>✕</button>
        )}
        <span style={{ color:"#444", fontSize:10, flexShrink:0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#141618", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3,
          maxHeight: 240, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
          {matches.length === 0 ? (
            <div style={{ padding:"12px 14px", color:"#555", fontSize:12 }}>No airlines found</div>
          ) : matches.map(a => (
            <div key={a.code} onClick={() => select(a.code)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 14px", cursor: "pointer", fontSize: 12,
                background: value === a.code ? "rgba(255,255,255,0.05)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = value === a.code ? "rgba(255,255,255,0.05)" : "transparent"}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
              <span style={{ color: "#e8e8e8" }}>{a.name}</span>
              <span style={{ marginLeft: "auto", fontFamily:"'Space Mono',monospace", fontSize:10, color:"#555" }}>{a.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderLeft:`3px solid ${accent}`, borderRadius:2, padding:"12px 15px", flex:1, minWidth:110 }}>
      <div style={{ color:accent, fontFamily:"'Space Mono',monospace", fontSize:19, fontWeight:700 }}>{value}</div>
      <div style={{ color:"#bbb", fontSize:10, letterSpacing:0.8, textTransform:"uppercase", marginTop:2 }}>{label}</div>
      {sub && <div style={{ color:"#555", fontSize:10, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ color:"#999", fontSize:11 }}>{label}</span>
        <span style={{ color, fontFamily:"monospace", fontSize:11 }}>{value}</span>
      </div>
      <div style={{ background:"rgba(255,255,255,0.06)", height:3, borderRadius:2 }}>
        <div style={{ background:color, width:`${max > 0 ? Math.min(100,(value/max)*100) : 0}%`, height:"100%", borderRadius:2, transition:"width 0.4s ease" }} />
      </div>
    </div>
  );
}

function DateInput({ label, value, min, max, onChange }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ color:"#555", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>{label}</label>
      <input type="date" value={value} min={min} max={max} onChange={e => onChange(e.target.value)}
        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", color:"#e8e8e8", padding:"6px 10px", borderRadius:2, fontSize:12, fontFamily:"'Space Mono',monospace", outline:"none", colorScheme:"dark", cursor:"pointer" }} />
    </div>
  );
}

function AirportSelect({ label, value, airports, placeholder, onChange }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ color:"#555", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", color:value==="ALL"?"#555":"#e8e8e8", padding:"6px 10px", borderRadius:2, fontSize:12, fontFamily:"'Space Mono',monospace", cursor:"pointer", outline:"none" }}>
        <option value="ALL">{placeholder}</option>
        {airports.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function USAirlineDelayTracker() {
  const [selectedAirline, setSelectedAirline] = useState(null);
  const [dateFrom,        setDateFrom]        = useState(DATE_MIN);
  const [dateTo,          setDateTo]          = useState(DATE_MAX);
  const [fromAirport,     setFromAirport]     = useState("ALL");
  const [toAirport,       setToAirport]       = useState("ALL");
  const [filterStatus,    setFilterStatus]    = useState("ALL");
  const [filterReason,    setFilterReason]    = useState("ALL");
  const [search,          setSearch]          = useState("");
  const [sortBy,          setSortBy]          = useState("date");
  const [page,            setPage]            = useState(0);
  const [activeTab,       setActiveTab]       = useState("table");
  const PER_PAGE = 15;

  const airlineFlights = useMemo(() =>
    selectedAirline ? ALL_FLIGHTS.filter(f => f.airline === selectedAirline) : ALL_FLIGHTS,
    [selectedAirline]
  );

  // Use AIRLINE_ROUTES as source of truth so dropdowns always have valid options
  const routeSource = useMemo(() => {
    if (selectedAirline) return AIRLINE_ROUTES[selectedAirline] || [];
    return Object.values(AIRLINE_ROUTES).flat();
  }, [selectedAirline]);

  const availableFromAirports = useMemo(() => {
    const routes = toAirport === "ALL" ? routeSource : routeSource.filter(r => r.to === toAirport);
    return [...new Set(routes.map(r => r.from))].sort();
  }, [toAirport, routeSource]);

  const availableToAirports = useMemo(() => {
    const routes = fromAirport === "ALL" ? routeSource : routeSource.filter(r => r.from === fromAirport);
    return [...new Set(routes.map(r => r.to))].sort();
  }, [fromAirport, routeSource]);

  const hasFilters = selectedAirline || dateFrom !== DATE_MIN || dateTo !== DATE_MAX || fromAirport !== "ALL" || toAirport !== "ALL" || filterStatus !== "ALL" || filterReason !== "ALL" || search !== "";

  const resetAll = () => {
    setSelectedAirline(null); setDateFrom(DATE_MIN); setDateTo(DATE_MAX);
    setFromAirport("ALL"); setToAirport("ALL");
    setFilterStatus("ALL"); setFilterReason("ALL");
    setSearch(""); setPage(0);
  };

  const handleAirlineChange = (code) => {
    setSelectedAirline(code);
    setFromAirport("ALL"); setToAirport("ALL");
    setPage(0);
  };

  const filtered = useMemo(() => {
    let f = airlineFlights.filter(fl => {
      if (fl.date < dateFrom || fl.date > dateTo) return false;
      if (fromAirport !== "ALL" && fl.from !== fromAirport) return false;
      if (toAirport   !== "ALL" && fl.to   !== toAirport)   return false;
      if (filterStatus !== "ALL" && fl.status !== filterStatus) return false;
      if (filterReason !== "ALL" && fl.reason !== filterReason) return false;
      if (search) {
        const q = search.toUpperCase();
        if (!fl.flightNum.toUpperCase().includes(q) && !fl.from.includes(q) && !fl.to.includes(q)) return false;
      }
      return true;
    });
    if (sortBy === "delay")  f = [...f].sort((a,b) => b.delayMin - a.delayMin);
    if (sortBy === "date")   f = [...f].sort((a,b) => b.date.localeCompare(a.date));
    if (sortBy === "flight") f = [...f].sort((a,b) => a.flightNum.localeCompare(b.flightNum));
    return f;
  }, [airlineFlights, dateFrom, dateTo, fromAirport, toAirport, filterStatus, filterReason, search, sortBy]);

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const analytics = useMemo(() => {
    if (!filtered.length) return null;
    const avgDelay  = Math.round(filtered.reduce((s,f) => s + f.delayMin, 0) / filtered.length);
    const cancelled = filtered.filter(f => f.status === "Cancelled").length;
    const major     = filtered.filter(f => f.status === "Major Delay").length;
    const minor     = filtered.filter(f => f.status === "Minor Delay").length;
    const reasonMap = {};
    filtered.forEach(f => { reasonMap[f.reason] = (reasonMap[f.reason]||0)+1; });
    const reasons = Object.entries(reasonMap).sort((a,b) => b[1]-a[1]);
    const routeMap = {};
    filtered.forEach(f => {
      const k = `${f.from}→${f.to}`;
      if (!routeMap[k]) routeMap[k] = { total:0, count:0 };
      routeMap[k].total += f.delayMin; routeMap[k].count++;
    });
    const topRoutes  = Object.entries(routeMap).sort((a,b) => b[1].count - a[1].count).slice(0,6);
    const worstRoute = Object.entries(routeMap).sort((a,b) => (b[1].total/b[1].count)-(a[1].total/a[1].count))[0];
    return { avgDelay, cancelled, major, minor, reasons, topRoutes, worstRoute };
  }, [filtered]);

  const activeAirline = selectedAirline ? AIRLINE_MAP[selectedAirline] : null;

  const inputSt = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", color:"#e8e8e8", padding:"6px 10px", borderRadius:2, fontSize:12, fontFamily:"'Space Mono',monospace", outline:"none" };
  const sel     = { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.18)", color:"#e8e8e8", borderRadius:2, padding:"5px 10px", fontSize:10, cursor:"pointer", fontFamily:"'Space Mono',monospace" };
  const unsel   = { background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", color:"#555", borderRadius:2, padding:"5px 10px", fontSize:10, cursor:"pointer", fontFamily:"'Space Mono',monospace" };
  const pill    = { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#888", fontSize:10, padding:"2px 8px", borderRadius:20, fontFamily:"'Space Mono',monospace" };

  return (
    <div style={{ minHeight:"100vh", background:"#090a0c", color:"#e8e8e8", fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"15px 28px", display:"flex", alignItems:"center", gap:14, background:"rgba(255,255,255,0.012)" }}>
        <span style={{ fontSize:18 }}>✈</span>
        <div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:13, letterSpacing:2, color:"#e8e8e8" }}>
            US AIRLINE DELAY TRACKER
            {activeAirline && (
              <span style={{ marginLeft:12, color: activeAirline.color, fontSize:12 }}>· {activeAirline.name}</span>
            )}
          </div>
          <div style={{ color:"#444", fontSize:10, letterSpacing:0.5, marginTop:1 }}>All Major US Carriers · 90-Day Window · Mock Data</div>
        </div>
        <span style={{ marginLeft:"auto", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", color:"#444", fontSize:9, letterSpacing:1, padding:"3px 9px", borderRadius:2, fontFamily:"'Space Mono',monospace" }}>
          SWAP API KEY TO GO LIVE
        </span>
      </div>

      <div style={{ padding:"20px 28px", maxWidth:1300, margin:"0 auto" }}>

        {/* ── Filter Panel ── */}
        <div style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${activeAirline ? activeAirline.color + "33" : "rgba(255,255,255,0.07)"}`, borderRadius:3, padding:"18px 20px", marginBottom:18, transition:"border-color 0.3s" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:1.5, color:"#555", textTransform:"uppercase" }}>▸ Search & Filter</span>
            {hasFilters && <button onClick={resetAll} style={{ background:"none", border:"1px solid #222", color:"#555", borderRadius:2, padding:"3px 10px", fontSize:9, cursor:"pointer", fontFamily:"'Space Mono',monospace" }}>RESET ALL</button>}
          </div>

          <div style={{ display:"flex", gap:18, flexWrap:"wrap", alignItems:"flex-end" }}>

            {/* Airline search — primary */}
            <AirlineSearch value={selectedAirline} onChange={handleAirlineChange} />

            <div style={{ width:1, height:46, background:"rgba(255,255,255,0.06)", alignSelf:"center" }} />

            {/* Date range */}
            <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
              <DateInput label="From Date" value={dateFrom} min={DATE_MIN} max={dateTo} onChange={v => { setDateFrom(v); setPage(0); }} />
              <span style={{ color:"#333", marginBottom:9 }}>→</span>
              <DateInput label="To Date"   value={dateTo}   min={dateFrom} max={DATE_MAX} onChange={v => { setDateTo(v); setPage(0); }} />
            </div>

            <div style={{ width:1, height:46, background:"rgba(255,255,255,0.06)", alignSelf:"center" }} />

            {/* Route */}
            <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
              <AirportSelect label="Origin" value={fromAirport} airports={availableFromAirports} placeholder="Any Origin"
                onChange={v => { setFromAirport(v); setToAirport("ALL"); setPage(0); }} />
              <span style={{ color:"#333", marginBottom:9, fontSize:16 }}>✈</span>
              <AirportSelect label="Destination" value={toAirport} airports={availableToAirports} placeholder="Any Dest."
                onChange={v => { setToAirport(v); setPage(0); }} />
            </div>

            <div style={{ width:1, height:46, background:"rgba(255,255,255,0.06)", alignSelf:"center" }} />

            {/* Status + Reason */}
            <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ color:"#555", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>Status</label>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }} style={{ ...inputSt, cursor:"pointer" }}>
                  <option value="ALL">All</option>
                  <option value="Minor Delay">Minor Delay</option>
                  <option value="Major Delay">Major Delay</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ color:"#555", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>Reason</label>
                <select value={filterReason} onChange={e => { setFilterReason(e.target.value); setPage(0); }} style={{ ...inputSt, cursor:"pointer" }}>
                  <option value="ALL">All</option>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Flight search */}
            <div style={{ display:"flex", flexDirection:"column", gap:4, marginLeft:"auto" }}>
              <label style={{ color:"#555", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>Search</label>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Flight # or airport…" style={{ ...inputSt, width:155 }} />
            </div>
          </div>

          {/* Active filter pills */}
          {hasFilters && (
            <div style={{ marginTop:13, display:"flex", gap:5, flexWrap:"wrap" }}>
              {activeAirline && <span style={{ ...pill, background:`${activeAirline.color}18`, borderColor:`${activeAirline.color}44`, color: activeAirline.color }}>{activeAirline.name}</span>}
              {dateFrom !== DATE_MIN && <span style={pill}>from: {fmtDate(dateFrom)}</span>}
              {dateTo   !== DATE_MAX && <span style={pill}>to: {fmtDate(dateTo)}</span>}
              {fromAirport !== "ALL"  && <span style={pill}>origin: {fromAirport}</span>}
              {toAirport   !== "ALL"  && <span style={pill}>dest: {toAirport}</span>}
              {filterStatus !== "ALL" && <span style={pill}>{filterStatus}</span>}
              {filterReason !== "ALL" && <span style={pill}>{filterReason}</span>}
              {search && <span style={pill}>"{search}"</span>}
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          <StatCard label="Matching Flights" value={filtered.length} sub={`of ${ALL_FLIGHTS.length} total`} accent={activeAirline?.color || "#e8e8e8"} />
          <StatCard label="Avg Delay"    value={analytics ? `${analytics.avgDelay}m` : "—"} sub="filtered set"    accent="#ff8c00" />
          <StatCard label="Major Delays" value={analytics?.major ?? 0}     sub=">60 min"  accent="#ff8c00" />
          <StatCard label="Cancelled"    value={analytics?.cancelled ?? 0} sub="flights"   accent="#ff4444" />
          <StatCard label="Worst Route"  value={analytics?.worstRoute ? analytics.worstRoute[0] : "—"}
            sub={analytics?.worstRoute ? `avg ${Math.round(analytics.worstRoute[1].total/analytics.worstRoute[1].count)}m` : "no data"} accent="#666" />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:"flex", gap:4, marginBottom:14 }}>
          {[["table","Flight Log"],["routes","Top Routes"]].map(([k,l]) => (
            <button key={k} onClick={() => setActiveTab(k)} style={activeTab===k ? sel : unsel}>{l}</button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>

          {/* Main panel */}
          <div style={{ flex:3, minWidth:300 }}>

            {activeTab === "table" && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ color:"#444", fontSize:11, fontFamily:"'Space Mono',monospace" }}>{filtered.length} result{filtered.length!==1?"s":""}</span>
                  <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                    <span style={{ color:"#444", fontSize:9, marginRight:4, letterSpacing:1 }}>SORT:</span>
                    {[["date","NEWEST"],["delay","WORST"],["flight","FLIGHT #"]].map(([k,l]) => (
                      <button key={k} onClick={() => setSortBy(k)} style={sortBy===k ? sel : unsel}>{l}</button>
                    ))}
                  </div>
                </div>

                <div style={{ border:"1px solid rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"12px 120px 105px 65px 65px 60px 120px 1fr", background:"rgba(255,255,255,0.04)", padding:"8px 14px", fontSize:9, letterSpacing:1.2, color:"#555", textTransform:"uppercase", fontFamily:"'Space Mono',monospace", gap:4 }}>
                    <span></span><span>Flight</span><span>Date</span><span>From</span><span>To</span><span>Sched</span><span>Delay</span><span>Reason</span>
                  </div>

                  {paged.length === 0 ? (
                    <div style={{ padding:"40px 0", textAlign:"center" }}>
                      <div style={{ fontSize:26, marginBottom:10 }}>✈</div>
                      <div style={{ color:"#444", fontSize:13 }}>No flights match your filters</div>
                      <button onClick={resetAll} style={{ marginTop:12, ...unsel, color:"#555" }}>Clear filters</button>
                    </div>
                  ) : paged.map((fl, i) => {
                    const badge   = delayBadge(fl.delayMin);
                    const airline = AIRLINE_MAP[fl.airline];
                    return (
                      <div key={fl.id} style={{ display:"grid", gridTemplateColumns:"12px 120px 105px 65px 65px 60px 120px 1fr", padding:"9px 14px", fontSize:12, background:i%2===0?"transparent":"rgba(255,255,255,0.013)", borderTop:"1px solid rgba(255,255,255,0.04)", alignItems:"center", gap:4 }}>
                        <span title={airline?.name} style={{ width:7, height:7, borderRadius:"50%", background:airline?.color||"#555", display:"inline-block" }} />
                        <span style={{ fontFamily:"'Space Mono',monospace", color:airline?.color||"#e8e8e8", fontSize:11 }}>{fl.flightNum}</span>
                        <span style={{ color:"#666", fontSize:11 }}>{fl.date}</span>
                        <span style={{ color:fromAirport===fl.from?"#fff":"#ccc", fontWeight:500 }}>{fl.from}</span>
                        <span style={{ color:toAirport===fl.to?"#fff":"#ccc", fontWeight:500 }}>{fl.to}</span>
                        <span style={{ color:"#555", fontSize:11, fontFamily:"monospace" }}>{fl.scheduledDep}</span>
                        <span>
                          <span style={{ background:`${badge.color}18`, border:`1px solid ${badge.color}44`, color:badge.color, fontFamily:"'Space Mono',monospace", fontSize:10, padding:"2px 7px", borderRadius:2 }}>{badge.label}</span>
                        </span>
                        <span style={{ color:"#666", fontSize:11 }}>{fl.reason}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12 }}>
                  <span style={{ color:"#444", fontSize:11, fontFamily:"'Space Mono',monospace" }}>pg {Math.min(page+1,totalPages||1)}/{totalPages||1}</span>
                  <div style={{ display:"flex", gap:4 }}>
                    {[["«",()=>setPage(0),page===0],["‹",()=>setPage(p=>Math.max(0,p-1)),page===0],["›",()=>setPage(p=>Math.min(totalPages-1,p+1)),page>=totalPages-1],["»",()=>setPage(totalPages-1),page>=totalPages-1]].map(([l,fn,dis],i)=>(
                      <button key={i} onClick={fn} disabled={dis} style={{ ...unsel, opacity:dis?0.25:1 }}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "routes" && (
              <div style={{ border:"1px solid rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 90px 90px", background:"rgba(255,255,255,0.04)", padding:"9px 14px", fontSize:9, letterSpacing:1.2, color:"#555", textTransform:"uppercase", fontFamily:"'Space Mono',monospace" }}>
                  <span>Route</span><span>Flights</span><span>Avg Delay</span><span>Cancelled</span>
                </div>
                {analytics?.topRoutes.length ? analytics.topRoutes.map(([route, data], i) => {
                  const cancelledOnRoute = filtered.filter(f => `${f.from}→${f.to}` === route && f.status === "Cancelled").length;
                  return (
                    <div key={route} style={{ display:"grid", gridTemplateColumns:"1fr 80px 90px 90px", padding:"10px 14px", fontSize:12, background:i%2===0?"transparent":"rgba(255,255,255,0.013)", borderTop:"1px solid rgba(255,255,255,0.04)", alignItems:"center" }}>
                      <span style={{ fontFamily:"'Space Mono',monospace", color:"#ccc", fontSize:12 }}>{route}</span>
                      <span style={{ fontFamily:"'Space Mono',monospace", color:"#e8e8e8" }}>{data.count}</span>
                      <span style={{ fontFamily:"'Space Mono',monospace", color:"#ff8c00" }}>{Math.round(data.total/data.count)}m</span>
                      <span style={{ fontFamily:"'Space Mono',monospace", color:"#ff4444" }}>{cancelledOnRoute}</span>
                    </div>
                  );
                }) : <div style={{ padding:"32px 0", textAlign:"center", color:"#444", fontSize:13 }}>No route data for current filters</div>}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ flex:1, minWidth:200, display:"flex", flexDirection:"column", gap:14 }}>

            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:3, padding:"14px 16px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:1.5, color:"#555", textTransform:"uppercase", marginBottom:12 }}>Delay Reasons</div>
              {analytics?.reasons.map(([r,c]) => <MiniBar key={r} label={r} value={c} max={analytics.reasons[0][1]} color={activeAirline?.color || "#aaa"} />) || <div style={{ color:"#333", fontSize:11, textAlign:"center", padding:12 }}>No data</div>}
            </div>

            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:3, padding:"14px 16px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:1.5, color:"#555", textTransform:"uppercase", marginBottom:12 }}>Status</div>
              {analytics ? [
                { label:"Minor", value:analytics.minor,     color:"#4ade80" },
                { label:"Major", value:analytics.major,     color:"#ff8c00" },
                { label:"Canc.", value:analytics.cancelled, color:"#ff4444" },
              ].map(({label,value,color}) => <MiniBar key={label} label={label} value={value} max={filtered.length} color={color} />) : <div style={{ color:"#333", fontSize:11, textAlign:"center", padding:12 }}>No data</div>}
            </div>

            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:3, padding:"14px 16px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:1.5, color:"#555", textTransform:"uppercase", marginBottom:12 }}>Top Routes</div>
              {analytics?.topRoutes.length ? analytics.topRoutes.slice(0,5).map(([route, data]) => (
                <div key={route} style={{ display:"flex", justifyContent:"space-between", marginBottom:7, alignItems:"center" }}>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"#999" }}>{route}</span>
                  <div>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#ff8c00" }}>{data.count}×</span>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#444", marginLeft:5 }}>~{Math.round(data.total/data.count)}m</span>
                  </div>
                </div>
              )) : <div style={{ color:"#333", fontSize:11, textAlign:"center", padding:12 }}>No data</div>}
            </div>

            <div style={{ background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:3, padding:"12px 14px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:1.5, color:"#444", textTransform:"uppercase", marginBottom:8 }}>Active Scope</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#555", lineHeight:2 }}>
                {activeAirline && <div style={{ color: activeAirline.color, marginBottom:2 }}>{activeAirline.name}</div>}
                <div>{fmtDate(dateFrom)} → {fmtDate(dateTo)}</div>
                {(fromAirport!=="ALL"||toAirport!=="ALL") && <div style={{ color:"#777" }}>{fromAirport!=="ALL"?fromAirport:"ANY"} ✈ {toAirport!=="ALL"?toAirport:"ANY"}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
