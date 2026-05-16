import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, X, Plus, Tag, Server, Database, Globe, Package,
  Activity, Shield, AlertTriangle, Zap, Users, CheckCircle,
  ChevronRight, Filter, LayoutGrid, List
} from 'lucide-react'

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8080')

// Kind metadata
const KIND_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  asset:         { label: 'Asset',        icon: Server,        color: '#58a6ff', bg: 'rgba(88,166,255,0.08)'   },
  vulnerability: { label: 'CVE',          icon: AlertTriangle, color: '#f85149', bg: 'rgba(248,81,73,0.08)'    },
  incident:      { label: 'Incident',     icon: Activity,      color: '#e3b341', bg: 'rgba(227,179,65,0.08)'   },
  drift:         { label: 'Drift',        icon: Zap,           color: '#d29922', bg: 'rgba(210,153,34,0.08)'   },
  risk:          { label: 'Risk',         icon: Shield,        color: '#f85149', bg: 'rgba(248,81,73,0.08)'    },
  deliverable:   { label: 'Deliverable',  icon: Package,       color: '#3fb950', bg: 'rgba(63,185,80,0.08)'    },
  team:          { label: 'Team Member',  icon: Users,         color: '#bc8cff', bg: 'rgba(188,140,255,0.08)'  },
  compliance:    { label: 'Compliance',   icon: CheckCircle,   color: '#39d353', bg: 'rgba(57,211,83,0.08)'    },
  tag:           { label: 'Tag',          icon: Tag,           color: '#8b949e', bg: 'rgba(139,148,158,0.08)'  },
}

const SEV_COLOR: Record<string, string> = {
  critical:'#f85149', high:'#e3b341', medium:'#d29922', low:'#3fb950',
  open:'#f85149', resolved:'#3fb950', in_progress:'#58a6ff',
  acknowledged:'#8b949e', healthy:'#3fb950', degraded:'#d29922',
  active:'#3fb950', 'on-leave':'#8b949e', pass:'#3fb950', fail:'#f85149',
  partial:'#d29922', planned:'#8b949e', completed:'#3fb950', blocked:'#f85149',
}

interface UniversalResult {
  id: number
  kind: string
  title: string
  subtitle: string
  status: string
  severity: string
  tags: string[]
  meta: Record<string, string>
  match_count: number
  match_fields: string[]
}

interface SearchResponse {
  results: UniversalResult[]
  total_count: number
  by_kind: Record<string, number>
  search_terms: string[]
}

interface Props { api: string }

export default function SearchPanel({ api: _api }: Props) {
  const [input, setInput]           = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [checklist, setChecklist]   = useState<string[]>([])
  const [response, setResponse]     = useState<SearchResponse | null>(null)
  const [showSug, setShowSug]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [kindFilter, setKindFilter] = useState<string>('')
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid')
  const [highlightTerms, setHighlight] = useState<string[]>([])

  const sugWS    = useRef<WebSocket | null>(null)
  const searchWS = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Autocomplete WS
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/suggest`)
    sugWS.current = ws
    ws.onmessage = e => { try { setSuggestions(JSON.parse(e.data) || []) } catch {} }
    ws.onerror   = () => {}
    return () => ws.close()
  }, [])

  // Search WS
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/search`)
    searchWS.current = ws
    ws.onmessage = e => {
      try {
        const d: SearchResponse = JSON.parse(e.data)
        setResponse(d)
        setHighlight(d.search_terms || [])
      } catch {}
      setLoading(false)
    }
    ws.onerror = () => setLoading(false)
    return () => ws.close()
  }, [])

  // Trigger search when checklist changes
  useEffect(() => {
    if (searchWS.current?.readyState === WebSocket.OPEN) {
      if (checklist.length === 0) { setResponse(null); return }
      setLoading(true)
      searchWS.current.send(JSON.stringify(checklist))
    }
  }, [checklist])

  const onInput = useCallback((v: string) => {
    setInput(v)
    if (v.length >= 1 && sugWS.current?.readyState === WebSocket.OPEN) {
      sugWS.current.send(v)
      setShowSug(true)
    } else {
      setSuggestions([])
      setShowSug(false)
    }
  }, [])

  const addTerm = useCallback((term: string) => {
    const t = term.trim()
    if (t && !checklist.includes(t)) setChecklist(prev => [...prev, t])
    setInput(''); setSuggestions([]); setShowSug(false)
    inputRef.current?.focus()
  }, [checklist])

  const removeTerm = (term: string) => setChecklist(prev => prev.filter(t => t !== term))

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) addTerm(input)
    if (e.key === 'Escape') { setShowSug(false); setInput('') }
  }

  // Filter by kind
  const allResults = response?.results || []
  const kinds = [...new Set(allResults.map(r => r.kind))]
  const visible = kindFilter ? allResults.filter(r => r.kind === kindFilter) : allResults
  const matched = visible.filter(r => r.match_count > 0)
  const unmatched = visible.filter(r => r.match_count === 0)

  const totalByKind = response?.by_kind || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Search box ── */}
      <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 12, overflow: 'visible', position: 'relative' }}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={14} color="#58a6ff" />
          <span style={{ color: '#8b949e', fontSize: 13 }}>
            Search across <strong style={{ color: '#e6edf3' }}>all data</strong> — assets, CVEs, incidents, drifts, risks, deliverables, team, compliance.
            Press <kbd style={{ background: '#1c2333', border: '1px solid #30363d', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'monospace', color: '#e6edf3' }}>Enter</kbd> to add a filter chip.
          </span>
        </div>

        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
          {/* Checklist chips */}
          {checklist.map(term => (
            <span key={term} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 12px', background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.35)', borderRadius: 100, fontSize: 13, color: '#58a6ff', fontWeight: 600 }}>
              {term}
              <button onClick={() => removeTerm(term)} style={{ background: 'none', border: 'none', color: '#58a6ff', display: 'flex', alignItems: 'center', padding: 0, cursor: 'pointer', opacity: 0.7 }}>
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => onInput(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => input && setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 160)}
              placeholder={checklist.length === 0 ? 'Try: "critical", "kubernetes", "CVE-2024", "security", "Elena", "GDPR"...' : 'Add another search term...'}
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#e6edf3', fontSize: 15, fontFamily: 'inherit' }}
            />

            {/* Suggestions dropdown */}
            {showSug && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 340, background: '#161b22', border: '1px solid #30363d', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px 5px', fontSize: 10, color: '#484f58', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #21262d' }}>
                  {suggestions.length} suggestions — click or Enter to add
                </div>
                {suggestions.map((s, i) => {
                  const km = KIND_META[s.category] || KIND_META.tag
                  const Icon = km.icon
                  return (
                    <button key={i} onMouseDown={() => addTerm(s.value)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'none', border: 'none', color: '#e6edf3', textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1c2333')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <div style={{ width: 22, height: 22, borderRadius: 5, background: km.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={11} color={km.color} />
                      </div>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{s.value}</span>
                      <span style={{ fontSize: 10, color: '#484f58', fontFamily: 'monospace', background: '#1c2333', padding: '1px 6px', borderRadius: 4 }}>{s.category}</span>
                      <Plus size={11} color="#58a6ff" style={{ opacity: 0.5 }} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {checklist.length > 0 && (
            <button onClick={() => { setChecklist([]); setResponse(null) }}
              style={{ background: 'none', border: '1px solid #21262d', borderRadius: 6, color: '#8b949e', padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <X size={11} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Results toolbar ── */}
      {response && response.total_count > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Kind filter pills */}
          <Filter size={13} color="#484f58" />
          <button onClick={() => setKindFilter('')}
            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${kindFilter===''?'#58a6ff':'#21262d'}`, background: kindFilter===''?'rgba(88,166,255,0.1)':'none', color: kindFilter===''?'#58a6ff':'#8b949e', fontSize: 11, cursor: 'pointer', fontWeight: kindFilter===''?700:400 }}>
            All ({response.total_count})
          </button>
          {kinds.map(k => {
            const km = KIND_META[k] || { label: k, color: '#8b949e', bg: 'transparent' }
            return (
              <button key={k} onClick={() => setKindFilter(kindFilter === k ? '' : k)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${kindFilter===k?km.color:'#21262d'}`, background: kindFilter===k?`${km.color}18`:'none', color: kindFilter===k?km.color:'#8b949e', fontSize: 11, cursor: 'pointer', fontWeight: kindFilter===k?700:400 }}>
                {km.label} ({totalByKind[k] || 0})
              </button>
            )
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={() => setViewMode('grid')} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${viewMode==='grid'?'#58a6ff':'#21262d'}`, background: viewMode==='grid'?'rgba(88,166,255,0.1)':'none', color: viewMode==='grid'?'#58a6ff':'#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setViewMode('list')} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${viewMode==='list'?'#58a6ff':'#21262d'}`, background: viewMode==='list'?'rgba(88,166,255,0.1)':'none', color: viewMode==='list'?'#58a6ff':'#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <List size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#58a6ff', fontSize: 13 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #21262d', borderTopColor: '#58a6ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Searching all data…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && checklist.length === 0 && (
        <EmptyState />
      )}

      {/* ── No results ── */}
      {!loading && checklist.length > 0 && response && response.total_count === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#484f58' }}>
          <Search size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#8b949e' }}>No results found</div>
          <div style={{ fontSize: 13 }}>Try broader terms — e.g. "prod", "critical", "security"</div>
        </div>
      )}

      {/* ── Results: matched ── */}
      {matched.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#484f58', fontFamily: 'monospace', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#58a6ff', fontWeight: 700 }}>{matched.length}</span> matching results
            {unmatched.length > 0 && <span>· <span style={{ color: '#484f58' }}>{unmatched.length} not matching</span></span>}
          </div>
          <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', flexDirection: viewMode === 'list' ? 'column' : undefined, gap: 10 }}>
            {matched.map((r, i) => <ResultCard key={`${r.kind}-${r.id}`} result={r} index={i} dim={false} terms={highlightTerms} viewMode={viewMode} />)}
          </div>
        </div>
      )}

      {/* ── Results: dimmed unmatched ── */}
      {unmatched.length > 0 && matched.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#484f58', fontFamily: 'monospace', marginBottom: 8 }}>
            {unmatched.length} non-matching results
          </div>
          <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', flexDirection: viewMode === 'list' ? 'column' : undefined, gap: 8 }}>
            {unmatched.map((r, i) => <ResultCard key={`${r.kind}-${r.id}`} result={r} index={i} dim={true} terms={highlightTerms} viewMode={viewMode} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Result Card — renders differently per kind ─────────────────────────────
function ResultCard({ result: r, dim, terms, viewMode }: { result: UniversalResult, index: number, dim: boolean, terms: string[], viewMode: 'grid' | 'list' }) {
  const km = KIND_META[r.kind] || KIND_META.tag
  const Icon = km.icon
  const matchPct = terms.length > 0 ? Math.round((r.match_count / terms.length) * 100) : 100
  const statusColor = SEV_COLOR[r.status] || SEV_COLOR[r.severity] || '#484f58'
  const severityColor = SEV_COLOR[r.severity] || '#484f58'

  const isList = viewMode === 'list'

  return (
    <div style={{
      background: dim ? 'rgba(13,17,23,0.4)' : '#0d1117',
      border: `1px solid ${!dim && r.match_count >= terms.length && terms.length > 0 ? `${km.color}40` : '#21262d'}`,
      borderRadius: 8,
      padding: isList ? '10px 14px' : '14px 16px',
      opacity: dim ? 0.35 : 1,
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      display: isList ? 'flex' : 'block',
      alignItems: isList ? 'center' : undefined,
      gap: isList ? 12 : undefined,
      boxShadow: !dim && r.match_count > 0 && terms.length > 0 ? `0 0 16px ${km.color}14` : 'none',
    }}
    onMouseEnter={e => { if (!dim) e.currentTarget.style.borderColor = `${km.color}60` }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = !dim && r.match_count >= terms.length && terms.length > 0 ? `${km.color}40` : '#21262d' }}>

      {/* Match progress bar */}
      {terms.length > 0 && !dim && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: `${matchPct}%`, height: 2, background: matchPct === 100 ? '#3fb950' : matchPct >= 50 ? '#58a6ff' : '#d29922', transition: 'width 0.4s' }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isList ? 0 : 8, flex: isList ? 'none' : undefined }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: km.bg, border: `1px solid ${km.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} color={km.color} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 10, color: km.color, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{km.label}</span>
        </div>
      </div>

      {/* Title + subtitle */}
      <div style={{ flex: isList ? 1 : undefined, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: isList ? 13 : 13, color: dim ? '#484f58' : '#e6edf3', fontFamily: r.kind === 'vulnerability' || r.kind === 'asset' ? 'monospace' : 'inherit', marginBottom: isList ? 0 : 2, whiteSpace: isList ? 'nowrap' : undefined, overflow: isList ? 'hidden' : undefined, textOverflow: isList ? 'ellipsis' : undefined }}>
          <Highlight text={r.title} terms={terms} color={km.color} />
        </div>
        {!isList && (
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>
            <Highlight text={r.subtitle} terms={terms} color={km.color} />
          </div>
        )}
      </div>

      {/* Kind-specific content (grid only) */}
      {!isList && <KindDetail result={r} terms={terms} />}

      {/* Status + severity badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: isList ? 0 : 8, marginLeft: isList ? 'auto' : undefined, flexShrink: 0 }}>
        {r.severity && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 100, background: `${severityColor}18`, color: severityColor, border: `1px solid ${severityColor}40`, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {r.severity}
          </span>
        )}
        {r.status && r.status !== r.severity && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 100, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40`, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {r.status.replace(/_/g, ' ')}
          </span>
        )}
        {terms.length > 0 && !dim && (
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: km.color, fontWeight: 700, background: `${km.color}15`, padding: '2px 6px', borderRadius: 4 }}>
            {r.match_count}/{terms.length}
          </span>
        )}
      </div>
    </div>
  )
}

// Per-kind extra detail rows (grid view)
function KindDetail({ result: r, terms }: { result: UniversalResult, terms: string[] }) {
  const m = r.meta || {}
  switch (r.kind) {
    case 'asset':
      return (
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.5 }}>
          {m.description && <div style={{ marginBottom: 5 }}><Highlight text={m.description} terms={terms} color="#58a6ff" /></div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <span>Team: <span style={{ color: '#e6edf3' }}>{m.team}</span></span>
          </div>
        </div>
      )
    case 'vulnerability':
      return (
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.5 }}>
          <div style={{ marginBottom: 5 }}><Highlight text={m.description || ''} terms={terms} color="#f85149" /></div>
          <div style={{ padding: '5px 8px', background: 'rgba(63,185,80,0.06)', border: '1px solid rgba(63,185,80,0.15)', borderRadius: 5, fontSize: 11, color: '#8b949e' }}>
            <span style={{ color: '#3fb950', fontWeight: 700 }}>CVSS {m.cvss} · </span>{m.component}
          </div>
        </div>
      )
    case 'incident':
      return (
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.5 }}>
          {m.impact && <div style={{ marginBottom: 4 }}><Highlight text={m.impact} terms={terms} color="#e3b341" /></div>}
          {m.root_cause && <div style={{ color: '#484f58', fontSize: 10 }}>Root cause: <Highlight text={m.root_cause} terms={terms} color="#58a6ff" /></div>}
        </div>
      )
    case 'drift':
      return (
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ fontFamily: 'monospace', color: '#3fb950', background: 'rgba(63,185,80,0.08)', padding: '1px 6px', borderRadius: 4 }}>{m.expected}</code>
            <span style={{ color: '#484f58' }}>→</span>
            <code style={{ fontFamily: 'monospace', color: '#f85149', background: 'rgba(248,81,73,0.08)', padding: '1px 6px', borderRadius: 4 }}>{m.actual}</code>
          </div>
        </div>
      )
    case 'risk':
      return (
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.5 }}>
          <div style={{ marginBottom: 4 }}><Highlight text={m.impact || ''} terms={terms} color="#f85149" /></div>
          <div style={{ fontSize: 10, color: '#484f58' }}>Owner: <span style={{ color: '#8b949e' }}>{m.owner}</span> · Score: <span style={{ color: Number(m.score) >= 80 ? '#f85149' : '#d29922', fontWeight: 700 }}>{m.score}</span></div>
        </div>
      )
    case 'deliverable':
      return (
        <div style={{ fontSize: 11, color: '#8b949e' }}>
          {m.notes && <div style={{ marginBottom: 5 }}><Highlight text={m.notes} terms={terms} color="#3fb950" /></div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 4, background: '#1c2333', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${m.pct || 0}%`, background: Number(m.pct) === 100 ? '#3fb950' : Number(m.pct) >= 50 ? '#58a6ff' : '#d29922' }} />
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8b949e' }}>{m.pct}%</span>
          </div>
        </div>
      )
    case 'team':
      return (
        <div style={{ fontSize: 11, color: '#8b949e', display: 'flex', gap: 14 }}>
          <span>Incidents: <span style={{ color: '#58a6ff', fontWeight: 700 }}>{m.incidents}</span></span>
          <span>MTTR: <span style={{ color: '#d29922', fontWeight: 700 }}>{Math.round(Number(m.mttr))}m</span></span>
          <span>Sat: <span style={{ color: Number(m.satisfaction) >= 8 ? '#3fb950' : '#d29922', fontWeight: 700 }}>{m.satisfaction}</span></span>
        </div>
      )
    case 'compliance':
      return (
        <div style={{ fontSize: 11, color: '#8b949e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ flex: 1, height: 4, background: '#1c2333', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${m.score || 0}%`, background: Number(m.score) >= 80 ? '#3fb950' : Number(m.score) >= 60 ? '#d29922' : '#f85149' }} />
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{m.score}%</span>
          </div>
          {m.remediation && <div style={{ color: '#484f58', fontSize: 10 }}><Highlight text={m.remediation} terms={terms} color="#3fb950" /></div>}
        </div>
      )
    default:
      return null
  }
}

// Inline search term highlighter
function Highlight({ text, terms, color }: { text: string, terms: string[], color: string }) {
  if (!terms.length || !text) return <>{text}</>
  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, i) =>
        terms.some(t => part.toLowerCase() === t.toLowerCase())
          ? <mark key={i} style={{ background: `${color}28`, color, fontWeight: 700, borderRadius: 3, padding: '0 2px' }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

// Empty state with suggested queries
function EmptyState() {
  const examples = [
    { label: 'critical', desc: 'All critical severity items' },
    { label: 'kubernetes', desc: 'K8s assets and incidents' },
    { label: 'CVE-2024', desc: 'Recent vulnerabilities' },
    { label: 'security', desc: 'Security team & controls' },
    { label: 'GDPR', desc: 'GDPR compliance controls' },
    { label: 'prod', desc: 'Production environment assets' },
    { label: 'Elena', desc: 'Team member search' },
    { label: 'payment', desc: 'Payment service items' },
  ]
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Search size={22} color="#58a6ff" style={{ opacity: 0.7 }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#8b949e', marginBottom: 6 }}>Search across all platform data</div>
      <div style={{ fontSize: 13, color: '#484f58', marginBottom: 24 }}>Searches assets, CVEs, incidents, drifts, risks, deliverables, team members, and compliance controls simultaneously</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 560, margin: '0 auto' }}>
        {examples.map(ex => (
          <div key={ex.label} style={{ padding: '6px 12px', background: '#0d1117', border: '1px solid #21262d', borderRadius: 20, fontSize: 12, color: '#8b949e', cursor: 'default' }}>
            <span style={{ color: '#58a6ff', fontFamily: 'monospace', fontWeight: 700 }}>"{ex.label}"</span>
            <span style={{ color: '#484f58', marginLeft: 6 }}>— {ex.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}