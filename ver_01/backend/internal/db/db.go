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

func (d *DB) GetSuggestions(query string) ([]models.SearchSuggestion, error) {
	q := `
		SELECT name, type, 1 as cnt FROM assets
		WHERE name ILIKE $1 OR type ILIKE $1 OR team ILIKE $1 OR environment ILIKE $1
		UNION ALL
		SELECT tag, 'tag', COUNT(*) FROM assets, UNNEST(tags) AS tag
		WHERE tag ILIKE $1 GROUP BY tag
		ORDER BY 3 DESC LIMIT 12`
	rows, err := d.conn.Query(q, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []models.SearchSuggestion
	for rows.Next() {
		var s models.SearchSuggestion
		rows.Scan(&s.Value, &s.Category, &s.Count)
		results = append(results, s)
	}
	return results, nil
}

func (d *DB) SearchAssets(terms []string) ([]models.Asset, error) {
	if len(terms) == 0 {
		return d.getAllAssets()
	}
	rows, err := d.conn.Query(`SELECT id, name, type, environment, region, owner, team, status, tags, description, created_at, updated_at FROM assets ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var all []models.Asset
	for rows.Next() {
		var a models.Asset
		var tags pq.StringArray
		rows.Scan(&a.ID, &a.Name, &a.Type, &a.Environment, &a.Region, &a.Owner, &a.Team, &a.Status, &tags, &a.Description, &a.CreatedAt, &a.UpdatedAt)
		a.Tags = []string(tags)
		for _, term := range terms {
			t := strings.ToLower(term)
			if strings.Contains(strings.ToLower(a.Name), t) ||
				strings.Contains(strings.ToLower(a.Type), t) ||
				strings.Contains(strings.ToLower(a.Team), t) ||
				strings.Contains(strings.ToLower(a.Environment), t) ||
				strings.Contains(strings.ToLower(a.Description), t) {
				a.MatchCount++
				continue
			}
			for _, tag := range a.Tags {
				if strings.Contains(strings.ToLower(tag), t) {
					a.MatchCount++
					break
				}
			}
		}
		all = append(all, a)
	}
	// sort by match count desc
	for i := 0; i < len(all); i++ {
		for j := i + 1; j < len(all); j++ {
			if all[j].MatchCount > all[i].MatchCount {
				all[i], all[j] = all[j], all[i]
			}
		}
	}
	return all, nil
}

func (d *DB) getAllAssets() ([]models.Asset, error) {
	rows, err := d.conn.Query(`SELECT id, name, type, environment, region, owner, team, status, tags, description, created_at, updated_at FROM assets ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var all []models.Asset
	for rows.Next() {
		var a models.Asset
		var tags pq.StringArray
		rows.Scan(&a.ID, &a.Name, &a.Type, &a.Environment, &a.Region, &a.Owner, &a.Team, &a.Status, &tags, &a.Description, &a.CreatedAt, &a.UpdatedAt)
		a.Tags = []string(tags)
		all = append(all, a)
	}
	return all, nil
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

	// cost trend: compare last two months
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
		q += fmt.Sprintf(" AND v.severity=$%d", i)
		args = append(args, filterSev)
		i++
	}
	if filterStatus != "" {
		q += fmt.Sprintf(" AND v.status=$%d", i)
		args = append(args, filterStatus)
		i++
	}
	switch sortBy {
	case "cvss":
		q += " ORDER BY v.cvss_score DESC"
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
	rows, err := d.conn.Query(`SELECT i.id, i.asset_id, COALESCE(a.name,'unknown'), i.title, i.severity, i.category, i.frequency, i.intensity, i.start_time, i.end_time, i.resolved, i.mttr_minutes, i.impact, i.root_cause
		FROM incidents i LEFT JOIN assets a ON a.id=i.asset_id ORDER BY i.start_time DESC`)
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
	rows, err := d.conn.Query(`SELECT sd.id, sd.asset_id, COALESCE(a.name,'unknown'), sd.drift_type, sd.component, sd.expected_value, sd.actual_value, sd.severity, sd.detected_at, sd.acknowledged, sd.change_count
		FROM system_drifts sd LEFT JOIN assets a ON a.id=sd.asset_id ORDER BY CASE sd.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`)
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
