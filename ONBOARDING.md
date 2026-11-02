# KnowledgeBridge: Team Onboarding

## What's Set Up

- GitHub repo: `mjones6875/knowledgebridge-capstone`
- Issues tab tracks all milestone work. Check it for what's open and claim what you pick up.
- Docker Compose runs the backend, gBrain, and both Postgres databases with one command
- CI runs on every pull request and every push to `main`
- `.gitignore` covers Node, Java, Python, and secrets

## Getting Started

```bash
git clone https://github.com/mjones6875/knowledgebridge-capstone.git
cd knowledgebridge-capstone
```

Then follow **Running with Docker** in the [README](README.md). It covers the `.env` file,
creating the gBrain access token, and starting the frontend.

If you'd rather run gBrain natively on your own machine (the PGLite setup), follow
Praveen's local setup guide and point the backend at it with
`GBRAIN_BASE_URL=http://host.docker.internal:8787`.

## How We Work

1. Create a branch for your change. Don't commit straight to `main`.
2. Open a pull request when it's ready.
3. CI checks it automatically: backend build and tests, frontend build, and the Docker images.
   Fix anything it flags before merging.
4. Never commit `.env`, API keys, or access tokens.

## Where Things Go

| Folder | What belongs here | Who |
|---|---|---|
| `frontend/` | The React application | Mukhesh, Monika |
| `backend/` | The Java Spring Boot API | Praveen |
| `transcription-service/` | Audio/video transcription service | Praveen |
| `gbrain/` | gBrain Docker build | Marlon |
| `.github/workflows/` | CI | Marlon |
| `docs/architecture/` | System architecture diagrams, workflow diagrams | Team |
| `docs/deliverables/` | SRS, cost projection spreadsheet, Project Plan / Gantt chart | Monika, Team |
| `docs/meeting-notes/` | Notes from team meetings | Team |
| `data/synthetic-corpus/` | Synthetic business dataset | Team |
| `scripts/` | Setup/utility scripts (not application code) | Team |

Some folders still have a placeholder `.gitkeep` file so Git tracks the empty directory.
Delete it once real content lands in that folder.
