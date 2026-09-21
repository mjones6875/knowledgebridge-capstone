# KnowledgeBridge: Team Onboarding & Current Status

## What's Already Set Up

- Public GitHub repo created: `mjones6875/knowledgebridge-capstone`
- `README.md`, MIT `LICENSE`, `.gitignore` (Node/React, Java/Spring Boot, Python, and secrets all covered)
- Directory structure scaffolded (see below)
- 10 Milestone 1 issues filed under the repo's **Issues** tab
- Local Postgres + pgvector development database, containerized via Docker Compose

## Where Things Go

| Folder | What belongs here | Who |
|---|---|---|
| `frontend/` | The React application | Mukhesh, Monika |
| `backend/` | The Java Spring Boot API | Praveen, Marlon |
| `docs/architecture/` | System architecture diagrams, workflow diagrams | Team |
| `docs/deliverables/` | SRS, cost projection spreadsheet, Project Plan / Gantt chart | Monica, Team |
| `docs/meeting-notes/` | Notes from team meetings | Team |
| `data/synthetic-corpus/` | Synthetic business dataset | Team |
| `scripts/` | Setup/utility scripts (not application code) | Team |

Every folder currently has a placeholder `.gitkeep` file so Git tracks the empty
directory. Delete the `.gitkeep` once real content lands in that folder.

## Getting Started

```bash
git clone https://github.com/mjones6875/knowledgebridge-capstone.git
cd knowledgebridge-capstone
```

## Milestone 1 - Tracked as GitHub Issues

See the repo's **Issues** tab for the full list and to claim/assign one

1. Set up local development environment
2. Generate synthetic business dataset
3. Draft Requirements Document / SRS
4. Create system architecture diagram
5. Create business knowledge workflow diagram
6. Create user-flow diagrams
7. Draft initial cost projection spreadsheet
8. Define AI interaction and synthesis strategy
9. Document chunking approach
10. Draft Project Plan and Gantt chart

## Local Dev Environment (Docker)

Postgres + pgvector runs locally via Docker Compose:

1. Copy `.env.example` to `.env` and fill in local values (any placeholder
   works since this database only exists on your own machine)
2. `docker compose up -d`
3. `docker compose ps` to confirm it's running
