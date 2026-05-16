package db

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	"ops-intelligence/internal/models"

	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

type DB struct {
	conn *sql.DB
}

func New() (*DB, error) {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getenv("DB_HOST", "localhost"),
		getenv("DB_PORT", "5432"),
		getenv("DB_USER", "opsuser"),
		getenv("DB_PASSWORD", "opspass"),
		getenv("DB_NAME", "opsdb"),
	)
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	if err := conn.Ping(); err != nil {
		return nil, err
	}
	return &DB{conn: conn}, nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// GetSuggestions searches across ALL tables for autocomplete
func (d *DB) GetSuggestions(query string) ([]models.SearchSuggestion, error) {
	q := `
		SELECT name, 'asset', 3 FROM assets
			WHERE name ILIKE $1 OR description ILIKE $1 OR team ILIKE $1 OR environment ILIKE $1 OR type ILIKE $1
		UNION ALL
		SELECT tag, 'tag', 2 FROM assets, UNNEST(tags) AS tag WHERE tag ILIKE $1
		UNION ALL
		SELECT cve_id, 'cve', 4 FROM vulnerabilities WHERE cve_id ILIKE $1 OR title ILIKE $1 OR affected_component ILIKE $1
		UNION ALL
		SELECT title, 'incident', 2 FROM incidents WHERE title ILIKE $1 OR category ILIKE $1
		UNION ALL
		SELECT component, 'drift', 2 FROM system_drifts WHERE component ILIKE $1 OR drift_type ILIKE $1
		UNION ALL
		SELECT title, 'risk', 3 FROM risks WHERE title ILIKE $1 OR category ILIKE $1 OR owner ILIKE $1
		UNION ALL
		SELECT title, 'deliverable', 2 FROM deliverables WHERE title ILIKE $1 OR type ILIKE $1 OR assigned_team ILIKE $1
		UNION ALL
		SELECT name, 'team', 2 FROM team_members WHERE name ILIKE $1 OR role ILIKE $1 OR team ILIKE $1
		UNION ALL
		SELECT control_name, 'compliance', 2 FROM compliance_controls WHERE control_name ILIKE $1 OR framework ILIKE $1 OR control_id ILIKE $1
		ORDER BY 3 DESC, 1 LIMIT 15`
	rows, err := d.conn.Query(q, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SearchSuggestion
	seen := map[string]bool{}
	for rows.Next() {
		var s models.SearchSuggestion
		rows.Scan(&s.Value, &s.Category, &s.Count)
		if !seen[s.Value] {
			seen[s.Value] = true
			results = append(results, s)
		}
	}
	return results, nil
}

// SearchAll searches all 9 tables and returns unified results sorted by match count
func (d *DB) SearchAll(terms []string) (*models.UniversalSearchResponse, error) {
	resp := &models.UniversalSearchResponse{
		SearchTerms: terms,
		ByKind:      map[string]int{},
	}

	if len(terms) == 0 {
		return resp, nil
	}

	var results []models.UniversalResult

	// helper: count matches across fields
	countMatches := func(fields []string) (int, []string) {
		count := 0
		var matched []string
		for _, term := range terms {
			t := strings.ToLower(term)
			for _, f := range fields {
				if strings.Contains(strings.ToLower(f), t) {
					count++
					matched = append(matched, term)
					break
				}
			}
		}
		return count, matched
	}

	// ── Assets ──────────────────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT id, name, type, environment, region, team, status, tags, COALESCE(description,'') FROM assets`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var a models.Asset
				var tags pq.StringArray
				rows.Scan(&a.ID, &a.Name, &a.Type, &a.Environment, &a.Region, &a.Team, &a.Status, &tags, &a.Description)
				a.Tags = []string(tags)
				fields := append([]string{a.Name, a.Type, a.Environment, a.Region, a.Team, a.Description}, a.Tags...)
				mc, mf := countMatches(fields)
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: a.ID, Kind: "asset", Title: a.Name,
						Subtitle: a.Type + " · " + a.Environment + " · " + a.Region,
						Status: a.Status, Tags: a.Tags,
						Meta: map[string]string{"team": a.Team, "description": a.Description},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// ── Vulnerabilities ─────────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT v.id, v.cve_id, COALESCE(a.name,''), v.severity, v.cvss_score::text, v.title, v.description, v.affected_component, v.status FROM vulnerabilities v LEFT JOIN assets a ON a.id=v.asset_id`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id int
				var cveID, assetName, severity, cvss, title, desc, component, status string
				rows.Scan(&id, &cveID, &assetName, &severity, &cvss, &title, &desc, &component, &status)
				mc, mf := countMatches([]string{cveID, title, desc, component, assetName, severity})
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: id, Kind: "vulnerability", Title: cveID + " — " + title,
						Subtitle: component + " · asset: " + assetName,
						Status: status, Severity: severity,
						Meta: map[string]string{"cvss": cvss, "asset": assetName, "component": component, "description": desc},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// ── Incidents ───────────────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT i.id, COALESCE(a.name,''), i.title, i.severity, i.category, i.intensity::text, i.resolved::text, COALESCE(i.impact,''), COALESCE(i.root_cause,'') FROM incidents i LEFT JOIN assets a ON a.id=i.asset_id`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id int
				var assetName, title, severity, category, intensity, resolved, impact, rootCause string
				rows.Scan(&id, &assetName, &title, &severity, &category, &intensity, &resolved, &impact, &rootCause)
				status := "open"
				if resolved == "true" {
					status = "resolved"
				}
				mc, mf := countMatches([]string{title, assetName, category, severity, impact, rootCause})
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: id, Kind: "incident", Title: title,
						Subtitle: category + " · asset: " + assetName + " · intensity " + intensity,
						Status: status, Severity: severity,
						Meta: map[string]string{"asset": assetName, "category": category, "impact": impact, "root_cause": rootCause},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// ── System Drifts ───────────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT sd.id, COALESCE(a.name,''), sd.drift_type, sd.component, sd.expected_value, sd.actual_value, sd.severity, sd.acknowledged::text FROM system_drifts sd LEFT JOIN assets a ON a.id=sd.asset_id`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id int
				var assetName, driftType, component, expected, actual, severity, ack string
				rows.Scan(&id, &assetName, &driftType, &component, &expected, &actual, &severity, &ack)
				status := "open"
				if ack == "true" {
					status = "acknowledged"
				}
				mc, mf := countMatches([]string{component, driftType, assetName, expected, actual, severity})
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: id, Kind: "drift", Title: component,
						Subtitle: driftType + " drift · asset: " + assetName,
						Status: status, Severity: severity,
						Meta: map[string]string{"asset": assetName, "type": driftType, "expected": expected, "actual": actual},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// ── Risks ────────────────────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT id, title, category, probability, COALESCE(impact,''), risk_score::text, status, COALESCE(owner,''), COALESCE(mitigation,'') FROM risks`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id int
				var title, category, probability, impact, score, status, owner, mitigation string
				rows.Scan(&id, &title, &category, &probability, &impact, &score, &status, &owner, &mitigation)
				mc, mf := countMatches([]string{title, category, probability, impact, owner, mitigation})
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: id, Kind: "risk", Title: title,
						Subtitle: category + " · " + probability + " probability",
						Status: status,
						Meta: map[string]string{"category": category, "probability": probability, "impact": impact, "score": score, "owner": owner},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// ── Deliverables ─────────────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT id, title, type, status, priority, COALESCE(assigned_team,''), completion_pct::text, COALESCE(notes,'') FROM deliverables`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id int
				var title, dtype, status, priority, team, pct, notes string
				rows.Scan(&id, &title, &dtype, &status, &priority, &team, &pct, &notes)
				mc, mf := countMatches([]string{title, dtype, status, priority, team, notes})
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: id, Kind: "deliverable", Title: title,
						Subtitle: dtype + " · " + team + " · " + pct + "% complete",
						Status: status, Severity: priority,
						Meta: map[string]string{"type": dtype, "team": team, "pct": pct, "notes": notes},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// ── Team Members ─────────────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT id, name, role, team, incidents_handled::text, avg_mttr_minutes::text, satisfaction_score::text, availability FROM team_members`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id int
				var name, role, team, incidents, mttr, sat, avail string
				rows.Scan(&id, &name, &role, &team, &incidents, &mttr, &sat, &avail)
				mc, mf := countMatches([]string{name, role, team, avail})
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: id, Kind: "team", Title: name,
						Subtitle: role + " · " + team,
						Status: avail,
						Meta: map[string]string{"role": role, "team": team, "incidents": incidents, "mttr": mttr, "satisfaction": sat},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// ── Compliance Controls ──────────────────────────────────────────────
	{
		rows, err := d.conn.Query(`SELECT id, framework, control_id, control_name, status, score::text, COALESCE(remediation,''), COALESCE(priority,'low') FROM compliance_controls`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id int
				var framework, controlID, controlName, status, score, remediation, priority string
				rows.Scan(&id, &framework, &controlID, &controlName, &status, &score, &remediation, &priority)
				mc, mf := countMatches([]string{framework, controlID, controlName, status, remediation})
				if mc > 0 {
					results = append(results, models.UniversalResult{
						ID: id, Kind: "compliance", Title: framework + " " + controlID + " — " + controlName,
						Subtitle: "Score: " + score + "% · " + status,
						Status: status, Severity: priority,
						Meta: map[string]string{"framework": framework, "score": score, "remediation": remediation},
						MatchCount: mc, MatchFields: mf,
					})
				}
			}
		}
	}

	// sort by match count desc
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].MatchCount > results[i].MatchCount {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	// tally by kind
	for _, r := range results {
		resp.ByKind[r.Kind]++
	}
	resp.Results = results
	resp.TotalCount = len(results)
	return resp, nil
}

func (d *DB) GetDashboardSummary() (*models.DashboardSummary, error) {
	s := &models.DashboardSummary{}
	d.conn.QueryRow(`SELECT COUNT(*) FROM assets`).Scan(&s.TotalAssets)
	d.conn.QueryRow(`SELECT COUNT(*) FROM assets WHERE status='critical'`).Scan(&s.CriticalAssets)
	d.conn.QueryRow(`SELECT COUNT(*) FROM vulnerabilities WHERE status != 'resolved'`).Scan(&s.OpenCVEs)
	d.conn.QueryRow(`SELECT COUNT(*) FROM vulnerabilities WHERE severity='critical' AND status != 'resolved'`).Scan(&s.CriticalCVEs)
	d.conn.QueryRow(`SELECT COUNT(*) FROM incidents WHERE resolved=false`).Scan(&s.ActiveIncidents)
	d.conn.QueryRow(`SELECT COUNT(*) FROM system_drifts WHERE acknowledged=false`).Scan(&s.OpenDrifts)
	d.conn.QueryRow(`SELECT COUNT(*) FROM system_drifts WHERE severity='critical' AND acknowledged=false`).Scan(&s.CriticalDrifts)
	d.conn.QueryRow(`SELECT COALESCE(SUM(amount),0) FROM cost_records WHERE period=(SELECT MAX(period) FROM cost_records)`).Scan(&s.TotalMonthlyCost)
	d.conn.QueryRow(`SELECT COALESCE(AVG(score),0) FROM compliance_controls`).Scan(&s.ComplianceAvgScore)
	d.conn.QueryRow(`SELECT COUNT(*) FROM risks WHERE status='open'`).Scan(&s.OpenRisks)
	d.conn.QueryRow(`SELECT COUNT(*) FROM risks WHERE risk_score>=80 AND status='open'`).Scan(&s.CriticalRisks)

	var prev, curr float64
	rows, _ := d.conn.Query(`SELECT period, SUM(amount) FROM cost_records GROUP BY period ORDER BY period DESC LIMIT 2`)
	if rows != nil {
		defer rows.Close()
		i := 0
		for rows.Next() {
			var p string
			var amt float64
			rows.Scan(&p, &amt)
			if i == 0 {
				curr = amt
			} else {
				prev = amt
			}
			i++
		}
		if prev > 0 {
			s.CostTrendPct = ((curr - prev) / prev) * 100
		}
	}
	return s, nil
}

func (d *DB) GetVulnerabilities(sortBy, filterSev, filterStatus string) ([]models.Vulnerability, error) {
	q := `SELECT v.id, v.cve_id, v.asset_id, COALESCE(a.name,'unknown'), v.severity, v.cvss_score, v.title, v.description, v.affected_component, v.resolution, v.status, v.discovered_at, v.resolved_at
		FROM vulnerabilities v LEFT JOIN assets a ON a.id=v.asset_id WHERE 1=1`
	args := []interface{}{}
	i := 1
	if filterSev != "" {
		q += fmt.Sprintf(" AND v.severity=$%d", i); args = append(args, filterSev); i++
	}
	if filterStatus != "" {
		q += fmt.Sprintf(" AND v.status=$%d", i); args = append(args, filterStatus); i++
	}
	switch sortBy {
	case "severity":
		q += " ORDER BY CASE v.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END"
	case "date":
		q += " ORDER BY v.discovered_at DESC"
	default:
		q += " ORDER BY v.cvss_score DESC"
	}
	rows, err := d.conn.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.Vulnerability
	for rows.Next() {
		var v models.Vulnerability
		rows.Scan(&v.ID, &v.CVEID, &v.AssetID, &v.AssetName, &v.Severity, &v.CVSSScore, &v.Title, &v.Description, &v.AffectedComponent, &v.Resolution, &v.Status, &v.DiscoveredAt, &v.ResolvedAt)
		results = append(results, v)
	}
	return results, nil
}

func (d *DB) GetIncidents() ([]models.Incident, error) {
	rows, err := d.conn.Query(`SELECT i.id, i.asset_id, COALESCE(a.name,'unknown'), i.title, i.severity, i.category, i.frequency, i.intensity, i.start_time, i.end_time, i.resolved, i.mttr_minutes, i.impact, i.root_cause FROM incidents i LEFT JOIN assets a ON a.id=i.asset_id ORDER BY i.start_time DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.Incident
	for rows.Next() {
		var inc models.Incident
		rows.Scan(&inc.ID, &inc.AssetID, &inc.AssetName, &inc.Title, &inc.Severity, &inc.Category, &inc.Frequency, &inc.Intensity, &inc.StartTime, &inc.EndTime, &inc.Resolved, &inc.MTTRMinutes, &inc.Impact, &inc.RootCause)
		results = append(results, inc)
	}
	return results, nil
}

func (d *DB) GetDrifts() ([]models.SystemDrift, error) {
	rows, err := d.conn.Query(`SELECT sd.id, sd.asset_id, COALESCE(a.name,'unknown'), sd.drift_type, sd.component, sd.expected_value, sd.actual_value, sd.severity, sd.detected_at, sd.acknowledged, sd.change_count FROM system_drifts sd LEFT JOIN assets a ON a.id=sd.asset_id ORDER BY CASE sd.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SystemDrift
	for rows.Next() {
		var sd models.SystemDrift
		rows.Scan(&sd.ID, &sd.AssetID, &sd.AssetName, &sd.DriftType, &sd.Component, &sd.ExpectedValue, &sd.ActualValue, &sd.Severity, &sd.DetectedAt, &sd.Acknowledged, &sd.ChangeCount)
		results = append(results, sd)
	}
	return results, nil
}

func (d *DB) GetCosts() ([]models.CostRecord, error) {
	rows, err := d.conn.Query(`SELECT id, TO_CHAR(period,'YYYY-MM'), category, COALESCE(subcategory,''), amount, currency, COALESCE(provider,'') FROM cost_records ORDER BY period DESC, category`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.CostRecord
	for rows.Next() {
		var c models.CostRecord
		rows.Scan(&c.ID, &c.Period, &c.Category, &c.Subcategory, &c.Amount, &c.Currency, &c.Provider)
		results = append(results, c)
	}
	return results, nil
}

func (d *DB) GetCompliance() ([]models.ComplianceControl, error) {
	rows, err := d.conn.Query(`SELECT id, framework, control_id, control_name, status, score, last_assessed, COALESCE(remediation,''), COALESCE(priority,'low') FROM compliance_controls ORDER BY framework, control_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.ComplianceControl
	for rows.Next() {
		var c models.ComplianceControl
		rows.Scan(&c.ID, &c.Framework, &c.ControlID, &c.ControlName, &c.Status, &c.Score, &c.LastAssessed, &c.Remediation, &c.Priority)
		results = append(results, c)
	}
	return results, nil
}

func (d *DB) GetTeam() ([]models.TeamMember, error) {
	rows, err := d.conn.Query(`SELECT id, name, role, team, incidents_handled, avg_mttr_minutes, on_call_hours, satisfaction_score, certifications, availability FROM team_members ORDER BY incidents_handled DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.TeamMember
	for rows.Next() {
		var t models.TeamMember
		var certs pq.StringArray
		rows.Scan(&t.ID, &t.Name, &t.Role, &t.Team, &t.IncidentsHandled, &t.AvgMTTRMinutes, &t.OnCallHours, &t.SatisfactionScore, &certs, &t.Availability)
		t.Certifications = []string(certs)
		results = append(results, t)
	}
	return results, nil
}

func (d *DB) GetRisks() ([]models.Risk, error) {
	rows, err := d.conn.Query(`SELECT id, title, category, probability, impact, risk_score, status, COALESCE(owner,''), COALESCE(mitigation,''), COALESCE(TO_CHAR(due_date,'YYYY-MM-DD'),''), COALESCE(blockers,'{}') FROM risks ORDER BY risk_score DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.Risk
	for rows.Next() {
		var r models.Risk
		var blockers pq.StringArray
		rows.Scan(&r.ID, &r.Title, &r.Category, &r.Probability, &r.Impact, &r.RiskScore, &r.Status, &r.Owner, &r.Mitigation, &r.DueDate, &blockers)
		r.Blockers = []string(blockers)
		results = append(results, r)
	}
	return results, nil
}

func (d *DB) GetDeliverables() ([]models.Deliverable, error) {
	rows, err := d.conn.Query(`SELECT id, title, type, status, priority, COALESCE(assigned_team,''), COALESCE(TO_CHAR(target_date,'YYYY-MM-DD'),''), completion_pct, COALESCE(dependencies,'{}'), COALESCE(notes,'') FROM deliverables ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, target_date`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.Deliverable
	for rows.Next() {
		var dl models.Deliverable
		var deps pq.StringArray
		rows.Scan(&dl.ID, &dl.Title, &dl.Type, &dl.Status, &dl.Priority, &dl.AssignedTeam, &dl.TargetDate, &dl.CompletionPct, &deps, &dl.Notes)
		dl.Dependencies = []string(deps)
		results = append(results, dl)
	}
	return results, nil
}

// ── Data Manager ─────────────────────────────────────────────────────────────

var allowedTables = map[string]bool{
	"assets": true, "vulnerabilities": true, "incidents": true,
	"system_drifts": true, "cost_records": true, "compliance_controls": true,
	"team_members": true, "risks": true, "deliverables": true,
}

func (d *DB) GetTableColumns(table string) ([]string, error) {
	if !allowedTables[table] {
		return nil, fmt.Errorf("unknown table")
	}
	rows, err := d.conn.Query(`
		SELECT column_name FROM information_schema.columns
		WHERE table_name = $1 AND table_schema = 'public'
		ORDER BY ordinal_position`, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cols []string
	for rows.Next() {
		var c string
		rows.Scan(&c)
		cols = append(cols, c)
	}
	return cols, nil
}

func (d *DB) ExportTableCSV(table string) (string, error) {
	if !allowedTables[table] {
		return "", fmt.Errorf("unknown table")
	}
	cols, err := d.GetTableColumns(table)
	if err != nil {
		return "", err
	}

	// Build SELECT with text casting for arrays and special types
	selects := make([]string, len(cols))
	for i, c := range cols {
		selects[i] = fmt.Sprintf(`COALESCE(%s::text,'')`, c)
	}

	rows, err := d.conn.Query(fmt.Sprintf(`SELECT %s FROM %s`,
		strings.Join(selects, ","), table))
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var sb strings.Builder
	sb.WriteString(strings.Join(cols, ",") + "\n")

	vals := make([]interface{}, len(cols))
	ptrs := make([]interface{}, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}

	for rows.Next() {
		rows.Scan(ptrs...)
		row := make([]string, len(cols))
		for i, v := range vals {
			s := ""
			if v != nil {
				s = fmt.Sprintf("%v", v)
			}
			// CSV-escape: wrap in quotes if contains comma/newline/quote
			if strings.ContainsAny(s, ",\"\n\r") {
				s = `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
			}
			row[i] = s
		}
		sb.WriteString(strings.Join(row, ",") + "\n")
	}
	return sb.String(), nil
}

type ImportPreviewResult struct {
	Table      string              `json:"table"`
	Columns    []string            `json:"columns"`
	Preview    []map[string]string `json:"preview"`
	TotalRows  int                 `json:"total_rows"`
	Errors     []string            `json:"errors"`
	Warnings   []string            `json:"warnings"`
	Valid       bool               `json:"valid"`
}

type ImportCommitResult struct {
	Table    string `json:"table"`
	Mode     string `json:"mode"`
	Inserted int    `json:"inserted"`
	Updated  int    `json:"updated"`
	Skipped  int    `json:"skipped"`
	Errors   []string `json:"errors"`
}

func (d *DB) PreviewImport(table string, r interface{ Read([]byte) (int, error) }) (*ImportPreviewResult, error) {
	if !allowedTables[table] {
		return nil, fmt.Errorf("unknown table")
	}
	// Read all bytes
	var buf strings.Builder
	b := make([]byte, 4096)
	for {
		n, err := r.Read(b)
		if n > 0 { buf.Write(b[:n]) }
		if err != nil { break }
	}
	rows, headers, errs := parseCSV(buf.String())

	dbCols, _ := d.GetTableColumns(table)
	dbColSet := map[string]bool{}
	for _, c := range dbCols { dbColSet[c] = true }

	var warnings []string
	for _, h := range headers {
		if h != "id" && !dbColSet[h] {
			warnings = append(warnings, fmt.Sprintf("column '%s' not in table (will be ignored)", h))
		}
	}

	preview := rows
	if len(preview) > 5 { preview = preview[:5] }

	return &ImportPreviewResult{
		Table:     table,
		Columns:   headers,
		Preview:   preview,
		TotalRows: len(rows),
		Errors:    errs,
		Warnings:  warnings,
		Valid:      len(errs) == 0,
	}, nil
}

func (d *DB) CommitImport(table, mode string, rows []map[string]string) (*ImportCommitResult, error) {
	if !allowedTables[table] {
		return nil, fmt.Errorf("unknown table")
	}
	result := &ImportCommitResult{Table: table, Mode: mode, Errors: []string{}}

	dbCols, err := d.GetTableColumns(table)
	if err != nil { return nil, err }
	dbColSet := map[string]bool{}
	for _, c := range dbCols { dbColSet[c] = true }

	if mode == "replace" {
		// Delete in FK-safe order: child tables before parent tables
		// assets is referenced by vulnerabilities, incidents, system_drifts
		// TRUNCATE CASCADE drops dependent FK rows automatically, RESTART IDENTITY resets sequences
		if _, err := d.conn.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table)); err != nil {
			return nil, fmt.Errorf("truncate failed: %w", err)
		}
	}

	for _, row := range rows {
		// Filter to only known columns, skip id (let DB assign)
		var cols []string
		var placeholders []string
		var vals []interface{}
		i := 1
		for col, val := range row {
			if col == "id" || !dbColSet[col] { continue }
			cols = append(cols, col)
			placeholders = append(placeholders, fmt.Sprintf("$%d", i))
			vals = append(vals, val)
			i++
		}
		if len(cols) == 0 { result.Skipped++; continue }

		q := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
			table,
			strings.Join(cols, ","),
			strings.Join(placeholders, ","))

		_, err := d.conn.Exec(q, vals...)
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			result.Skipped++
		} else {
			result.Inserted++
		}
	}
	return result, nil
}

// parseCSV — minimal CSV parser
func parseCSV(data string) ([]map[string]string, []string, []string) {
	lines := strings.Split(strings.TrimSpace(data), "\n")
	if len(lines) < 2 {
		return nil, nil, []string{"CSV must have a header row and at least one data row"}
	}
	headers := splitCSVLine(lines[0])
	for i, h := range headers {
		headers[i] = strings.TrimSpace(strings.Trim(h, `"`))
	}

	var rows []map[string]string
	var errs []string
	for i, line := range lines[1:] {
		if strings.TrimSpace(line) == "" { continue }
		vals := splitCSVLine(line)
		if len(vals) != len(headers) {
			errs = append(errs, fmt.Sprintf("row %d: expected %d cols, got %d", i+2, len(headers), len(vals)))
			continue
		}
		row := map[string]string{}
		for j, h := range headers {
			row[h] = strings.TrimSpace(strings.Trim(vals[j], `"`))
		}
		rows = append(rows, row)
	}
	return rows, headers, errs
}

func splitCSVLine(line string) []string {
	var fields []string
	var cur strings.Builder
	inQuote := false
	for i := 0; i < len(line); i++ {
		c := line[i]
		if c == '"' {
			if inQuote && i+1 < len(line) && line[i+1] == '"' {
				cur.WriteByte('"'); i++
			} else {
				inQuote = !inQuote
			}
		} else if c == ',' && !inQuote {
			fields = append(fields, cur.String())
			cur.Reset()
		} else {
			cur.WriteByte(c)
		}
	}
	fields = append(fields, cur.String())
	return fields
}
