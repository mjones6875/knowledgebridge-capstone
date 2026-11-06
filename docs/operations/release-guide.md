# Release Guide

How we version, check, and publish a KnowledgeBridge release.

## Versions

We use version numbers like `v0.2.1`:

- **Middle number** goes up for a release with new features
- **Last number** goes up for a release that only fixes bugs
- **First number** stays at `0` while we're in development. `v1.0.0` is the final release for
  the course demo (delivery date November 30, 2026)

Planned releases:

| Version | When |
|---|---|
| `v0.1.0` | First tagged release, once `main` passes CI (needs #25 fixed) |
| `v1.0.0` | Final demo |

## Before a release

- [ ] CI passes on `main`
- [ ] The full stack has been tested on the EC2 server from the commit being released:
      startup, ingestion, search, a cited answer, a "not enough information" answer,
      the cost dashboard, and transcription
- [ ] A backup was taken on the server first (`bash scripts/backup.sh`)
- [ ] The README's model and version table matches what's running
- [ ] Issues for the release are closed, or moved to the next one
- [ ] No API keys, tokens, or `.env` files in the changes

## Publishing a release

From an up-to-date `main`:

```bash
git switch main
git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --generate-notes
```

`--generate-notes` builds the release notes from the pull requests merged since the last
release. Edit them on GitHub afterward if anything needs explaining.

## Updating the server to a release

On the EC2 server:

```bash
cd ~/knowledgebridge-capstone
bash scripts/backup.sh
git fetch --tags
git checkout v0.1.0
docker compose up -d --build
docker compose ps
```

## Rolling back

If a release breaks something, go back to the previous tag:

```bash
git checkout <previous-tag>   # for example v0.1.0
docker compose up -d --build
```

If the release changed stored data, like a gBrain upgrade or a different embedding model,
also restore the backup taken before the release:

```bash
bash scripts/restore.sh backups/<date-time>
```

## Who does what

Marlon (DevOps and release lead) runs the checklist and publishes releases. Anyone on the
team can flag that something should block a release.
