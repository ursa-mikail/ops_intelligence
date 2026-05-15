package main

import (
	"log"
	"net/http"
	"os"

	"ops-intelligence/internal/db"
	"ops-intelligence/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	database, err := db.New()
	if err != nil {
		log.Fatalf("DB connection failed: %v", err)
	}
	log.Println("✅ Connected to PostgreSQL")

	h := handlers.New(database)
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}))

	// REST
	r.Get("/health", h.Health)
	r.Get("/api/summary", h.Summary)
	r.Get("/api/vulnerabilities", h.Vulnerabilities)
	r.Get("/api/incidents", h.Incidents)
	r.Get("/api/drifts", h.Drifts)
	r.Get("/api/costs", h.Costs)
	r.Get("/api/compliance", h.Compliance)
	r.Get("/api/team", h.Team)
	r.Get("/api/risks", h.Risks)
	r.Get("/api/deliverables", h.Deliverables)

	// WebSocket
	r.Get("/ws/suggest", h.WSSuggest)
	r.Get("/ws/search", h.WSSearch)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("🚀 Backend listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
