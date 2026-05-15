package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"ops-intelligence/internal/db"

	"github.com/gorilla/websocket"
)

type Handler struct {
	db *db.DB
}

func New(database *db.DB) *Handler {
	return &Handler{db: database}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (h *Handler) WSSuggest(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		query := strings.TrimSpace(string(msg))
		if len(query) < 1 {
			conn.WriteJSON([]interface{}{})
			continue
		}
		suggestions, err := h.db.GetSuggestions(query)
		if err != nil {
			log.Println("suggest err:", err)
			conn.WriteJSON([]interface{}{})
			continue
		}
		conn.WriteJSON(suggestions)
	}
}

func (h *Handler) WSSearch(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var terms []string
		json.Unmarshal(msg, &terms)
		assets, err := h.db.SearchAssets(terms)
		if err != nil {
			log.Println("search err:", err)
			conn.WriteJSON(map[string]interface{}{"assets": []interface{}{}, "total_count": 0})
			continue
		}
		conn.WriteJSON(map[string]interface{}{
			"assets":       assets,
			"total_count":  len(assets),
			"search_terms": terms,
		})
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	s, err := h.db.GetDashboardSummary()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, s)
}

func (h *Handler) Vulnerabilities(w http.ResponseWriter, r *http.Request) {
	sortBy := r.URL.Query().Get("sort")
	sev := r.URL.Query().Get("severity")
	status := r.URL.Query().Get("status")
	data, err := h.db.GetVulnerabilities(sortBy, sev, status)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Incidents(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetIncidents()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Drifts(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetDrifts()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Costs(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetCosts()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Compliance(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetCompliance()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Team(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetTeam()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Risks(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetRisks()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Deliverables(w http.ResponseWriter, r *http.Request) {
	data, err := h.db.GetDeliverables()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, data)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]string{"status": "ok"})
}
