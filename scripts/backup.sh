#!/usr/bin/env bash
# Backs up both databases and gBrain's brain folder into backups/<timestamp>/.
# Run from the repo root while the stack is running. Secrets in .env are not included.
set -euo pipefail

dest="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$dest"

dump() {
  docker compose exec -T "$1" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dest/$2"
}

dump gbrain-postgres gbrain-db.dump
dump postgres app-db.dump
docker compose run --rm -T --no-deps --entrypoint tar gbrain czf - -C /data/brain . > "$dest/brain.tar.gz"

ls -lh "$dest"
echo "Backup saved to $dest"
