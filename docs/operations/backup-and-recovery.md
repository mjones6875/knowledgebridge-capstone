# Backup and Recovery

How to back up and restore the KnowledgeBridge Docker stack.

## What gets backed up

| Item | What's in it | File |
|---|---|---|
| gBrain database | Ingested pages, chunks, embeddings, and gBrain access tokens | `gbrain-db.dump` |
| App database | Our own app data (empty for now, reserved for accounts, caching, and usage history) | `app-db.dump` |
| Brain folder | gBrain's copy of each page as a markdown file, tracked in Git | `brain.tar.gz` |

**Not included: `.env`.** It holds API keys and tokens, so it stays out of backups that
might get shared. Keep your own copy somewhere private, like a password manager.

## When to back up

- Before upgrading gBrain or changing the embedding model or vector size
- Before ingesting a large batch, like the sponsor's test dataset
- Before terminating the EC2 server at the end of the semester
- Any time the data would be painful to recreate

## How to back up

From the repo root, with the stack running:

```bash
bash scripts/backup.sh
```

This creates `backups/<date-time>/` with the three files above. The `backups/` folder is
ignored by Git. To keep a backup off the server, copy it to your machine:

```bash
scp -r knowledgebridge-ec2:knowledgebridge-capstone/backups/<date-time> .
```

## How to restore

```bash
bash scripts/restore.sh backups/<date-time>
```

The script asks for confirmation, stops the backend and gBrain, replaces both databases and
the brain folder, then starts everything again. Anything added after that backup is lost,
so take a fresh backup first if you're unsure.

## Things to know

- **Restore into the same model settings.** Embeddings only work with the model and vector
  size that created them (currently `text-embedding-3-small` at 1024). Restoring into a
  different setup means re-embedding everything.
- **Access tokens come back too.** They're stored in the gBrain database, so the
  `GBRAIN_TOKEN` in your `.env` keeps working after a restore from the same backup.
- **Test a restore now and then.** A backup that's never been restored isn't proven to work.
