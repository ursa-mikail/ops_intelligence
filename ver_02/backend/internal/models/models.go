package models

import "time"

type Asset struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Environment string    `json:"environment"`
	Region      string    `json:"region"`
	Owner       string    `json:"owner"`
	Team        string    `json:"team"`
	Status      string    `json:"status"`
	Tags        []string  `json:"tags"`
	Description string    `json:"description"`
	MatchCount  int       `json:"match_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Vulnerability struct {
	ID                int        `json:"id"`
	CVEID             string     `json:"cve_id"`
	AssetID           int        `json:"asset_id"`
	AssetName         string     `json:"asset_name"`
	Severity          string     `json:"severity"`
	CVSSScore         float64    `json:"cvss_score"`
	Title             string     `json:"title"`
	Description       string     `json:"description"`
	AffectedComponent string     `json:"affected_component"`
	Resolution        string     `json:"resolution"`
	Status            string     `json:"status"`
	DiscoveredAt      time.Time  `json:"discovered_at"`
	ResolvedAt        *time.Time `json:"resolved_at"`
}

type Incident struct {
	ID          int        `json:"id"`
	AssetID     int        `json:"asset_id"`
	AssetName   string     `json:"asset_name"`
	Title       string     `json:"title"`
	Severity    string     `json:"severity"`
	Category    string     `json:"category"`
	Frequency   int        `json:"frequency"`
	Intensity   float64    `json:"intensity"`
	StartTime   time.Time  `json:"start_time"`
	EndTime     *time.Time `json:"end_time"`
	Resolved    bool       `json:"resolved"`
	MTTRMinutes *int       `json:"mttr_minutes"`
	Impact      string     `json:"impact"`
	RootCause   string     `json:"root_cause"`
}

type SystemDrift struct {
	ID            int       `json:"id"`
	AssetID       int       `json:"asset_id"`
	AssetName     string    `json:"asset_name"`
	DriftType     string    `json:"drift_type"`
	Component     string    `json:"component"`
	ExpectedValue string    `json:"expected_value"`
	ActualValue   string    `json:"actual_value"`
	Severity      string    `json:"severity"`
	DetectedAt    time.Time `json:"detected_at"`
	Acknowledged  bool      `json:"acknowledged"`
	ChangeCount   int       `json:"change_count"`
}

type CostRecord struct {
	ID          int     `json:"id"`
	Period      string  `json:"period"`
	Category    string  `json:"category"`
	Subcategory string  `json:"subcategory"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Provider    string  `json:"provider"`
}

type ComplianceControl struct {
	ID           int       `json:"id"`
	Framework    string    `json:"framework"`
	ControlID    string    `json:"control_id"`
	ControlName  string    `json:"control_name"`
	Status       string    `json:"status"`
	Score        float64   `json:"score"`
	LastAssessed time.Time `json:"last_assessed"`
	Remediation  string    `json:"remediation"`
	Priority     string    `json:"priority"`
}

type TeamMember struct {
	ID                int      `json:"id"`
	Name              string   `json:"name"`
	Role              string   `json:"role"`
	Team              string   `json:"team"`
	IncidentsHandled  int      `json:"incidents_handled"`
	AvgMTTRMinutes    float64  `json:"avg_mttr_minutes"`
	OnCallHours       int      `json:"on_call_hours"`
	SatisfactionScore float64  `json:"satisfaction_score"`
	Certifications    []string `json:"certifications"`
	Availability      string   `json:"availability"`
}

type Risk struct {
	ID          int      `json:"id"`
	Title       string   `json:"title"`
	Category    string   `json:"category"`
	Probability string   `json:"probability"`
	Impact      string   `json:"impact"`
	RiskScore   int      `json:"risk_score"`
	Status      string   `json:"status"`
	Owner       string   `json:"owner"`
	Mitigation  string   `json:"mitigation"`
	DueDate     string   `json:"due_date"`
	Blockers    []string `json:"blockers"`
}

type Deliverable struct {
	ID            int      `json:"id"`
	Title         string   `json:"title"`
	Type          string   `json:"type"`
	Status        string   `json:"status"`
	Priority      string   `json:"priority"`
	AssignedTeam  string   `json:"assigned_team"`
	TargetDate    string   `json:"target_date"`
	CompletionPct int      `json:"completion_pct"`
	Dependencies  []string `json:"dependencies"`
	Notes         string   `json:"notes"`
}

type SearchSuggestion struct {
	Value    string `json:"value"`
	Category string `json:"category"`
	Count    int    `json:"count"`
}

type SearchResult struct {
	Assets      []Asset  `json:"assets"`
	TotalCount  int      `json:"total_count"`
	SearchTerms []string `json:"search_terms"`
}

type DashboardSummary struct {
	TotalAssets        int     `json:"total_assets"`
	CriticalAssets     int     `json:"critical_assets"`
	OpenCVEs           int     `json:"open_cves"`
	CriticalCVEs       int     `json:"critical_cves"`
	ActiveIncidents    int     `json:"active_incidents"`
	OpenDrifts         int     `json:"open_drifts"`
	CriticalDrifts     int     `json:"critical_drifts"`
	TotalMonthlyCost   float64 `json:"total_monthly_cost"`
	CostTrendPct       float64 `json:"cost_trend_pct"`
	ComplianceAvgScore float64 `json:"compliance_avg_score"`
	OpenRisks          int     `json:"open_risks"`
	CriticalRisks      int     `json:"critical_risks"`
}

type UniversalResult struct {
	ID          int               `json:"id"`
	Kind        string            `json:"kind"` // asset, vulnerability, incident, drift, risk, deliverable, team, compliance
	Title       string            `json:"title"`
	Subtitle    string            `json:"subtitle"`
	Status      string            `json:"status"`
	Severity    string            `json:"severity"`
	Tags        []string          `json:"tags"`
	Meta        map[string]string `json:"meta"`
	MatchCount  int               `json:"match_count"`
	MatchFields []string          `json:"match_fields"`
}

type UniversalSearchResponse struct {
	Results     []UniversalResult `json:"results"`
	TotalCount  int               `json:"total_count"`
	ByKind      map[string]int    `json:"by_kind"`
	SearchTerms []string          `json:"search_terms"`
}

