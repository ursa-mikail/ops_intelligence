import { useState, useEffect } from 'react'
import { Shield, Search, BarChart3, AlertTriangle, Activity, Zap } from 'lucide-react'
import SearchPanel from './components/search/SearchPanel'
import SummaryBoxes from './components/dashboard/SummaryBoxes'
import ReportingTabs from './components/reporting/ReportingTabs'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'reporting'>('search')
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    fetch(`${API}/api/summary`).then(r => r.json()).then(setSummary).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16,
        height: 56, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1f6feb, #58a6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(88,166,255,0.4)' }}>
            <Shield size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1 }}>OPS INTEL</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>PLATFORM v2.0</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.25)', fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse-red 2s infinite' }} />
          LIVE
        </div>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {([['search', 'Search & Explore', Search], ['reporting', 'Intelligence Reports', BarChart3]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setActiveTab(id as any)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 6, border: 'none', background: activeTab === id ? 'var(--surface3)' : 'transparent', color: activeTab === id ? 'var(--text)' : 'var(--text2)', fontWeight: 600, fontSize: 13, borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent', transition: 'all 0.15s', cursor: 'pointer' }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {summary && (
            <>
              {[
                { icon: AlertTriangle, val: summary.critical_cves, label: 'CVEs', color: 'var(--red)' },
                { icon: Activity, val: summary.active_incidents, label: 'Active', color: 'var(--orange)' },
                { icon: Zap, val: summary.critical_drifts, label: 'Drifts', color: 'var(--yellow)' },
              ].map(({ icon: Icon, val, label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>
                  <Icon size={12} color={color} />
                  <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{val}</span>
                  <span>{label}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </header>

      {summary && <SummaryBoxes summary={summary} />}

      <main style={{ flex: 1, padding: '24px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
        {activeTab === 'search' && <SearchPanel api={API} />}
        {activeTab === 'reporting' && <ReportingTabs api={API} />}
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <span>OPS INTELLIGENCE PLATFORM © 2026</span>
        <span>PostgreSQL · Go · React · WebSocket · Recharts</span>
      </footer>
    </div>
  )
}
