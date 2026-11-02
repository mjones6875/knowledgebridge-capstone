#!/usr/bin/env bash
# Restores a backup made by backup.sh. Usage: scripts/restore.sh backups/<timestamp>
# This replaces the current databases and brain folder.
set -euo pipefail

src="${1:?Usage: scripts/restore.sh backups/<timestamp>}"
for f in gbrain-db.dump app-db.dump brain.tar.gz; do
  [ -f "$src/$f" ] || { echo "Missing $src/$f"; exit 1; }
done

read -r -p "This replaces the current data with $src. Type yes to continue: " ok
[ "$ok" = "yes" ] || { echo "Cancelled."; exit 1; }

# Stop everything that holds database connections before replacing the data.
docker compose stop backend gbrain
docker compose up -d gbrain-postgres postgres

restore_db() {
  docker compose exec -T "$1" sh -c '
    dropdb -U "$POSTGRES_USER" --force --if-exists "$POSTGRES_DB" &&
    createdb -U "$POSTGRES_USER" "$POSTGRES_DB" &&
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' < "$src/$2"
}

restore_db gbrain-postgres gbrain-db.dump
restore_db postgres app-db.dump

docker compose run --rm -T --no-deps --entrypoint sh gbrain \
  -c 'find /data/brain -mindepth 1 -delete && tar xzf - -C /data/brain' < "$src/brain.tar.gz"

docker compose up -d gbrain backend
echo "Restored from $src"
