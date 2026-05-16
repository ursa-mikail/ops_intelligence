package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"ops-intelligence/internal/db"
	"github.com/gorilla/websocket"
)

type Handler struct{ db *db.DB }

func New(database *db.DB) *Handler { return &Handler{db: database} }

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// WSSuggest — real-time autocomplete across all tables
func (h *Handler) WSSuggest(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil { return }
	defer conn.Close()
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil { break }
		query := strings.TrimSpace(string(msg))
		if len(query) < 1 { conn.WriteJSON([]interface{}{}); continue }
		suggestions, err := h.db.GetSuggestions(query)
		if err != nil { log.Println("suggest err:", err); conn.WriteJSON([]interface{}{}); continue }
		conn.WriteJSON(suggestions)
	}
}

// WSSearch — universal search across ALL 9 tables via WebSocket
func (h *Handler) WSSearch(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil { return }
	defer conn.Close()
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil { break }
		var terms []string
		json.Unmarshal(msg, &terms)
		resp, err := h.db.SearchAll(terms)
		if err != nil {
			log.Println("search err:", err)
			conn.WriteJSON(map[string]interface{}{"results": []interface{}{}, "total_count": 0, "by_kind": map[string]int{}, "search_terms": terms})
			continue
		}
		conn.WriteJSON(resp)
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	s, err := h.db.GetDashboardSummary()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, s)
}

func (h *Handler) Vulnerabilities(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetVulnerabilities(r.URL.Query().Get("sort"), r.URL.Query().Get("severity"), r.URL.Query().Get("status"))
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Incidents(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetIncidents()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Drifts(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetDrifts()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Costs(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetCosts()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Compliance(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetCompliance()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Team(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetTeam()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Risks(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetRisks()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Deliverables(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetDeliverables()
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, data)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]string{"status": "ok"})
}

// ExportTable — streams a single table as CSV
func (h *Handler) ExportTable(w http.ResponseWriter, r *http.Request) {
	table := r.URL.Query().Get("table")
	allowed := map[string]bool{
		"assets": true, "vulnerabilities": true, "incidents": true,
		"system_drifts": true, "cost_records": true, "compliance_controls": true,
		"team_members": true, "risks": true, "deliverables": true,
	}
	if !allowed[table] {
		http.Error(w, "unknown table", 400)
		return
	}
	csv, err := h.db.ExportTableCSV(table)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="`+table+`.csv"`)
	w.Write([]byte(csv))
}

// ImportPreview — parses uploaded CSV and returns preview rows + validation
func (h *Handler) ImportPreview(w http.ResponseWriter, r *http.Request) {
	table := r.URL.Query().Get("table")
	r.ParseMultipartForm(32 << 20)
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "no file: "+err.Error(), 400)
		return
	}
	defer file.Close()
	result, err := h.db.PreviewImport(table, file)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	writeJSON(w, result)
}

// ImportCommit — applies a validated import
func (h *Handler) ImportCommit(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Table  string              `json:"table"`
		Mode   string              `json:"mode"` // append | replace | upsert
		Rows   []map[string]string `json:"rows"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	result, err := h.db.CommitImport(req.Table, req.Mode, req.Rows)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, result)
}

// ExportAll — exports all tables as a JSON bundle (frontend zips them)
func (h *Handler) ExportAll(w http.ResponseWriter, r *http.Request) {
	tables := []string{"assets","vulnerabilities","incidents","system_drifts","cost_records","compliance_controls","team_members","risks","deliverables"}
	bundle := map[string]string{}
	for _, t := range tables {
		csv, err := h.db.ExportTableCSV(t)
		if err != nil { continue }
		bundle[t] = csv
	}
	writeJSON(w, bundle)
}

// TableSchema — returns column names for a table
func (h *Handler) TableSchema(w http.ResponseWriter, r *http.Request) {
	table := r.URL.Query().Get("table")
	cols, err := h.db.GetTableColumns(table)
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, cols)
}
