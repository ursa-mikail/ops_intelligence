import { useState, useRef, useCallback } from 'react'
import {
  Download, Upload, Database, CheckCircle, AlertTriangle,
  RefreshCw, FileText, Eye, ChevronRight, Package,
  ArrowDownToLine, ArrowUpFromLine, Table2, X, Zap, Users, Shield
} from 'lucide-react'

interface Props {
  api: string
  onImportDone?: () => void
}

const TABLES = [
  { id: 'assets',              label: 'Assets',              icon: Database,      color: '#58a6ff', desc: 'Infrastructure: servers, containers, databases, networks, services' },
  { id: 'vulnerabilities',     label: 'Vulnerabilities',     icon: AlertTriangle, color: '#f85149', desc: 'CVE records with severity, CVSS score, affected component, resolution' },
  { id: 'incidents',           label: 'Incidents',           icon: RefreshCw,     color: '#e3b341', desc: 'Incident log: severity, MTTR, intensity, impact, root cause' },
  { id: 'system_drifts',       label: 'System Drifts',       icon: Zap,           color: '#d29922', desc: 'Config drifts: expected vs actual, change count, severity' },
  { id: 'cost_records',        label: 'Cost Records',        icon: Table2,        color: '#3fb950', desc: 'Monthly cloud spend by category and provider' },
  { id: 'compliance_controls', label: 'Compliance Controls', icon: Shield,        color: '#39d353', desc: 'SOC2 / HIPAA / GDPR / PCI-DSS control scores and remediation' },
  { id: 'team_members',        label: 'Team Members',        icon: Users,         color: '#bc8cff', desc: 'Team roster: MTTR, on-call hours, satisfaction, certifications' },
  { id: 'risks',               label: 'Risks',               icon: AlertTriangle, color: '#f85149', desc: 'Risk register: probability, impact score, mitigation, blockers' },
  { id: 'deliverables',        label: 'Deliverables',        icon: Package,       color: '#58a6ff', desc: 'Project deliverables: status, priority, completion %, dependencies' },
]

type ImportMode = 'append' | 'replace'

interface PreviewResult {
  table?: string
  columns?: string[]
  preview?: Record<string, string>[]
  total_rows?: number
  errors?: string[] | null
  warnings?: string[] | null
  valid?: boolean
}

interface CommitResult {
  table?: string
  mode?: string
  inserted?: number
  skipped?: number
  errors?: string[] | null
}

// ── tiny CSV parser (browser-side for full file) ────────────────────────────
function parseCSVFull(text: string): { headers: string[], rows: Record<string,string>[], errors: string[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 1) return { headers: [], rows: [], errors: ['Empty file'] }

  const splitLine = (line: string) => {
    const fields: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        fields.push(cur); cur = ''
      } else cur += c
    }
    fields.push(cur)
    return fields
  }

  const headers = splitLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string,string>[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = splitLine(line)
    if (vals.length !== headers.length) {
      errors.push(`Row ${i+1}: expected ${headers.length} columns, got ${vals.length}`)
      continue
    }
    const row: Record<string,string> = {}
    headers.forEach((h, j) => { row[h] = vals[j].trim().replace(/^"|"$/g, '') })
    rows.push(row)
  }
  return { headers, rows, errors }
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function DataManager({ api, onImportDone }: Props) {
  const [selectedTable, setSelectedTable] = useState('assets')
  const [mainTab, setMainTab]             = useState<'export' | 'import'>('export')
  const [exportLoading, setExportLoading] = useState<Record<string,boolean>>({})
  const [exportAllLoading, setExportAllLoading] = useState(false)
  const [importMode, setImportMode]       = useState<ImportMode>('append')
  const [importFile, setImportFile]       = useState<File | null>(null)
  const [preview, setPreview]             = useState<PreviewResult | null>(null)
  const [parsedRows, setParsedRows]       = useState<Record<string,string>[]>([])
  const [commitResult, setCommitResult]   = useState<CommitResult | null>(null)
  const [commitLoading, setCommitLoading] = useState(false)
  const [dragOver, setDragOver]           = useState(false)
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const table = TABLES.find(t => t.id === selectedTable)!

  // ── Export single table ─────────────────────────────────────────────────
  const exportTable = async (tableId: string) => {
    setExportLoading(p => ({ ...p, [tableId]: true }))
    try {
      const res = await fetch(`${api}/api/data/export?table=${tableId}`)
      if (!res.ok) throw new Error(await res.text())
      const csv = await res.text()
      triggerDownload(`${tableId}_${new Date().toISOString().slice(0,10)}.csv`, csv)
    } catch (e: any) {
      setErrorMsg('Export failed: ' + (e?.message || String(e)))
    }
    setExportLoading(p => ({ ...p, [tableId]: false }))
  }

  // ── Export all tables (sequential downloads) ────────────────────────────
  const exportAll = async () => {
    setExportAllLoading(true)
    try {
      const res = await fetch(`${api}/api/data/export-all`)
      const bundle: Record<string,string> = await res.json()
      for (const [tbl, csv] of Object.entries(bundle)) {
        triggerDownload(`${tbl}_${new Date().toISOString().slice(0,10)}.csv`, csv)
        await new Promise(r => setTimeout(r, 200))
      }
    } catch (e: any) {
      setErrorMsg('Export all failed: ' + (e?.message || String(e)))
    }
    setExportAllLoading(false)
  }

  // ── Parse uploaded file client-side → preview ──────────────────────────
  const processFile = useCallback(async (file: File) => {
    setImportFile(file)
    setPreview(null)
    setCommitResult(null)
    setParsedRows([])

    const text = await file.text()
    const { headers, rows, errors } = parseCSVFull(text)

    // Fetch schema to validate columns
    let dbCols: string[] = []
    try {
      const res = await fetch(`${api}/api/data/schema?table=${selectedTable}`)
      dbCols = await res.json()
    } catch {}

    const warnings: string[] = []
    const dbColSet = new Set(dbCols)
    for (const h of headers) {
      if (h !== 'id' && dbCols.length > 0 && !dbColSet.has(h)) {
        warnings.push(`Column "${h}" not found in ${selectedTable} schema — will be ignored`)
      }
    }
    if (rows.length === 0 && errors.length === 0) {
      errors.push('No data rows found in file')
    }

    const result: PreviewResult = {
      table: selectedTable,
      columns: headers,
      preview: rows.slice(0, 8),
      total_rows: rows.length,
      errors,
      warnings,
      valid: errors.length === 0 && rows.length > 0 && headers.length > 0,
    }
    setPreview(result)
    setParsedRows(rows)
  }, [api, selectedTable])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  // ── Commit import to PostgreSQL ─────────────────────────────────────────
  const handleCommit = async () => {
    if (!preview?.valid || parsedRows.length === 0) return
    setCommitLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${api}/api/data/import/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          mode:  importMode,
          rows:  parsedRows,
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        setErrorMsg(text || `Server error ${res.status}`)
        return
      }
      let result: CommitResult
      try {
        result = JSON.parse(text)
      } catch {
        setErrorMsg('Invalid response from server: ' + text.slice(0, 200))
        return
      }
      setCommitResult(result)
      setPreview(null)
      setImportFile(null)
      setParsedRows([])
      if (fileRef.current) fileRef.current.value = ''
      onImportDone?.()
    } catch (e: any) {
      setErrorMsg(e?.message || 'Network error — is the backend running?')
    } finally {
      setCommitLoading(false)
    }
  }

  const resetImport = () => {
    setImportFile(null)
    setPreview(null)
    setParsedRows([])
    setCommitResult(null)
    setErrorMsg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minHeight: 600 }}>

      {/* Sidebar */}
      <div style={{ width: 210, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: '#484f58', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, padding: '0 8px', marginBottom: 8 }}>
          9 Tables
        </div>
        {TABLES.map(t => {
          const Icon = t.icon
          const active = selectedTable === t.id
          return (
            <button key={t.id} onClick={() => { setSelectedTable(t.id); resetImport() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: `1px solid ${active ? t.color+'40' : 'transparent'}`, background: active ? `${t.color}0f` : 'none', color: active ? t.color : '#8b949e', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: 2, fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.color = '#e6edf3' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#8b949e' } }}>
              <Icon size={13} color={active ? t.color : '#484f58'} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.label}</span>
              {active && <ChevronRight size={11} />}
            </button>
          )
        })}

        <div style={{ borderTop: '1px solid #21262d', marginTop: 10, paddingTop: 10 }}>
          <button onClick={exportAll} disabled={exportAllLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', borderRadius: 7, border: '1px solid #30363d', background: 'none', color: exportAllLoading ? '#484f58' : '#e3b341', fontSize: 12, fontWeight: 600, cursor: exportAllLoading ? 'not-allowed' : 'pointer', width: '100%', fontFamily: 'inherit' }}>
            <ArrowDownToLine size={13} />
            {exportAllLoading ? 'Exporting…' : 'Export All Tables'}
          </button>
        </div>
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Table header */}
        <div style={{ background: '#0d1117', border: `1px solid ${table.color}25`, borderRadius: 10, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${table.color}15`, border: `1px solid ${table.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <table.icon size={16} color={table.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#e6edf3', marginBottom: 2 }}>{table.label}</div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>{table.desc}</div>
          </div>
          <button onClick={() => exportTable(selectedTable)} disabled={exportLoading[selectedTable]}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: `1px solid ${table.color}40`, background: `${table.color}0a`, color: exportLoading[selectedTable] ? '#484f58' : table.color, fontSize: 12, fontWeight: 600, cursor: exportLoading[selectedTable] ? 'not-allowed' : 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
            <Download size={13} />
            {exportLoading[selectedTable] ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #21262d', marginBottom: 14, gap: 2 }}>
          {([
            ['export', 'Export / Download', ArrowDownToLine],
            ['import', 'Import / Upload CSV', ArrowUpFromLine],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setMainTab(id); resetImport() }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: '6px 6px 0 0', background: mainTab === id ? '#0d1117' : 'transparent', color: mainTab === id ? '#e6edf3' : '#8b949e', fontWeight: mainTab === id ? 700 : 400, fontSize: 13, borderBottom: mainTab === id ? '2px solid #58a6ff' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon size={13} color={mainTab === id ? '#58a6ff' : '#484f58'} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Inline error banner ──────────────────────────────────────── */}
        {errorMsg && (
          <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.35)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertTriangle size={15} color="#f85149" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#f85149', marginBottom: 2 }}>Error</div>
              <div style={{ fontSize: 12, color: '#e6edf3', wordBreak: 'break-word' }}>{errorMsg}</div>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── EXPORT ─────────────────────────────────────────────────── */}
        {mainTab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e6edf3', marginBottom: 12 }}>Download any table as CSV</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
                {TABLES.map(t => {
                  const Icon = t.icon
                  const loading = exportLoading[t.id]
                  return (
                    <button key={t.id} onClick={() => exportTable(t.id)} disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 8, border: `1px solid ${t.color}25`, background: loading ? '#1c2333' : '#161b22', color: loading ? '#484f58' : '#e6edf3', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit' }}
                      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#1c2333'; e.currentTarget.style.borderColor = t.color+'60' } }}
                      onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.borderColor = t.color+'25' } }}>
                      <Icon size={14} color={loading ? '#484f58' : t.color} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontWeight: 500 }}>{t.label}</span>
                      {loading ? <span style={{ fontSize: 10, color: '#484f58' }}>…</span> : <Download size={12} color="#484f58" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Format reference */}
            <div style={{ background: 'rgba(88,166,255,0.04)', border: '1px solid rgba(88,166,255,0.15)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#58a6ff', marginBottom: 8 }}>CSV Format Reference</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#8b949e', lineHeight: 1.8 }}>
                <div>
                  <div>• First row = column headers</div>
                  <div>• Dates: <code style={{ fontFamily: 'monospace', color: '#e3b341', fontSize: 11 }}>YYYY-MM-DD HH:MM:SS</code></div>
                  <div>• Arrays: <code style={{ fontFamily: 'monospace', color: '#e3b341', fontSize: 11 }}>{'{"val1","val2"}'}</code></div>
                </div>
                <div>
                  <div>• Fields with commas are double-quoted</div>
                  <div>• <code style={{ fontFamily: 'monospace', color: '#e3b341', fontSize: 11 }}>id</code> column ignored on re-import</div>
                  <div>• Unknown columns silently skipped</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── IMPORT ─────────────────────────────────────────────────── */}
        {mainTab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Mode selector */}
            <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e6edf3', marginBottom: 10 }}>Import Mode</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  ['append',  'Append Rows',   '#58a6ff', 'Adds new rows. Existing data untouched. Safe to use anytime.'],
                  ['replace', 'Replace Table', '#f85149', 'Deletes ALL rows (CASCADE — removes dependent rows in other tables too), then inserts. Cannot be undone.'],
                ] as const).map(([id, label, color, desc]) => (
                  <button key={id} onClick={() => setImportMode(id)}
                    style={{ flex: 1, padding: '11px 14px', borderRadius: 8, border: `2px solid ${importMode === id ? color : '#21262d'}`, background: importMode === id ? `${color}0f` : '#161b22', color: importMode === id ? color : '#8b949e', fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {importMode === id && <CheckCircle size={12} />}
                      {label}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone — only show when no file loaded and no result */}
            {!importFile && !commitResult && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{ background: dragOver ? 'rgba(88,166,255,0.06)' : '#0d1117', border: `2px dashed ${dragOver ? '#58a6ff' : '#30363d'}`, borderRadius: 10, padding: '44px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                <Upload size={30} color={dragOver ? '#58a6ff' : '#484f58'} style={{ margin: '0 auto 14px', display: 'block' }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: dragOver ? '#58a6ff' : '#8b949e', marginBottom: 6 }}>
                  {dragOver ? 'Drop it!' : 'Drop CSV here or click to browse'}
                </div>
                <div style={{ fontSize: 12, color: '#484f58' }}>
                  Importing into <span style={{ color: table.color, fontFamily: 'monospace', fontWeight: 700 }}>{selectedTable}</span>
                  {' '}· First row must be column headers
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileInput} style={{ display: 'none' }} />
              </div>
            )}

            {/* File loaded — preview */}
            {importFile && preview && !commitResult && (
              <div style={{ background: '#0d1117', border: `1px solid ${(preview.valid ?? false) ? '#3fb95040' : '#f8514940'}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '12px 16px', background: (preview.valid ?? false) ? 'rgba(63,185,80,0.05)' : 'rgba(248,81,73,0.05)', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: (preview.valid ?? false) ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {(preview.valid ?? false) ? <CheckCircle size={15} color="#3fb950" /> : <AlertTriangle size={15} color="#f85149" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: (preview.valid ?? false) ? '#3fb950' : '#f85149' }}>
                      {(preview.valid ?? false)
                        ? `✓ Valid — ${preview.total_rows ?? 0} rows ready to ${importMode} into ${selectedTable}`
                        : `✗ ${(preview.errors ?? []).length} error(s) — fix before importing`}
                    </div>
                    <div style={{ fontSize: 11, color: '#8b949e' }}>{importFile.name} · {(preview.columns ?? []).length} columns detected</div>
                  </div>
                  <button onClick={resetImport} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Errors */}
                {(preview.errors ?? []).length > 0 && (
                  <div style={{ padding: '10px 16px', background: 'rgba(248,81,73,0.04)', borderBottom: '1px solid #21262d' }}>
                    {(preview.errors ?? []).map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#f85149', display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
                        <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {e}
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {(preview.warnings ?? []).length > 0 && (
                  <div style={{ padding: '10px 16px', background: 'rgba(210,153,34,0.04)', borderBottom: '1px solid #21262d' }}>
                    {(preview.warnings ?? []).map((w, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#d29922', display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
                        <Eye size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview table */}
                {(preview.preview ?? []).length > 0 && (
                  <div style={{ padding: '12px 16px', overflowX: 'auto' }}>
                    <div style={{ fontSize: 10, color: '#484f58', fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Preview — first {(preview.preview ?? []).length} of {preview.total_rows ?? 0} rows
                    </div>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500, fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #21262d' }}>
                          {(preview.columns ?? []).map(c => (
                            <th key={c} style={{ padding: '5px 10px', textAlign: 'left', color: '#484f58', fontWeight: 700, fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(preview.preview ?? []).map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #161b22' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            {(preview.columns ?? []).map(c => (
                              <td key={c} style={{ padding: '6px 10px', color: '#8b949e', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row[c]}>
                                {row[c] || <span style={{ color: '#30363d' }}>—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Action bar */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #21262d', background: '#080b12', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 12, color: '#8b949e' }}>
                    Mode: <span style={{ color: importMode === 'replace' ? '#f85149' : '#58a6ff', fontWeight: 700 }}>{importMode}</span>
                    {importMode === 'replace' && (
                      <span style={{ color: '#f85149' }}> — ALL existing {selectedTable} will be deleted first</span>
                    )}
                  </div>
                  <button onClick={resetImport}
                    style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #30363d', background: 'none', color: '#8b949e', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button onClick={handleCommit} disabled={!(preview.valid ?? false) || commitLoading}
                    style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: !(preview.valid ?? false) ? '#21262d' : importMode === 'replace' ? '#f85149' : '#238636', color: !(preview.valid ?? false) ? '#484f58' : 'white', fontSize: 13, fontWeight: 700, cursor: !(preview.valid ?? false) || commitLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, opacity: commitLoading ? 0.7 : 1, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {commitLoading
                      ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</>
                      : <><Upload size={13} /> {importMode === 'replace' ? 'Replace' : 'Append'} {preview.total_rows ?? 0} rows into PostgreSQL</>
                    }
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </button>
                </div>
              </div>
            )}

            {/* Success / result */}
            {commitResult && (
              <div style={{ background: '#0d1117', border: `1px solid ${(commitResult.errors ?? []).length ? '#f8514940' : '#3fb95040'}`, borderRadius: 10, padding: '24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: (commitResult.errors ?? []).length ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(commitResult.errors ?? []).length ? <AlertTriangle size={20} color="#f85149" /> : <CheckCircle size={20} color="#3fb950" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: (commitResult.errors ?? []).length ? '#f85149' : '#3fb950' }}>
                      {(commitResult.errors ?? []).length ? 'Import completed with errors' : 'Import successful!'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8b949e' }}>
                      {(commitResult.mode ?? '')} into <span style={{ fontFamily: 'monospace', color: table.color }}>{(commitResult.table ?? '')}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Rows Inserted',   value: (commitResult.inserted ?? 0), color: '#3fb950' },
                    { label: 'Rows Skipped',    value: (commitResult.skipped ?? 0),  color: '#d29922' },
                    { label: 'Errors',          value: (commitResult.errors ?? []).length, color: '#f85149' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#161b22', borderRadius: 8, padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {(commitResult.errors ?? []).length > 0 && (
                  <div style={{ background: 'rgba(248,81,73,0.05)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    {(commitResult.errors ?? []).slice(0, 8).map((e, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#f85149', marginBottom: 3 }}>• {e}</div>
                    ))}
                    {(commitResult.errors ?? []).length > 8 && (
                      <div style={{ fontSize: 11, color: '#484f58' }}>…and {(commitResult.errors ?? []).length - 8} more</div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={resetImport}
                    style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #30363d', background: 'none', color: '#8b949e', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Import another file
                  </button>
                  <button onClick={() => exportTable(selectedTable)}
                    style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${table.color}40`, background: `${table.color}0a`, color: table.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={12} /> Download updated {table.label} CSV
                  </button>
                </div>
              </div>
            )}

            {/* Import tips — only when idle */}
            {!importFile && !commitResult && (
              <div style={{ background: 'rgba(210,153,34,0.04)', border: '1px solid rgba(210,153,34,0.15)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#d29922', marginBottom: 8 }}>Import Guidelines</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#8b949e', lineHeight: 1.9 }}>
                  <div>
                    <div>• Exported CSVs can be re-imported directly</div>
                    <div>• <strong style={{ color: '#58a6ff' }}>Append</strong>: safe, additive, recommended</div>
                    <div>• <strong style={{ color: '#f85149' }}>Replace</strong>: TRUNCATE CASCADE — deletes all rows and any rows in other tables that reference them</div>
                  </div>
                  <div>
                    <div>• Column names must match the schema exactly</div>
                    <div>• The <code style={{ fontFamily: 'monospace', color: '#e3b341' }}>id</code> column is always ignored on import</div>
                    <div>• Preview shown before any data is written</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}