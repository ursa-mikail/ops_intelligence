
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Plus, ChevronRight, Database, Server, Globe, Package, Activity, Tag } from 'lucide-react'

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8080')

const TYPE_ICONS: Record<string, any> = { server: Server, database: Database, network: Globe, service: Package, container: Activity, storage: Package }
const STATUS_COLORS: Record<string, string> = { healthy: 'var(--green)', degraded: 'var(--yellow)', critical: 'var(--red)', offline: 'var(--text3)' }

interface Props { api: string }

export default function SearchPanel({ api: _api }: Props) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [checklist, setChecklist] = useState<string[]>([])
  const [results, setResults] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const suggestWS = useRef<WebSocket | null>(null)
  const searchWS = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // suggest WS
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/suggest`)
    suggestWS.current = ws
    ws.onmessage = e => setSuggestions(JSON.parse(e.data) || [])
    return () => ws.close()
  }, [])

  // search WS
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/search`)
    searchWS.current = ws
    ws.onmessage = e => {
      const d = JSON.parse(e.data)
      setResults(d.assets || [])
      setTotal(d.total_count || 0)
      setLoading(false)
    }
    return () => ws.close()
  }, [])

  // send search when checklist changes
  useEffect(() => {
    if (searchWS.current?.readyState === WebSocket.OPEN) {
      setLoading(true)
      searchWS.current.send(JSON.stringify(checklist))
    }
  }, [checklist])

  const onInput = useCallback((v: string) => {
    setInput(v)
    if (v.length > 0 && suggestWS.current?.readyState === WebSocket.OPEN) {
      suggestWS.current.send(v)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  const addTerm = useCallback((term: string) => {
    const t = term.trim()
    if (t && !checklist.includes(t)) {
      setChecklist(prev => [...prev, t])
    }
    setInput('')
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [checklist])

  const removeTerm = (term: string) => setChecklist(prev => prev.filter(t => t !== term))

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) addTerm(input)
    if (e.key === 'Escape') { setShowSuggestions(false); setInput('') }
  }

  const activeResults = checklist.length > 0 ? results.filter(a => a.match_count > 0) : results
  const dimmedResults = checklist.length > 0 ? results.filter(a => a.match_count === 0) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Search hero */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'visible', position: 'relative' }}>
        {/* Header hint */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={14} color="var(--accent)" />
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>
            Type to search assets, tags, teams, environments — press <kbd style={{ background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>Enter</kbd> or click a suggestion to add to your checklist
          </span>
        </div>

        {/* Input row */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
          {checklist.map(term => (
            <span key={term} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 12px', background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.3)', borderRadius: 100, fontSize: 13, color: 'var(--accent)', fontWeight: 600, animation: 'fadeIn 0.2s ease' }}>
              {term}
              <button onClick={() => removeTerm(term)} style={{ background: 'none', border: 'none', color: 'var(--accent)', display: 'flex', alignItems: 'center', opacity: 0.7, padding: 0, marginLeft: 2 }}>
                <X size={12} />
              </button>
            </span>
          ))}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => onInput(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => input && setShowSuggestions(true)}
              placeholder={checklist.length === 0 ? 'Search by name, tag, team, env, type...' : 'Add another filter...'}
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-sans)' }}
            />
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, minWidth: 320, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px 6px', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                  SUGGESTIONS — press Enter or click to add
                </div>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => addTerm(s.value)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', color: 'var(--text)', textAlign: 'left', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Tag size={12} color="var(--accent)" style={{ opacity: 0.7, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{s.value}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{s.category}</span>
                    <Plus size={11} color="var(--accent)" style={{ opacity: 0.5 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
          {checklist.length > 0 && (
            <button onClick={() => setChecklist([])} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text2)', padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <X size={11} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Results summary bar */}
      {(results.length > 0 || loading) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text2)' }}>
          {loading ? (
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Searching...</span>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{activeResults.length}</span>
              <span>matching assets</span>
              {dimmedResults.length > 0 && <><span style={{ color: 'var(--border2)' }}>·</span><span style={{ color: 'var(--text3)' }}>{dimmedResults.length} not matching</span></>}
              {checklist.length > 0 && <><span style={{ color: 'var(--border2)' }}>·</span><span>sorted by relevance</span></>}
            </>
          )}
        </div>
      )}

      {/* Result Cards */}
      {results.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text3)' }}>
          <Database size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No results yet</div>
          <div style={{ fontSize: 13 }}>Start typing above to search your infrastructure assets</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {activeResults.map((a, i) => <AssetCard key={a.id} asset={a} index={i} dim={false} terms={checklist} />)}
        {dimmedResults.map((a, i) => <AssetCard key={a.id} asset={a} index={activeResults.length + i} dim={true} terms={checklist} />)}
      </div>
    </div>
  )
}

function AssetCard({ asset, dim, terms }: { asset: any, index: number, dim: boolean, terms: string[] }) {
  const Icon = TYPE_ICONS[asset.type] || Server
  const statusColor = STATUS_COLORS[asset.status] || 'var(--text3)'
  const matchPct = terms.length > 0 ? Math.round((asset.match_count / terms.length) * 100) : 100

  return (
    <div className="animate-fade" style={{
      background: dim ? 'rgba(13,17,23,0.5)' : 'var(--surface)',
      border: `1px solid ${dim ? 'var(--border)' : asset.match_count >= terms.length && terms.length > 0 ? 'rgba(88,166,255,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      opacity: dim ? 0.38 : 1,
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: !dim && asset.match_count > 0 && terms.length > 0 ? 'var(--glow-accent)' : 'none',
    }}>
      {/* Match bar */}
      {terms.length > 0 && !dim && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: matchPct + '%', height: 2, background: matchPct === 100 ? 'var(--green)' : matchPct >= 50 ? 'var(--yellow)' : 'var(--accent)', transition: 'width 0.4s ease' }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={statusColor} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)', color: dim ? 'var(--text3)' : 'var(--text)' }}>{asset.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{asset.type} · {asset.environment}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {terms.length > 0 && !dim && (
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
              {asset.match_count}/{terms.length}
            </span>
          )}
          <span className={`badge badge-${asset.status}`}>{asset.status}</span>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>{asset.description}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {(asset.tags || []).slice(0, 5).map((tag: string) => (
          <span key={tag} style={{ fontSize: 10, padding: '2px 7px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 100, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{tag}</span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
        <span>Team: <span style={{ color: 'var(--text2)' }}>{asset.team}</span></span>
        <span>{asset.region}</span>
      </div>
    </div>
  )
}
