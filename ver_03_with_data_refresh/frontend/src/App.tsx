import { useState, useEffect, Component, ReactNode } from 'react'

// ── Error Boundary — catches render crashes, shows inline error instead of blank page
class ErrorBoundary extends Component<{ children: ReactNode; label: string }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e: Error) { return { error: e.message || String(e) } }
  componentDidCatch(e: Error) { console.error('Panel crash:', e) }
  render() {
    if (this.state.error) return (
      <div style={{ background: 'rgba(248,81,73,0.07)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 10, padding: '24px', margin: '16px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontWeight: 700, color: '#f85149', marginBottom: 6 }}>{this.props.label} crashed</div>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 14, wordBreak: 'break-word', maxWidth: 500, margin: '0 auto 14px' }}>{this.state.error}</div>
        <button onClick={() => this.setState({ error: null })} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #30363d', background: 'none', color: '#8b949e', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          Retry
        </button>
      </div>
    )
    return this.props.children
  }
}
import { Shield, Search, BarChart3, AlertTriangle, Activity, Zap, Database } from 'lucide-react'
import SearchPanel from './components/search/SearchPanel'
import SummaryBoxes from './components/dashboard/SummaryBoxes'
import ReportingTabs from './components/reporting/ReportingTabs'
import DataManager from './components/dashboard/DataManager'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'
type Tab = 'search' | 'reporting' | 'data'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('search')
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    fetch(`${API}/api/summary`).then(r => r.json()).then(setSummary).catch(() => {})
  }, [])

  const NAV = [
    { id: 'search',    label: 'Search & Explore',      icon: Search },
    { id: 'reporting', label: 'Intelligence Reports',   icon: BarChart3 },
    { id: 'data',      label: 'Data Manager',           icon: Database },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Header ── */}
      <header style={{ background: '#0d1117', borderBottom: '1px solid #21262d', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1f6feb,#58a6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(88,166,255,0.35)' }}>
            <Shield size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1, color: '#e6edf3' }}>OPS INTEL</div>
            <div style={{ fontSize: 10, color: '#484f58', fontFamily: 'monospace', letterSpacing: '0.1em' }}>PLATFORM v2.0</div>
          </div>
        </div>

        {/* Live pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.25)', fontSize: 11, color: '#3fb950', fontFamily: 'monospace', flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3fb950', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          LIVE
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 6, border: 'none', background: activeTab === id ? '#1c2333' : 'transparent', color: activeTab === id ? '#e6edf3' : '#8b949e', fontWeight: 600, fontSize: 13, borderBottom: activeTab === id ? '2px solid #58a6ff' : '2px solid transparent', transition: 'all 0.15s', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon size={14} color={activeTab === id ? '#58a6ff' : '#484f58'} />
              {label}
            </button>
          ))}
        </nav>

        {/* Status chips */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {summary && [
            { icon: AlertTriangle, val: summary.critical_cves,    label: 'CVEs',    color: '#f85149' },
            { icon: Activity,      val: summary.active_incidents,  label: 'Active',  color: '#e3b341' },
            { icon: Zap,           val: summary.critical_drifts,   label: 'Drifts',  color: '#d29922' },
          ].map(({ icon: Icon, val, label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: '#161b22', border: '1px solid #21262d', fontSize: 12, color: '#8b949e' }}>
              <Icon size={12} color={color} />
              <span style={{ color, fontWeight: 700, fontFamily: 'monospace' }}>{val}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Summary ribbon ── */}
      {summary && <SummaryBoxes summary={summary} />}

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '24px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
        {activeTab === 'search'    && <ErrorBoundary label="Search"><SearchPanel api={API} /></ErrorBoundary>}
        {activeTab === 'reporting' && <ErrorBoundary label="Reports"><ReportingTabs api={API} /></ErrorBoundary>}
        {activeTab === 'data'      && <ErrorBoundary label="Data Manager"><DataManager api={API} onImportDone={() => {
          fetch(`${API}/api/summary`).then(r => r.json()).then(setSummary).catch(() => {})
        }} /></ErrorBoundary>}
      </main>

      <footer style={{ borderTop: '1px solid #21262d', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#484f58', fontSize: 11, fontFamily: 'monospace' }}>
        <span>OPS INTELLIGENCE PLATFORM © 2026</span>
        <span>PostgreSQL 16 · Go 1.22 · React 18 · WebSocket</span>
      </footer>
    </div>
  )
}
