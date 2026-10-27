# KnowledgeBridge

**AI-Powered Business Knowledge Management Platform**
KSU AI 7993 Capstone | Fall 2026 | Team Indy 7

---

## Overview

KnowledgeBridge is a web-based proof-of-concept that makes internal business knowledge
searchable and queryable through natural language. The platform ingests company-specific
documents, indexes them through a RAG-based knowledge engine, and answers natural-language
questions with source citations while clearly acknowledging when it lacks sufficient information.

This is a proof-of-concept application, not a production enterprise system.

## Tech Stack

- **Frontend:** React
- **Backend:** Java 21, Spring Boot
- **Knowledge Engine:** gBrain
- **Database:** PostgreSQL 16 + pgvector
- **AI provider:** OpenRouter
- **Transcription:** Python, faster-whisper (audio/video ingestion, in progress)

## Model and Version Settings

Keep these the same in every environment. Changing the embedding model or vector size
means re-embedding all content.

| Setting | Value |
|---|---|
| gBrain version | v0.48.5.0 (pinned in `docker-compose.yml`) |
| Embedding model | `openrouter:openai/text-embedding-3-small` |
| Vector size | 1024 |
| Answer model | `openrouter:anthropic/claude-haiku-4.5` |

## Running with Docker

Starts the backend, gBrain, and both Postgres databases. The frontend runs separately.
Plan on about 2GB of free memory; on a small server, add swap.

1. Copy `.env.example` to `.env` and add your own OpenRouter key.
2. Start gBrain and its database, then give it about a minute to initialize:
   ```bash
   docker compose up -d --build gbrain-postgres gbrain
   ```
3. Create the backend's gBrain access token and paste it into `.env` as `GBRAIN_TOKEN`:
   ```bash
   docker compose exec gbrain gbrain auth create knowledgebridge-api --scopes read,write
   ```
4. Start everything else:
   ```bash
   docker compose up -d --build
   docker compose ps
   ```
5. Run the frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

| Service | Address |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |
| Health check | http://localhost:8080/actuator/health |
| API docs (Swagger) | http://localhost:8080/swagger-ui/index.html |
| gBrain | http://localhost:7333 |

To use a gBrain running natively on your own machine instead (the PGLite setup), set
`GBRAIN_BASE_URL=http://host.docker.internal:8787` in `.env`.

Never commit `.env`, API keys, or access tokens.

## CI

GitHub Actions runs on every pull request and every push to `main`:

- **Backend:** builds and runs the tests
- **Frontend:** production build, lint warnings fail the build
- **Docker:** checks the compose file and builds every image

## Team

| Name | Role |
|---|---|
| Praveen Kumar | Lead Developer - Java / API, Team Leader |
| Mukhesh Raghava Katragadda | Lead Developer - UI / Frontend, Documentation, Testing |
| Monika Juttiga | Lead Developer - UI, Documentation, Testing |
| Marlon Jones | Lead Developer - CI/CD, DevOps, Release Management |

**Sponsor:** Pravin Khandke
**Instructor:** Arthur Choi, Kennesaw State University

## Project Structure

knowledgebridge-capstone/
- frontend/               React web application
- backend/                Java Spring Boot API
- gbrain/                 gBrain Docker build (from the sponsor's docker-gbrain setup)
- transcription-service/  Audio/video transcription service
- .github/workflows/      CI
- docs/                   Project documentation and deliverables
- data/                   Synthetic business dataset
- scripts/                Setup and utility scripts

## Status

Project in active development - Fall 2026 semester.
