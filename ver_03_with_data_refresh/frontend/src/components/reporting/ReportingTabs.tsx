import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine,
  ComposedChart
} from 'recharts'
import {
  Shield, DollarSign, Activity, Zap, Users, Package, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Download, Filter, Lightbulb, Search, X
} from 'lucide-react'

interface Props { api: string }

// ── Hardcoded hex palette (CSS vars don't work inside recharts SVG) ──────────
const C = {
  bg:       '#080b12',
  surface:  '#0d1117',
  surface2: '#161b22',
  surface3: '#1c2333',
  border:   '#21262d',
  border2:  '#30363d',
  text:     '#e6edf3',
  text2:    '#8b949e',
  text3:    '#484f58',
  accent:   '#58a6ff',
  green:    '#3fb950',
  yellow:   '#d29922',
  red:      '#f85149',
  orange:   '#e3b341',
  purple:   '#bc8cff',
}

const TT = { // shared Tooltip style
  contentStyle: { background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 6, fontSize: 12, color: C.text },
  labelStyle:   { color: C.text2 },
  itemStyle:    { color: C.text },
}

const SEV_COLOR: Record<string, string> = { critical: C.red, high: C.orange, medium: C.yellow, low: C.green }
const COST_COLORS = [C.accent, C.purple, C.green, C.yellow, C.red, C.orange, C.text3]

const TABS = [
  { id: 'overview',        label: 'Overview',        icon: Activity },
  { id: 'compliance',      label: 'Compliance',      icon: Shield },
  { id: 'costs',           label: 'Cost Intel',      icon: DollarSign },
  { id: 'incidents',       label: 'Incidents',       icon: Activity },
  { id: 'vulnerabilities', label: 'CVEs',            icon: AlertTriangle },
  { id: 'drifts',          label: 'System Drifts',   icon: Zap },
  { id: 'team',            label: 'Team',            icon: Users },
  { id: 'risks',           label: 'Risks & Gaps',    icon: AlertTriangle },
  { id: 'deliverables',    label: 'Deliverables',    icon: Package },
  { id: 'strategic',       label: 'Strategic AI',    icon: Lightbulb },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: any[], cols: string[]) {
  const header = cols.join(',')
  const body = rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function Panel({ title, children, action }: { title?: string, children: any, action?: any }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      {title && (
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${active ? C.accent : C.border}`, background: active ? 'rgba(88,166,255,0.12)' : 'none', color: active ? C.accent : C.text2, fontSize: 11, cursor: 'pointer', fontWeight: active ? 700 : 400, transition: 'all 0.15s' }}>
      {label}
    </button>
  )
}

function SevBadge({ sev }: { sev: string }) {
  const colors: Record<string,string[]> = {
    critical: ['rgba(248,81,73,0.15)', C.red, 'rgba(248,81,73,0.35)'],
    high:     ['rgba(227,179,65,0.12)', C.orange, 'rgba(227,179,65,0.3)'],
    medium:   ['rgba(210,153,34,0.12)', C.yellow, 'rgba(210,153,34,0.3)'],
    low:      ['rgba(63,185,80,0.12)', C.green, 'rgba(63,185,80,0.3)'],
    pass:     ['rgba(63,185,80,0.12)', C.green, 'rgba(63,185,80,0.3)'],
    fail:     ['rgba(248,81,73,0.15)', C.red, 'rgba(248,81,73,0.35)'],
    partial:  ['rgba(210,153,34,0.12)', C.yellow, 'rgba(210,153,34,0.3)'],
    open:     ['rgba(248,81,73,0.15)', C.red, 'rgba(248,81,73,0.35)'],
    resolved: ['rgba(63,185,80,0.12)', C.green, 'rgba(63,185,80,0.3)'],
    in_progress: ['rgba(88,166,255,0.12)', C.accent, 'rgba(88,166,255,0.3)'],
    planned:  ['rgba(72,79,88,0.3)', C.text2, 'rgba(72,79,88,0.5)'],
    completed:['rgba(63,185,80,0.12)', C.green, 'rgba(63,185,80,0.3)'],
    blocked:  ['rgba(248,81,73,0.15)', C.red, 'rgba(248,81,73,0.35)'],
    healthy:  ['rgba(63,185,80,0.12)', C.green, 'rgba(63,185,80,0.3)'],
    degraded: ['rgba(210,153,34,0.12)', C.yellow, 'rgba(210,153,34,0.3)'],
    'on-leave':['rgba(72,79,88,0.3)', C.text2, 'rgba(72,79,88,0.5)'],
    active:   ['rgba(63,185,80,0.12)', C.green, 'rgba(63,185,80,0.3)'],
    accepted: ['rgba(72,79,88,0.3)', C.text2, 'rgba(72,79,88,0.5)'],
    not_applicable: ['rgba(72,79,88,0.3)', C.text3, 'rgba(72,79,88,0.3)'],
  }
  const [bg, fg, border] = colors[sev] ?? ['rgba(72,79,88,0.3)', C.text2, C.border]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase', background: bg, color: fg, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
      {sev.replace(/_/g, ' ')}
    </span>
  )
}

function TrendArrow({ value, invert = false, unit = '' }: { value: number, invert?: boolean, unit?: string }) {
  const good = invert ? value < 0 : value > 0
  const color = value === 0 ? C.text3 : good ? C.green : C.red
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color, fontFamily: 'monospace', fontWeight: 700 }}>
      <Icon size={10} />{value > 0 ? '+' : ''}{value.toFixed(1)}{unit}
    </span>
  )
}

// month-over-month delta indicator for a series
function MoMDelta({ series, valueKey }: { series: any[], valueKey: string }) {
  if (series.length < 2) return null
  const curr = series[series.length - 1]?.[valueKey] ?? 0
  const prev = series[series.length - 2]?.[valueKey] ?? 0
  const pct = prev ? ((curr - prev) / prev) * 100 : 0
  return <TrendArrow value={pct} invert unit="%" />
}

// builds monthly incident timeline from raw incidents
function buildMonthlyIncidents(incidents: any[]) {
  const map: Record<string, any> = {}
  incidents.forEach(inc => {
    const m = (inc.start_time || '').slice(0, 7)
    if (!m) return
    if (!map[m]) map[m] = { month: m, count: 0, totalIntensity: 0, critical: 0, resolved: 0 }
    map[m].count++
    map[m].totalIntensity += Number(inc.intensity) || 0
    if (inc.severity === 'critical') map[m].critical++
    if (inc.resolved) map[m].resolved++
  })
  return Object.values(map)
    .map(m => ({ ...m, avgIntensity: parseFloat((m.totalIntensity / (m.count || 1)).toFixed(1)) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
}

function buildCostByMonth(costs: any[]) {
  const map: Record<string, any> = {}
  costs.forEach(c => {
    if (!map[c.period]) map[c.period] = { month: c.period.slice(0, 7) }
    map[c.period][c.category] = (map[c.period][c.category] || 0) + Number(c.amount)
    map[c.period].total = (map[c.period].total || 0) + Number(c.amount)
  })
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
}

function buildComplianceRadar(compliance: any[]) {
  const fws = [...new Set(compliance.map(c => c.framework))]
  return fws.map(fw => {
    const items = compliance.filter(c => c.framework === fw)
    const score = items.length ? Math.round(items.reduce((s, i) => s + Number(i.score), 0) / items.length) : 0
    return { framework: fw, score, target: 85 }
  })
}

function buildVulnSev(vulns: any[]) {
  return ['critical', 'high', 'medium', 'low']
    .map(s => ({ name: s, value: vulns.filter(v => v.severity === s).length }))
    .filter(s => s.value > 0)
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ api }: { api: string }) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [costs, setCosts] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any[]>([])
  const [vulns, setVulns] = useState<any[]>([])

  useEffect(() => {
    fetch(`${api}/api/incidents`).then(r => r.json()).then(setIncidents).catch(() => {})
    fetch(`${api}/api/costs`).then(r => r.json()).then(setCosts).catch(() => {})
    fetch(`${api}/api/compliance`).then(r => r.json()).then(setCompliance).catch(() => {})
    fetch(`${api}/api/vulnerabilities`).then(r => r.json()).then(setVulns).catch(() => {})
  }, [api])

  const timeline    = buildMonthlyIncidents(incidents)
  const costByMonth = buildCostByMonth(costs)
  const compRadar   = buildComplianceRadar(compliance)
  const vulnSev     = buildVulnSev(vulns)
  const categories = [...new Set(costs.map(c => c.category))]

  // trend annotations
  const incTrend = timeline.length >= 2
    ? timeline[timeline.length-1].count - timeline[timeline.length-2].count : 0
  const costTrend = costByMonth.length >= 2
    ? ((costByMonth[costByMonth.length-1].total - costByMonth[costByMonth.length-2].total) / (costByMonth[costByMonth.length-2].total||1) * 100) : 0

  return (
    <div>
      {/* Strategic banner */}
      <div style={{ background: 'linear-gradient(135deg,rgba(31,111,235,0.1),rgba(188,140,255,0.05))', border: `1px solid rgba(88,166,255,0.2)`, borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Lightbulb size={18} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: C.text }}>Platform Intelligence Summary</div>
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.7 }}>
            Incidents <span style={{ color: incTrend > 0 ? C.red : C.green, fontWeight: 700 }}>{incTrend > 0 ? '▲ increasing' : incTrend < 0 ? '▼ decreasing' : '● stable'}</span> MoM.{' '}
            Cloud spend <span style={{ color: costTrend > 5 ? C.red : C.green, fontWeight: 700 }}>{costTrend > 0 ? `▲ +${costTrend.toFixed(1)}%` : `▼ ${costTrend.toFixed(1)}%`}</span> vs last month.{' '}
            <span style={{ color: C.red, fontWeight: 700 }}>4 critical CVEs</span> unpatched.{' '}
            GDPR Art.17 erasure broken — <span style={{ color: C.red, fontWeight: 700 }}>$12M regulatory exposure</span>.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Incident trend with improvement/degradation highlights */}
        <Panel title="Incident Frequency & Intensity — 6 months">
          <div style={{ fontSize: 11, color: C.text2, marginBottom: 8, display: 'flex', gap: 16 }}>
            <span>Trend: <TrendArrow value={incTrend} invert unit=" incidents MoM" /></span>
            <span>Last month: <span style={{ color: C.accent, fontWeight: 700 }}>{timeline[timeline.length-1]?.count ?? 0}</span> incidents</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={timeline}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.red}    stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.red}    stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: C.text3 }} domain={[0, 10]} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              <Area yAxisId="l" type="monotone" dataKey="count"        stroke={C.red}    fill="url(#gInc)" strokeWidth={2} name="Incidents" />
              <Bar  yAxisId="l" dataKey="critical" fill={C.red}        name="Critical" opacity={0.6} />
              <Line yAxisId="r" type="monotone" dataKey="avgIntensity" stroke={C.orange} strokeWidth={2} dot={{ r: 3 }} name="Avg Intensity" strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        {/* Cost trend stacked */}
        <Panel title="Monthly Cloud Spend by Category ($)">
          <div style={{ fontSize: 11, color: C.text2, marginBottom: 8, display: 'flex', gap: 16 }}>
            <span>MoM: <TrendArrow value={costTrend} invert unit="%" /></span>
            <span>Latest: <span style={{ color: C.accent, fontWeight: 700 }}>${((costByMonth[costByMonth.length-1]?.total||0)/1000).toFixed(0)}K</span></span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={costByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis tick={{ fontSize: 10, fill: C.text3 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip {...TT} formatter={(v: any) => `$${(Number(v)/1000).toFixed(1)}K`} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              {categories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={COST_COLORS[i % COST_COLORS.length]} name={cat.charAt(0).toUpperCase() + cat.slice(1)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Compliance radar */}
        <Panel title="Compliance Posture by Framework">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={compRadar}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="framework" tick={{ fontSize: 11, fill: C.text2 }} />
              <Radar name="Score"  dataKey="score"  stroke={C.accent} fill={C.accent} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Target" dataKey="target" stroke={C.green}  fill={C.green}  fillOpacity={0.04} strokeDasharray="4 2" strokeWidth={1} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              <Tooltip {...TT} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Vuln severity donut */}
        <Panel title="Open CVEs by Severity">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={vulnSev} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} dataKey="value">
                  {vulnSev.map((e, i) => <Cell key={i} fill={SEV_COLOR[e.name] || C.text3} />)}
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vulnSev.map(v => (
                <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: SEV_COLOR[v.name], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, textTransform: 'capitalize', fontWeight: 600, color: C.text, minWidth: 56 }}>{v.name}</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: SEV_COLOR[v.name], fontWeight: 700 }}>{v.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, fontSize: 11, color: C.text3 }}>Total: {vulns.length} CVEs</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ── COMPLIANCE TAB ────────────────────────────────────────────────────────────
function ComplianceTab({ api }: { api: string }) {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { fetch(`${api}/api/compliance`).then(r => r.json()).then(setData).catch(() => {}) }, [api])

  const frameworks = [...new Set(data.map(d => d.framework))]
  const byFW = (fw: string) => data.filter(d => d.framework === fw)
  const fwScore = (fw: string) => {
    const items = byFW(fw)
    return items.length ? Math.round(items.reduce((s, i) => s + Number(i.score), 0) / items.length) : 0
  }
  const heatmap = frameworks.map(fw => ({
    framework: fw, score: fwScore(fw),
    pass: byFW(fw).filter(i => i.status === 'pass').length,
    fail: byFW(fw).filter(i => i.status === 'fail').length,
    partial: byFW(fw).filter(i => i.status === 'partial').length,
  }))

  return (
    <div>
      {/* Heatmap tiles */}
      <Panel title="Compliance Heatmap — Framework Readiness vs 85% Target">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(frameworks.length, 1)}, 1fr)`, gap: 12, marginBottom: 4 }}>
          {heatmap.map(fw => {
            const color = fw.score >= 85 ? C.green : fw.score >= 65 ? C.yellow : C.red
            const delta = fw.score - 85
            return (
              <div key={fw.framework} style={{ textAlign: 'center', background: fw.score >= 85 ? 'rgba(63,185,80,0.07)' : fw.score >= 65 ? 'rgba(210,153,34,0.07)' : 'rgba(248,81,73,0.07)', border: `1px solid ${color}40`, borderRadius: 8, padding: '16px 10px' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'monospace', lineHeight: 1 }}>{fw.score}%</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '6px 0 4px' }}>{fw.framework}</div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color, marginBottom: 8 }}>
                  {delta >= 0 ? `▲ +${delta}pp above target` : `▼ ${delta}pp below target`}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 10, fontFamily: 'monospace' }}>
                  <span style={{ color: C.green }}>{fw.pass} pass</span>
                  <span style={{ color: C.yellow }}>{fw.partial} partial</span>
                  <span style={{ color: C.red }}>{fw.fail} fail</span>
                </div>
                <div style={{ marginTop: 10, height: 5, background: C.surface3, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(fw.score, 100)}%`, background: color, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Bar chart comparison */}
      <Panel title="Framework Score vs 85% Target">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={heatmap} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: C.text3 }} />
            <YAxis type="category" dataKey="framework" tick={{ fontSize: 11, fill: C.text2 }} width={72} />
            <Tooltip {...TT} formatter={(v: any) => `${Number(v).toFixed(0)}%`} />
            <ReferenceLine x={85} stroke={C.green} strokeDasharray="4 2" label={{ value: '85% target', fill: C.green, fontSize: 9 }} />
            <Bar dataKey="score" name="Score %" radius={[0, 4, 4, 0]}>
              {heatmap.map((fw, i) => <Cell key={i} fill={fw.score >= 85 ? C.green : fw.score >= 65 ? C.yellow : C.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Per-framework controls */}
      {frameworks.map(fw => (
        <Panel key={fw} title={`${fw} — Controls`} action={
          <button onClick={() => downloadCSV(`${fw}_compliance.csv`, byFW(fw), ['framework','control_id','control_name','status','score','priority','remediation'])}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
            <Download size={11} /> CSV
          </button>
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['ID','Control','Status','Score','Priority','Remediation'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', fontSize: 10, color: C.text3, fontWeight: 700, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byFW(fw).map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '8px', fontSize: 11, fontFamily: 'monospace', color: C.text2 }}>{c.control_id}</td>
                  <td style={{ padding: '8px', fontSize: 12, fontWeight: 600, color: C.text }}>{c.control_name}</td>
                  <td style={{ padding: '8px' }}><SevBadge sev={c.status} /></td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 52, height: 4, background: C.surface3, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${c.score}%`, background: Number(c.score) >= 80 ? C.green : Number(c.score) >= 60 ? C.yellow : C.red }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: C.text2 }}>{Number(c.score).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}><SevBadge sev={c.priority || 'low'} /></td>
                  <td style={{ padding: '8px', fontSize: 11, color: C.text2, maxWidth: 260 }}>
                    {c.remediation || <span style={{ color: C.text3 }}>No action needed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ))}
    </div>
  )
}

// ── COSTS TAB ─────────────────────────────────────────────────────────────────
function CostsTab({ api }: { api: string }) {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { fetch(`${api}/api/costs`).then(r => r.json()).then(setCosts).catch(() => {}) }, [api])
  const setCosts = setData

  const months = [...new Set(data.map(d => d.period))].sort()
  const categories = [...new Set(data.map(d => d.category))]
  const byMonth = buildCostByMonth(data)

  const latestPeriod = months[months.length - 1] ?? ''
  const prevPeriod   = months[months.length - 2] ?? ''
  const latestTotal  = data.filter(d => d.period === latestPeriod).reduce((s, d) => s + Number(d.amount), 0)
  const prevTotal    = data.filter(d => d.period === prevPeriod).reduce((s, d) => s + Number(d.amount), 0)
  const momPct       = prevTotal ? ((latestTotal - prevTotal) / prevTotal) * 100 : 0

  const catBreakdown = categories.map((c, i) => ({
    name: c, color: COST_COLORS[i % COST_COLORS.length],
    value: data.filter(d => d.period === latestPeriod && d.category === c).reduce((s, d) => s + Number(d.amount), 0),
  })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Latest Month Total',  value: `$${(latestTotal/1000).toFixed(1)}K`, trend: <TrendArrow value={momPct} invert unit="% MoM" />, color: C.accent },
          { label: 'Biggest Category',    value: catBreakdown[0]?.name || '—', trend: <span style={{ color: C.text3, fontSize: 11 }}>${((catBreakdown[0]?.value||0)/1000).toFixed(1)}K this month</span>, color: C.yellow },
          { label: '6-month Total',       value: `$${(data.reduce((s,d)=>s+Number(d.amount),0)/1000).toFixed(0)}K`, trend: <TrendArrow value={22} invert unit="% YoY est." />, color: C.red },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, fontFamily: 'monospace', marginBottom: 4 }}>{kpi.value}</div>
            {kpi.trend}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Monthly Spend Trend">
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={byMonth}>
              <defs>
                <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis tick={{ fontSize: 10, fill: C.text3 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip {...TT} formatter={(v: any) => `$${(Number(v)/1000).toFixed(1)}K`} />
              <Area type="monotone" dataKey="total" stroke={C.accent} fill="url(#gCost)" strokeWidth={2.5} name="Total Spend" />
              <Line type="monotone" dataKey="compute" stroke={C.purple} strokeWidth={1.5} dot={false} name="Compute" strokeDasharray="3 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Category Breakdown — ${latestPeriod.slice(0,7)}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={catBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={75} paddingAngle={2} dataKey="value">
                  {catBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip {...TT} formatter={(v: any) => `$${(Number(v)/1000).toFixed(1)}K`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {catBreakdown.map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, textTransform: 'capitalize', flex: 1, color: C.text }}>{c.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: c.color, fontWeight: 700 }}>${(c.value/1000).toFixed(1)}K</span>
                  <span style={{ fontSize: 10, color: C.text3 }}>{latestTotal ? ((c.value/latestTotal)*100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Category Trend Lines" action={
        <button onClick={() => downloadCSV('costs.csv', data, ['period','category','subcategory','amount','provider'])}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
          <Download size={11} /> CSV
        </button>
      }>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.text3 }} />
            <YAxis tick={{ fontSize: 10, fill: C.text3 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}K`} />
            <Tooltip {...TT} formatter={(v: any) => `$${(Number(v)/1000).toFixed(1)}K`} />
            <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
            {categories.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={COST_COLORS[i % COST_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} name={c.charAt(0).toUpperCase()+c.slice(1)} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}

// ── INCIDENTS TAB ─────────────────────────────────────────────────────────────
function IncidentsTab({ api }: { api: string }) {
  const [data, setData]         = useState<any[]>([])
  const [query, setQuery]       = useState('')
  const [filterSev, setFilterSev]   = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { fetch(`${api}/api/incidents`).then(r => r.json()).then(setData).catch(() => {}) }, [api])

  const timeline   = buildMonthlyIncidents(data)
  const categories = [...new Set(data.map(d => d.category))]

  const filtered = data.filter(inc => {
    const q = query.toLowerCase()
    return (
      (!q || [inc.title, inc.asset_name, inc.impact, inc.root_cause, inc.category].some(f => (f||'').toLowerCase().includes(q))) &&
      (!filterSev || inc.severity === filterSev) &&
      (!filterCat || inc.category === filterCat) &&
      (!filterStatus || (filterStatus === 'resolved' ? inc.resolved : !inc.resolved))
    )
  })

  // month-on-month change indicators
  const lastTwo = timeline.slice(-2)
  const incChange = lastTwo.length === 2 ? lastTwo[1].count - lastTwo[0].count : 0

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Incident Frequency — with Improvement/Degradation">
          <div style={{ fontSize: 11, color: C.text2, marginBottom: 6 }}>
            MoM: <TrendArrow value={incChange} invert unit=" incidents" />
            <span style={{ marginLeft: 12, color: C.text3 }}>Red bars = critical incidents</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis yAxisId="r" orientation="right" domain={[0,10]} tick={{ fontSize: 10, fill: C.text3 }} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              <Bar  yAxisId="l" dataKey="count"        fill={C.accent} name="Total"     radius={[3,3,0,0]} opacity={0.7} />
              <Bar  yAxisId="l" dataKey="critical"     fill={C.red}    name="Critical"  radius={[3,3,0,0]} />
              <Line yAxisId="r" type="monotone" dataKey="avgIntensity" stroke={C.orange} strokeWidth={2} dot={{ r: 3 }} name="Avg Intensity" />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Resolution Rate by Month">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis tick={{ fontSize: 10, fill: C.text3 }} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              <Bar dataKey="resolved" name="Resolved" fill={C.green}  radius={[3,3,0,0]} />
              <Bar dataKey="count"    name="Total"    fill={C.border2} radius={[3,3,0,0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Incident Log" action={
        <button onClick={() => downloadCSV('incidents.csv', filtered, ['id','asset_name','title','severity','category','intensity','mttr_minutes','resolved','impact','root_cause'])}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
          <Download size={11} /> CSV
        </button>
      }>
        {/* ── Search + filter bar ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={12} color={C.text3} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, asset, impact, root cause..."
              style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 6, padding: '6px 10px 6px 28px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.text3, cursor: 'pointer', display: 'flex' }}><X size={12} /></button>}
          </div>
          {['','critical','high','medium','low'].map(s => <Chip key={s||'as'} label={s||'All Sev'} active={filterSev===s} onClick={()=>setFilterSev(s)} />)}
          <span style={{ color: C.border2 }}>|</span>
          {['','resolved','active'].map(s => <Chip key={s||'ast'} label={s||'All Status'} active={filterStatus===s} onClick={()=>setFilterStatus(s)} />)}
          <span style={{ color: C.border2 }}>|</span>
          {['', ...categories].map(c => <Chip key={c||'acat'} label={c||'All Cat'} active={filterCat===c} onClick={()=>setFilterCat(c)} />)}
          <span style={{ fontSize: 11, color: C.text3 }}>{filtered.length}/{data.length}</span>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: C.text3, fontSize: 13 }}>No incidents match your filters</div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Asset','Title','Sev','Category','Intensity','MTTR','Status','Impact'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', fontSize: 10, color: C.text3, fontWeight: 700, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr key={inc.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '8px', fontSize: 11, fontFamily: 'monospace', color: C.text2, whiteSpace: 'nowrap' }}>{inc.asset_name}</td>
                  <td style={{ padding: '8px', fontSize: 12, fontWeight: 600, color: C.text, maxWidth: 200 }}>{inc.title}</td>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}><SevBadge sev={inc.severity} /></td>
                  <td style={{ padding: '8px', fontSize: 11, color: C.text2 }}>{inc.category}</td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 40, height: 4, background: C.surface3, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(Number(inc.intensity)/10)*100}%`, background: Number(inc.intensity) >= 8 ? C.red : Number(inc.intensity) >= 5 ? C.yellow : C.green }} />
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.text2 }}>{inc.intensity}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px', fontSize: 11, fontFamily: 'monospace', color: C.text2, whiteSpace: 'nowrap' }}>{inc.mttr_minutes ? `${inc.mttr_minutes}m` : '—'}</td>
                  <td style={{ padding: '8px' }}><SevBadge sev={inc.resolved ? 'resolved' : 'open'} /></td>
                  <td style={{ padding: '8px', fontSize: 11, color: C.text2, maxWidth: 240 }}>{inc.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

// ── CVEs TAB ──────────────────────────────────────────────────────────────────
function VulnerabilitiesTab({ api }: { api: string }) {
  const [data, setData] = useState<any[]>([])
  const [sortBy, setSortBy]       = useState('cvss')
  const [filterSev, setFilterSev] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [query, setQuery]         = useState('')

  const load = useCallback(() => {
    const p = new URLSearchParams({ sort: sortBy, ...(filterSev && { severity: filterSev }), ...(filterStatus && { status: filterStatus }) })
    fetch(`${api}/api/vulnerabilities?${p}`).then(r => r.json()).then(setData).catch(() => {})
  }, [api, sortBy, filterSev, filterStatus])

  useEffect(() => { load() }, [load])

  const filtered = query
    ? data.filter(v => [v.cve_id, v.title, v.asset_name, v.description, v.affected_component].some(f => (f||'').toLowerCase().includes(query.toLowerCase())))
    : data

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={12} color={C.text3} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search CVE ID, title, asset, component..."
            style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 6, padding: '6px 10px 6px 28px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        {['','critical','high','medium','low'].map(s => <Chip key={s||'av'} label={s||'All Sev'} active={filterSev===s} onClick={()=>setFilterSev(s)} />)}
        <span style={{ color: C.border2 }}>|</span>
        {['','open','in_progress','resolved','accepted'].map(s => <Chip key={s||'avs'} label={s||'All Status'} active={filterStatus===s} onClick={()=>setFilterStatus(s)} />)}
        <span style={{ color: C.border2 }}>|</span>
        {[['cvss','CVSS'],['severity','Severity'],['date','Date']].map(([k,l]) => <Chip key={k} label={l} active={sortBy===k} onClick={()=>setSortBy(k)} />)}
        <button onClick={() => downloadCSV('vulnerabilities.csv', filtered, ['cve_id','asset_name','severity','cvss_score','title','status','affected_component','resolution'])}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer', marginLeft: 'auto' }}>
          <Download size={11} /> CSV
        </button>
      </div>
      <div style={{ fontSize: 11, color: C.text3, marginBottom: 10 }}>{filtered.length} CVEs shown</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(v => (
          <div key={v.id} style={{ background: C.surface, border: `1px solid ${v.severity==='critical'?'rgba(248,81,73,0.3)':v.severity==='high'?'rgba(227,179,65,0.2)':C.border}`, borderRadius: 8, padding: '14px 16px', boxShadow: v.severity==='critical'?'0 0 16px rgba(248,81,73,0.1)':'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = C.surface)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: SEV_COLOR[v.severity] }}>{v.cve_id}</span>
                <SevBadge sev={v.severity} /><SevBadge sev={v.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: C.text3 }}>Asset: <span style={{ color: C.text2, fontFamily: 'monospace' }}>{v.asset_name}</span></span>
                <div style={{ background: v.cvss_score>=9?'rgba(248,81,73,0.15)':v.cvss_score>=7?'rgba(227,179,65,0.12)':'rgba(63,185,80,0.1)', border: `1px solid ${SEV_COLOR[v.severity]}50`, borderRadius: 6, padding: '2px 8px', fontSize: 14, fontWeight: 800, color: SEV_COLOR[v.severity], fontFamily: 'monospace' }}>
                  {v.cvss_score}
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>{v.title}</div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 8, lineHeight: 1.55 }}>{v.description}</div>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>Component: <span style={{ fontFamily: 'monospace', color: C.yellow }}>{v.affected_component}</span></div>
            <div style={{ padding: '8px 12px', background: 'rgba(63,185,80,0.05)', border: `1px solid rgba(63,185,80,0.15)`, borderRadius: 6, fontSize: 11, color: C.text2 }}>
              <span style={{ color: C.green, fontWeight: 700 }}>Resolution: </span>{v.resolution}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DRIFTS TAB ────────────────────────────────────────────────────────────────
function DriftsTab({ api }: { api: string }) {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { fetch(`${api}/api/drifts`).then(r => r.json()).then(setData).catch(() => {}) }, [api])

  const types = [...new Set(data.map(d => d.drift_type))]
  const byType = types.map(t => ({
    type: t,
    count:    data.filter(d => d.drift_type === t).length,
    critical: data.filter(d => d.drift_type === t && d.severity === 'critical').length,
    changes:  data.filter(d => d.drift_type === t).reduce((s, d) => s + Number(d.change_count), 0),
  }))

  const sevCounts = ['critical','high','medium','low'].map(s => ({ sev: s, count: data.filter(d => d.severity === s).length })).filter(s => s.count > 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Drifts by Type — Count vs Critical">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: C.text2 }} width={70} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              <Bar dataKey="count"    name="Total"    fill={C.accent} radius={[0,3,3,0]} />
              <Bar dataKey="critical" name="Critical" fill={C.red}    radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cumulative Change Count by Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byType}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="type" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis tick={{ fontSize: 10, fill: C.text3 }} />
              <Tooltip {...TT} />
              <Bar dataKey="changes" name="Change Count" radius={[4,4,0,0]}>
                {byType.map((e, i) => <Cell key={i} fill={e.critical > 0 ? C.red : C.yellow} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Severity breakdown */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {sevCounts.map(s => (
          <div key={s.sev} style={{ padding: '8px 16px', borderRadius: 8, background: C.surface, border: `1px solid ${SEV_COLOR[s.sev]}40`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[s.sev] }} />
            <span style={{ fontSize: 12, color: C.text, textTransform: 'capitalize' }}>{s.sev}</span>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: SEV_COLOR[s.sev] }}>{s.count}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => downloadCSV('drifts.csv', data, ['asset_name','drift_type','component','expected_value','actual_value','severity','change_count','acknowledged'])}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
            <Download size={11} /> CSV
          </button>
        </div>
      </div>

      <Panel title="Drift Detail — Expected vs Actual">
        {data.map(d => (
          <div key={d.id} style={{ borderBottom: `1px solid ${C.border}`, padding: '12px 4px', display: 'flex', gap: 10, alignItems: 'flex-start' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[d.severity] || C.text3, marginTop: 6, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.text2, fontWeight: 600 }}>{d.asset_name}</span>
                <SevBadge sev={d.severity} />
                <span style={{ fontSize: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 6px', color: C.text3, fontFamily: 'monospace' }}>{d.drift_type}</span>
                {Number(d.change_count) > 1 && <span style={{ fontSize: 10, color: C.orange, fontFamily: 'monospace', fontWeight: 700 }}>×{d.change_count} changes</span>}
                {d.acknowledged && <span style={{ fontSize: 10, color: C.green }}>✓ ACK</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>{d.component}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                <span style={{ color: C.text3 }}>Expected:</span>
                <code style={{ fontFamily: 'monospace', color: C.green, fontSize: 11, background: 'rgba(63,185,80,0.08)', padding: '1px 6px', borderRadius: 4 }}>{d.expected_value}</code>
                <span style={{ color: C.text3 }}>→ Actual:</span>
                <code style={{ fontFamily: 'monospace', color: C.red, fontSize: 11, background: 'rgba(248,81,73,0.08)', padding: '1px 6px', borderRadius: 4 }}>{d.actual_value}</code>
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}

// ── TEAM TAB ──────────────────────────────────────────────────────────────────
function TeamTab({ api }: { api: string }) {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { fetch(`${api}/api/team`).then(r => r.json()).then(setData).catch(() => {}) }, [api])

  const teams = [...new Set(data.map(d => d.team))]
  const teamStats = teams.map(t => {
    const members = data.filter(d => d.team === t)
    return {
      team: t,
      members: members.length,
      incidents: members.reduce((s, d) => s + Number(d.incidents_handled), 0),
      avgMTTR: members.reduce((s, d) => s + Number(d.avg_mttr_minutes), 0) / (members.length || 1),
      avgSat: members.reduce((s, d) => s + Number(d.satisfaction_score), 0) / (members.length || 1),
      onCall: members.reduce((s, d) => s + Number(d.on_call_hours), 0),
    }
  })

  // improvement/degradation highlights
  const burnoutRisk = data.filter(d => Number(d.satisfaction_score) < 7.5)
  const highPerf    = data.filter(d => Number(d.avg_mttr_minutes) < 40 && Number(d.incidents_handled) > 15)

  return (
    <div>
      {/* Callout banners */}
      {burnoutRisk.length > 0 && (
        <div style={{ background: 'rgba(248,81,73,0.07)', border: `1px solid rgba(248,81,73,0.25)`, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 12, color: C.text2 }}>
          <span style={{ color: C.red, fontWeight: 700 }}>⚠ Burnout Risk:</span>{' '}
          {burnoutRisk.map(m => m.name).join(', ')} — satisfaction score below 7.5. Review workload distribution.
        </div>
      )}
      {highPerf.length > 0 && (
        <div style={{ background: 'rgba(63,185,80,0.07)', border: `1px solid rgba(63,185,80,0.25)`, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 12, color: C.text2 }}>
          <span style={{ color: C.green, fontWeight: 700 }}>★ High Performers:</span>{' '}
          {highPerf.map(m => m.name).join(', ')} — exceptional MTTR with high incident volume.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Incidents Handled per Team">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={teamStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="team" tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis tick={{ fontSize: 10, fill: C.text3 }} />
              <Tooltip {...TT} />
              <Bar dataKey="incidents" name="Incidents Handled" radius={[4,4,0,0]}>
                {teamStats.map((_, i) => <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Avg MTTR vs Satisfaction Score">
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>Lower MTTR + higher satisfaction = top right quadrant</div>
          <ResponsiveContainer width="100%" height={190}>
            <ScatterChart margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis type="number" dataKey="avgMTTR" name="Avg MTTR (min)" tick={{ fontSize: 10, fill: C.text3 }} label={{ value: 'MTTR (min)', fill: C.text3, fontSize: 9, position: 'insideBottom', offset: -10 }} />
              <YAxis type="number" dataKey="avgSat"  name="Satisfaction"   tick={{ fontSize: 10, fill: C.text3 }} domain={[5, 10]} label={{ value: 'Satisfaction', fill: C.text3, fontSize: 9, angle: -90, position: 'insideLeft' }} />
              <Tooltip {...TT} content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return <div style={{ background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
                  <div style={{ fontWeight: 700, color: C.text, marginBottom: 2 }}>{d.team}</div>
                  <div style={{ color: C.text2 }}>MTTR: <span style={{ color: C.yellow, fontWeight: 700 }}>{d.avgMTTR.toFixed(0)}min</span></div>
                  <div style={{ color: C.text2 }}>Satisfaction: <span style={{ color: C.green, fontWeight: 700 }}>{d.avgSat.toFixed(1)}</span></div>
                </div>
              }} />
              {teamStats.length > 0 && (
                <Scatter data={teamStats} name="Teams">
                  {teamStats.map((_, i) => <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />)}
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Team Members" action={
        <button onClick={() => downloadCSV('team.csv', data, ['name','role','team','incidents_handled','avg_mttr_minutes','on_call_hours','satisfaction_score','availability'])}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
          <Download size={11} /> CSV
        </button>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {data.map(m => {
            const satColor = Number(m.satisfaction_score) >= 8 ? C.green : Number(m.satisfaction_score) >= 7 ? C.yellow : C.red
            const mttrColor = Number(m.avg_mttr_minutes) < 50 ? C.green : Number(m.avg_mttr_minutes) < 90 ? C.yellow : C.red
            return (
              <div key={m.id} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: C.text2 }}>{m.role} · {m.team}</div>
                  </div>
                  <SevBadge sev={m.availability} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[
                    { label: 'Incidents', value: m.incidents_handled, color: C.accent },
                    { label: 'Avg MTTR',  value: `${Math.round(m.avg_mttr_minutes)}m`, color: mttrColor },
                    { label: 'On-Call h', value: m.on_call_hours, color: C.text2 },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: C.text3, minWidth: 70 }}>Satisfaction</span>
                  <div style={{ flex: 1, height: 4, background: C.surface3, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(Number(m.satisfaction_score)/10)*100}%`, background: satColor, transition: 'width 0.6s' }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: satColor, fontWeight: 700 }}>{m.satisfaction_score}</span>
                </div>
                {Array.isArray(m.certifications) && m.certifications.filter(Boolean).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {m.certifications.filter(Boolean).map((c: string) => (
                      <span key={c} style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(88,166,255,0.1)', border: `1px solid rgba(88,166,255,0.2)`, borderRadius: 4, color: C.accent, fontFamily: 'monospace' }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

// ── RISKS TAB ─────────────────────────────────────────────────────────────────
function RisksTab({ api }: { api: string }) {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { fetch(`${api}/api/risks`).then(r => r.json()).then(setData).catch(() => {}) }, [api])

  const matrixData = data.map(r => ({
    x:        r.probability === 'high' ? 3 : r.probability === 'medium' ? 2 : 1,
    y:        Number(r.risk_score) || 0,
    name:     (r.title || '').slice(0, 35) + '…',
    category: r.category || '',
    score:    Number(r.risk_score) || 0,
    status:   r.status || '',
  }))

  const catData = [...new Set(data.map(d => d.category))].map(cat => ({
    category: cat,
    count: data.filter(d => d.category === cat).length,
    avgScore: Math.round(data.filter(d => d.category === cat).reduce((s, d) => s + Number(d.risk_score), 0) / (data.filter(d => d.category === cat).length || 1)),
  }))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Risk Matrix — Probability vs Risk Score">
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 6 }}>Red zone above 70 + high probability = immediate action</div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis type="number" dataKey="x" domain={[0.5, 3.5]} ticks={[1,2,3]} tickFormatter={(v: number) => (['','Low','Med','High'][v] || '')} tick={{ fontSize: 10, fill: C.text3 }} name="Probability" />
              <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10, fill: C.text3 }} name="Risk Score" />
              <ReferenceLine y={70} stroke={C.red}    strokeDasharray="4 2" label={{ value: 'High risk ▲', fill: C.red,    fontSize: 9 }} />
              <ReferenceLine x={2}  stroke={C.border2} strokeDasharray="4 2" />
              <Tooltip {...TT} content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return <div style={{ background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
                  <div style={{ fontWeight: 700, color: C.text, marginBottom: 2 }}>{d.name}</div>
                  <div style={{ color: C.text2 }}>Score: <span style={{ color: d.score >= 80 ? C.red : C.yellow, fontWeight: 700 }}>{d.score}</span></div>
                  <div style={{ color: C.text2 }}>Category: {d.category}</div>
                </div>
              }} />
              {matrixData.length > 0 && (
                <Scatter data={matrixData} name="Risks">
                  {matrixData.map((e, i) => <Cell key={i} fill={e.score >= 80 ? C.red : e.score >= 60 ? C.yellow : C.accent} fillOpacity={0.85} r={8} />)}
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Risk Score by Category">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10, fill: C.text3 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: C.text2 }} width={80} />
              <Tooltip {...TT} />
              <ReferenceLine x={70} stroke={C.red} strokeDasharray="4 2" />
              <Bar dataKey="avgScore" name="Avg Score" radius={[0,4,4,0]}>
                {catData.map((e, i) => <Cell key={i} fill={e.avgScore >= 80 ? C.red : e.avgScore >= 60 ? C.yellow : C.green} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Risk Register" action={
        <button onClick={() => downloadCSV('risks.csv', data, ['title','category','probability','risk_score','status','owner','mitigation','due_date'])}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
          <Download size={11} /> CSV
        </button>
      }>
        {data.map(r => (
          <div key={r.id} style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 4px' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: Number(r.risk_score)>=80?'rgba(248,81,73,0.1)':Number(r.risk_score)>=60?'rgba(227,179,65,0.1)':'rgba(88,166,255,0.1)', border: `1px solid ${Number(r.risk_score)>=80?'rgba(248,81,73,0.3)':C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: Number(r.risk_score)>=80?C.red:Number(r.risk_score)>=60?C.yellow:C.accent, fontFamily: 'monospace', flexShrink: 0 }}>
                {r.risk_score}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.title}</span>
                  <SevBadge sev={r.status} />
                  <span style={{ fontSize: 10, color: C.text3 }}>{r.category} · {r.probability} prob</span>
                </div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 6 }}>{r.impact}</div>
                <div style={{ padding: '6px 10px', background: 'rgba(63,185,80,0.05)', border: `1px solid rgba(63,185,80,0.12)`, borderRadius: 6, fontSize: 11, color: C.text2, marginBottom: 4 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>Mitigation: </span>{r.mitigation}
                </div>
                <div style={{ fontSize: 11, color: C.text3 }}>Owner: <span style={{ color: C.text2 }}>{r.owner}</span>  ·  Due: <span style={{ color: C.text2 }}>{r.due_date}</span></div>
                {Array.isArray(r.blockers) && r.blockers.filter(Boolean).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {r.blockers.filter(Boolean).map((b: string, i: number) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(248,81,73,0.08)', border: `1px solid rgba(248,81,73,0.2)`, borderRadius: 4, color: C.red }}>🚫 {b}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}

// ── DELIVERABLES TAB ──────────────────────────────────────────────────────────
function DeliverablesTab({ api }: { api: string }) {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { fetch(`${api}/api/deliverables`).then(r => r.json()).then(setData).catch(() => {}) }, [api])

  const statusGroups = [...new Set(data.map(d => d.status))]
  const summaryData  = statusGroups.map(s => ({ status: s, count: data.filter(d => d.status === s).length })).filter(s => s.count > 0)
  const avgCompletion = data.length ? Math.round(data.reduce((s: number, d: any) => s + (Number(d.completion_pct) || 0), 0) / data.length) : 0
  const onTrack  = data.filter(d => d.status === 'in_progress' && Number(d.completion_pct) >= 50).length
  const atRisk   = data.filter(d => d.status === 'in_progress' && Number(d.completion_pct) < 50).length

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Avg Completion', value: `${avgCompletion}%`,        color: avgCompletion >= 60 ? C.green : C.yellow },
          { label: 'In Progress',    value: data.filter(d=>d.status==='in_progress').length, color: C.accent },
          { label: 'On Track',       value: onTrack,                    color: C.green },
          { label: 'At Risk',        value: atRisk,                     color: atRisk > 2 ? C.red : C.yellow },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, fontFamily: 'monospace' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <Panel title="Progress Tracker — All In-Progress Deliverables">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.filter(d => d.status === 'in_progress').map(d => {
              const pct = Number(d.completion_pct) || 0
              const color = pct === 100 ? C.green : pct >= 60 ? C.accent : pct >= 30 ? C.yellow : C.red
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SevBadge sev={d.priority} />
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                  <div style={{ width: 120, height: 6, background: C.surface3, borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.6s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color, fontWeight: 700, width: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="Status Distribution">
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: C.accent }}>{avgCompletion}%</div>
            <div style={{ fontSize: 11, color: C.text3 }}>avg completion</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summaryData.map(s => {
              const color = s.status==='completed'?C.green:s.status==='in_progress'?C.accent:s.status==='blocked'?C.red:C.text3
              return (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SevBadge sev={s.status} />
                  <div style={{ flex: 1, height: 4, background: C.surface3, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(s.count/data.length)*100}%`, background: color }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: C.text2 }}>{s.count}</span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <Panel title="All Deliverables" action={
        <button onClick={() => downloadCSV('deliverables.csv', data, ['title','type','status','priority','assigned_team','target_date','completion_pct'])}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
          <Download size={11} /> CSV
        </button>
      }>
        {data.map(d => {
          const pct = Number(d.completion_pct) || 0
          const pctColor = pct === 100 ? C.green : pct >= 60 ? C.accent : pct >= 30 ? C.yellow : C.red
          return (
            <div key={d.id} style={{ borderBottom: `1px solid ${C.border}`, padding: '12px 4px' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                  <SevBadge sev={d.status} /><SevBadge sev={d.priority} />
                  <span style={{ fontSize: 10, color: C.text3, fontFamily: 'monospace' }}>{d.type}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{d.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: C.text2, flexShrink: 0 }}>
                  <span>{d.assigned_team}</span>
                  <span style={{ color: C.text3 }}>{d.target_date}</span>
                  <div style={{ width: 64, height: 4, background: C.surface3, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pctColor }} />
                  </div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: pctColor }}>{pct}%</span>
                </div>
              </div>
              {d.notes && <div style={{ fontSize: 11, color: C.text2, marginTop: 4, paddingLeft: 4 }}>{d.notes}</div>}
            </div>
          )
        })}
      </Panel>
    </div>
  )
}

// ── STRATEGIC AI TAB ──────────────────────────────────────────────────────────
function StrategicTab({ api }: { api: string }) {
  const [summary,    setSummary]    = useState<any>(null)
  const [vulns,      setVulns]      = useState<any[]>([])
  const [costs,      setCosts]      = useState<any[]>([])
  const [incidents,  setIncidents]  = useState<any[]>([])
  const [delivs,     setDelivs]     = useState<any[]>([])

  useEffect(() => {
    fetch(`${api}/api/summary`).then(r=>r.json()).then(setSummary).catch(()=>{})
    fetch(`${api}/api/vulnerabilities`).then(r=>r.json()).then(setVulns).catch(()=>{})
    fetch(`${api}/api/costs`).then(r=>r.json()).then(setCosts).catch(()=>{})
    fetch(`${api}/api/incidents`).then(r=>r.json()).then(setIncidents).catch(()=>{})
    fetch(`${api}/api/deliverables`).then(r=>r.json()).then(setDelivs).catch(()=>{})
  }, [api])

  if (!summary) return <div style={{ color: C.text3, padding: 40, textAlign: 'center' }}>Loading strategic analysis…</div>

  const latestPeriod  = [...new Set(costs.map(c=>c.period))].sort().slice(-1)[0] ?? ''
  const latestCost    = costs.filter(c=>c.period===latestPeriod).reduce((s,c)=>s+Number(c.amount),0)
  const critCVEs      = vulns.filter(v=>v.severity==='critical'&&v.status!=='resolved').length
  const avgMTTR       = incidents.filter(i=>i.mttr_minutes).reduce((s,i)=>s+Number(i.mttr_minutes),0) / (incidents.filter(i=>i.mttr_minutes).length||1)
  const blockedDelivs = delivs.filter(d=>d.status==='blocked').length
  const completedPct  = delivs.length ? Math.round(delivs.filter(d=>d.status==='completed').length/delivs.length*100) : 0

  const insights = [
    { icon:'🔴', pri:'P0', title:'Critical Security Exposure', body:`${critCVEs} unpatched critical CVEs including regreSSHion (OpenSSH RCE) and active DDoS on WAF. Exploitation window open.`, impact:'Full infrastructure compromise possible. Estimated breach cost: $4-8M.', action:'Emergency patch window this week. Restrict SSH to VPN. Engage AWS Shield Advanced. Rotate secrets.' },
    { icon:'⚖️', pri:'P0', title:'GDPR & SOC2 Regulatory Risk', body:'GDPR Art.17 erasure broken across 4 systems. SOC2 MFA at 68%. Two critical compliance failures simultaneously.', impact:'$12M GDPR fine + SOC2 certification revocation = customer trust collapse.', action:'Dedicated engineering sprint for erasure. MFA to 100% by May 31. CISO escalation now.' },
    { icon:'💸', pri:'P1', title:'Cloud Cost Runaway', body:`Spend at $${(latestCost/1000).toFixed(0)}K/month, +22% YoY. Compute over-provisioned. No autoscaling policy on 6 resources.`, impact:'$840K annual overspend vs benchmark. FinOps savings opportunity of ~20%.', action:'Savings Plans + Spot instances + k8s resource quotas. Reserved RDS. Target $${Math.round(latestCost*0.8/1000)}K/month.' },
    { icon:'⏱️', pri:'P1', title:'MTTR Improvement Opportunity', body:`Avg MTTR ${Math.round(avgMTTR)} min. Security team resolves in 31 min — 3x faster. Runbook gaps are the primary driver.`, impact:'Reducing MTTR by 40% saves ~40h downtime/month. Revenue impact: ~$200K/month.', action:'Runbook standardization. Chaos engineering drills. Postmortem automation. On-call shadowing.' },
    { icon:'🏗️', pri:'P1', title:'Single Points of Failure', body:'Payment service has no hot standby. Auth SSO outage caused 4h P0. 3 critical paths lack multi-region DR.', impact:'$50K/min revenue loss during payment P0. 3 occurrences/year = $9M exposure.', action:'Multi-region active-active for payment (Q3). Cross-AZ autoscaling. Quarterly DR simulation.' },
    { icon:'📦', pri:'P2', title:`${blockedDelivs} Blocked Deliverables`, body:`${completedPct}% of deliverables complete. ${blockedDelivs} blocked on budget/approval. SBOM pipeline at 20%.`, impact:'Security debt accumulating. Supply chain attack surface unmonitored.', action:'Unblock via executive sponsorship. SBOM to 100% in CI/CD. Sigstore artifact signing.' },
    { icon:'👥', pri:'P2', title:'Team Health Risk', body:'Ryan Martinez on leave. On-call uneven — Platform at 280h vs 60h others. 2 engineers below 7.5 satisfaction.', impact:'Turnover risk: $150-300K per engineer. Burnout degrades incident response quality.', action:'On-call equity audit. Hire 2 SREs by Q3. Mandatory PTO. Compensation benchmarking.' },
    { icon:'🔭', pri:'P3', title:'Observability Blind Spots', body:'OTel migration at 0%. No distributed tracing on 3 critical services. Metrics not correlated with traces.', impact:'35% longer MTTR on hard-to-debug incidents. P0s take longer to diagnose.', action:'OTel as platform Q3 priority. Mandatory tracing for all new services. Dashboards per SLO.' },
  ]

  // compute risk score heatmap for improvements
  const improving = [
    { name: 'FinOps Sprint', detail: 'Saved $18K/month via reserved instances', direction: 'up' },
    { name: 'OpenSSH Patch', detail: '80% of nodes patched — 4 remaining', direction: 'up' },
    { name: 'Vault Secrets', detail: 'Secret migration 55% complete', direction: 'up' },
  ]
  const degrading = [
    { name: 'Cloud Spend', detail: '+22% YoY, accelerating monthly', direction: 'down' },
    { name: 'GDPR Erasure', detail: 'Broken, sprint at 30% — deadline risk', direction: 'down' },
    { name: 'WAF DDoS', detail: 'Active attack, capacity at 94%', direction: 'down' },
  ]

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,rgba(31,111,235,0.1),rgba(188,140,255,0.05))', border: `1px solid rgba(88,166,255,0.2)`, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Lightbulb size={18} color={C.accent} />
          <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Strategic Recommendations Engine</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.text3, marginLeft: 'auto' }}>LIVE DATA · {insights.length} INSIGHTS</span>
        </div>
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.7 }}>
          Analysed {vulns.length} CVEs · {incidents.length} incidents · {costs.length} cost records · {delivs.length} deliverables.
          {' '}<span style={{ color: C.red, fontWeight: 700 }}>2 P0 items require immediate action.</span>
          {' '}Estimated total exposure: <span style={{ color: C.orange, fontWeight: 700 }}>${Math.round((latestCost*0.22 + 12000 + critCVEs*500)/1000).toFixed(0)}K+ over next quarter</span> if unaddressed.
        </div>
      </div>

      {/* Improving / Degrading indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'rgba(63,185,80,0.06)', border: `1px solid rgba(63,185,80,0.2)`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontWeight: 700, color: C.green }}>
            <TrendingUp size={14} /> Improving Areas
          </div>
          {improving.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ color: C.green, fontSize: 13 }}>▲</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{item.name}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(248,81,73,0.06)', border: `1px solid rgba(248,81,73,0.2)`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontWeight: 700, color: C.red }}>
            <TrendingDown size={14} /> Degrading Areas
          </div>
          {degrading.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ color: C.red, fontSize: 13 }}>▼</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{item.name}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${ins.pri==='P0'?'rgba(248,81,73,0.3)':ins.pri==='P1'?'rgba(227,179,65,0.2)':C.border}`, borderRadius: 8, padding: '16px', boxShadow: ins.pri==='P0'?'0 0 20px rgba(248,81,73,0.08)':'none' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{ins.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{ins.title}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: ins.pri==='P0'?'rgba(248,81,73,0.15)':ins.pri==='P1'?'rgba(210,153,34,0.12)':C.surface3, color: ins.pri==='P0'?C.red:ins.pri==='P1'?C.yellow:C.text2, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', border: `1px solid ${ins.pri==='P0'?'rgba(248,81,73,0.3)':C.border}` }}>{ins.pri}</span>
                </div>
                <p style={{ fontSize: 12, color: C.text2, marginBottom: 8, lineHeight: 1.6 }}>{ins.body}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(248,81,73,0.05)', border: `1px solid rgba(248,81,73,0.1)`, borderRadius: 6 }}>
                    <span style={{ color: C.red, fontWeight: 700 }}>Impact: </span><span style={{ color: C.text2 }}>{ins.impact}</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(63,185,80,0.05)', border: `1px solid rgba(63,185,80,0.1)`, borderRadius: 6 }}>
                    <span style={{ color: C.green, fontWeight: 700 }}>Action: </span><span style={{ color: C.text2 }}>{ins.action}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function ReportingTabs({ api }: Props) {
  const [active, setActive] = useState('overview')

  const renderTab = () => {
    switch (active) {
      case 'overview':        return <OverviewTab        api={api} />
      case 'compliance':      return <ComplianceTab      api={api} />
      case 'costs':           return <CostsTab           api={api} />
      case 'incidents':       return <IncidentsTab        api={api} />
      case 'vulnerabilities': return <VulnerabilitiesTab api={api} />
      case 'drifts':          return <DriftsTab          api={api} />
      case 'team':            return <TeamTab            api={api} />
      case 'risks':           return <RisksTab           api={api} />
      case 'deliverables':    return <DeliverablesTab    api={api} />
      case 'strategic':       return <StrategicTab       api={api} />
      default:                return null
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}`, marginBottom: 20, overflowX: 'auto', paddingBottom: 1 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActive(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: '6px 6px 0 0', background: active===id ? C.surface : 'transparent', color: active===id ? C.text : C.text2, fontWeight: active===id ? 700 : 500, fontSize: 12, borderBottom: active===id ? `2px solid ${C.accent}` : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.15s', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Icon size={13} color={active===id ? C.accent : C.text3} />
            {label}
          </button>
        ))}
      </div>
      <div key={active}>{renderTab()}</div>
    </div>
  )
}
