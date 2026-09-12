# KnowledgeBridge — Team Onboarding & Current Status

## What's Already Set Up

- Public GitHub repo created: `mjones6875/knowledgebridge-capstone`
- `README.md`, MIT `LICENSE`, `.gitignore` (Node/React, Java/Spring Boot, Python, and secrets all covered)
- Directory structure scaffolded (see below)
- 10 Milestone 1 issues filed under the repo's **Issues** tab
- Local Postgres + pgvector development database, containerized via Docker Compose (see `DOCKER_SETUP.md`)
## Where Things Go

| Folder | What belongs here | Who |
|---|---|---|
| `frontend/` | The React application | Mukhesh, Monika |
| `backend/` | The Java Spring Boot API | Praveen, Marlon |
| `docs/architecture/` | System architecture diagrams, workflow diagrams, this Docker walkthrough | Whoever's building the diagram |
| `docs/deliverables/` | SRS, cost projection spreadsheet, Project Plan / Gantt chart | Whoever owns that deliverable |
| `docs/meeting-notes/` | Notes from team meetings | Whoever's taking notes that week |
| `data/synthetic-corpus/` | The 50-document synthetic business dataset | Whoever's generating it |
| `scripts/` | Setup/utility scripts (not application code) | Anyone |

Every folder currently has a placeholder `.gitkeep` file so Git tracks the empty
directory — delete the `.gitkeep` once real content lands in that folder.

## Getting Started

```bash
git clone https://github.com/mjones6875/knowledgebridge-capstone.git
cd knowledgebridge-capstone
```

Suggested workflow given 4 people will have write access: work on a feature
branch and open a pull request rather than pushing straight to `main`, so
everyone sees changes before they land. (Not enforced yet at the repo-settings
level — worth deciding together rather than one person imposing it.)

## Current Open Questions

Carried over from the original setup doc — **don't build around an assumption
on any of these**, confirm with the team/sponsor first:

1. ~~Team Leader~~ — **Resolved:** Praveen Kumar, elected September 11, 2026
2. Single MVP document upload format not chosen (md, txt, or simple docx)
3. Final LLM provider/model not finalized
4. OpenRouter credit not yet provisioned
5. Embedding provider/model not decided
6. gbrain local setup requirements not fully documented
7. GPU/compute environment not confirmed for all team members
8. Entity-awareness and cost-dashboard MVP scope not finalized
9. Exact course due dates — use the live D2L calendar, not template dates

## Milestone 1 - Tracked as GitHub Issues

See the repo's **Issues** tab for the full list and to claim/assign one

1. Set up local development environment
2. Generate synthetic business dataset (50 cohesive documents)
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
   works — this database only exists on your own machine)
2. `docker compose up -d`
3. `docker compose ps` to confirm it's running

Backend/frontend containers are stubbed in `docker-compose.yml`
until Milestone 1 issue #1 actually scaffolds those two projects.

## Explicitly Out of Scope (per sponsor)

Don't build or scaffold any of these — sponsor was explicit about avoiding
scope creep here: mobile/responsive design, production cloud deployment,
authentication/SSO/OAuth, production-grade RBAC, heavyweight CI/CD pipelines,
PDF parsing (stretch goal only), real-time multi-user collaboration,
regulatory compliance work (HIPAA/SOC 2/GDPR), multilingual support,
third-party SaaS integrations (Slack/Teams/Salesforce), MCP agent integration
as a core feature.
