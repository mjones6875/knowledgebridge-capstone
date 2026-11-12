#!/usr/bin/env bash
# Checks that a running stack works end to end: backend health, the gBrain connection,
# ingesting a page, and finding it with search. Doesn't need an OpenRouter key.
# Run from anywhere after `docker compose up`.
set -euo pipefail

backend="${BACKEND_URL:-http://localhost:8080}"
slug="smoke-test-page"

echo "Backend health"
curl -sf "$backend/actuator/health" >/dev/null

echo "Backend can reach gBrain"
curl -sf "$backend/api/gbrain/tools" >/dev/null

echo "Ingest a page"
curl -sf -X POST "$backend/api/gbrain/ingest/text" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Smoke Test Page\",\"slug\":\"$slug\",\"content\":\"The smoke test policy covers widget calibration every quarter.\"}" >/dev/null

echo "Page shows up in the list"
curl -sf "$backend/api/gbrain/pages" | grep -q "$slug"

echo "Search finds it"
curl -sf "$backend/api/gbrain/search?query=widget%20calibration" | grep -q "$slug"

echo "Clean up"
curl -sf -X DELETE "$backend/api/gbrain/pages/$slug" >/dev/null

echo "Smoke test passed"
