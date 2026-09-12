# Docker & Local Development Environment — Walkthrough

This walks through what Docker is doing for this project, what's actually
working right now, and what still needs to be built once real application
code exists.

---

## Why Docker at all

Sponsor explicitly asked us to avoid heavyweight CI/CD — this isn't that.
Docker here solves a narrower, more immediate problem: four people on four
different machines all need the *same* Postgres, with the *same* pgvector
extension enabled, without each person hand-installing Postgres locally and
fighting version drift or "works on my machine" bugs. Later, once the
backend and frontend exist, the same file will let anyone spin up the whole
stack — database, API, and web app — with one command.

## What's containerized now vs. later

| Service | Status | Why |
|---|---|---|
| `postgres` (with pgvector) | **Working today** | Doesn't depend on any application code — it's an off-the-shelf image, so it can be built and run immediately |
| `backend` | Stubbed (commented out in `docker-compose.yml`) | No Spring Boot project exists yet — that's Milestone 1, issue #1 |
| `frontend` | Stubbed (commented out in `docker-compose.yml`) | No React project exists yet — same issue |

## How `docker-compose.yml` works, piece by piece

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16   # Postgres 16 with the pgvector extension pre-installed
    environment:
      POSTGRES_USER: ${POSTGRES_USER}         # pulled from your local .env — never hardcoded
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"          # host_port:container_port
    volumes:
      - postgres_data:/var/lib/postgresql/data # named volume — data survives `docker compose down`
```

- **`image:`** — we use `pgvector/pgvector:pg16` instead of the plain
  `postgres` image specifically because pgvector (the vector-similarity
  extension the RAG retrieval layer needs) isn't in vanilla Postgres. This
  image ships with it already compiled in.
- **`environment:`** — real values live in a local `.env` file (gitignored,
  same convention as everywhere else in this project). `.env.example` is
  committed as the placeholder reference — copy it, rename it, fill in real
  local values.
- **`ports:`** — `"${POSTGRES_PORT:-5432}:5432"` maps container port 5432
  to host port 5432 by default, but lets you override `POSTGRES_PORT` in
  `.env` if you already have a local Postgres install occupying 5432.
- **`volumes:`** — a *named* volume (`postgres_data`, declared at the bottom
  of the file) rather than a bind mount, so Docker manages the storage and
  it isn't tied to a specific folder on your machine.

## Step-by-step: bring up the database today

1. Install Docker Desktop (Windows/Mac) or Docker Engine + the Compose
   plugin (Linux). Confirm with `docker compose version`.
2. From the repo root: `cp .env.example .env` (or copy it manually on
   Windows), then fill in real local values — for local dev these can just
   be simple placeholders like `knowledgebridge` / a made-up password, this
   database only exists on your machine.
3. `docker compose up -d` — starts Postgres in the background.
4. `docker compose ps` — confirm the container is `running` / healthy.
5. `docker compose logs postgres` — check for startup errors if anything
   looks wrong.
6. Connect with any Postgres client (`psql`, DBeaver, the VS Code Postgres
   extension, etc.) at `localhost:5432` using the credentials from your
   `.env`. Confirm pgvector is actually available:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   If that runs without error, pgvector is live.
7. `docker compose down` stops the container (data persists in the named
   volume). `docker compose down -v` stops it **and deletes the volume** —
   only do that if you actually want to wipe local data.

## What's next, once Milestone 1 issue #1 lands

Once real `backend/` (Spring Boot) and `frontend/` (React) projects exist,
uncomment and fill in their service blocks in `docker-compose.yml`:

- **backend**: needs a `backend/Dockerfile` (typically a multi-stage Maven
  build — build the jar in one stage, run it in a slim JRE image in the
  second). In `docker-compose.yml`, add `depends_on: [postgres]` and pass the
  database URL as an environment variable pointing at the `postgres` service
  by its *service name* (Docker's internal DNS resolves `postgres` to the
  right container) — e.g. `jdbc:postgresql://postgres:5432/${POSTGRES_DB}`,
  not `localhost`, since from inside another container `localhost` means
  that container itself.
- **frontend**: needs a `frontend/Dockerfile`. For local dev, this is often
  just running the dev server (`npm start`) with the source directory bind
  mounted in, so edits on your machine show up live without rebuilding the
  image. A separate, more production-like Dockerfile (build the static
  bundle, serve it) isn't needed for this project's scope.

## Common pitfalls

- **Port already in use**: if you already have Postgres installed locally
  on 5432, either stop that service or change `POSTGRES_PORT` in your `.env`.
- **pgvector extension missing**: means the wrong image is being used —
  double check `docker-compose.yml` still points at `pgvector/pgvector`,
  not plain `postgres`.
- **`.env` committed by accident**: run `git status` before every commit,
  same practice as the CMgetFit project — `.env` should never appear.
- **Data "disappearing" between runs**: only happens after `docker compose
  down -v` (which deletes the volume) or if the volume name changed —
  a plain `docker compose down` + `up` preserves data.
