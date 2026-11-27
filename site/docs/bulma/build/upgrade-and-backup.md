# Upgrades and backups

> Bulma v0.2.0. Source: https://github.com/vegeta-labs/bulma/blob/0eac4d1c8e969aa7bf876540873df26b7b6c5379/docs/en/upgrade-and-backup.md

Run these from the folder holding `.env` and `secrets`. Compose reads `.env` on every command, so no setting has to be exported first. Back up `.env` too.

## Before every upgrade

1. **Back up** the database, the `files` volume (both with the expiry job stopped, see the end of this page) and the `secrets` folder, and keep them apart:
   `mkdir -p -m 700 ~/bulma-backups && docker compose exec -T db pg_dump -U postgres -Fc bulma > ~/bulma-backups/bulma-$(date +%F).dump`
   Check it reads back: `docker compose exec -T db pg_restore --list < ~/bulma-backups/bulma-$(date +%F).dump | tail -1`
   A dump holds accounts, password hashes and any payment details, so keep it out of this folder and out of Git.
2. **Export the audit head** and keep it elsewhere: `docker compose run --rm -T app audit head`. Later, `audit check-head <seq> <hash>` compares the database with it. `audit export` writes the whole log to standard output.
3. **Check deals in progress.** Read the release notes for changes to gates, warnings and calculations, and decide what they mean for those deals. A live deal keeps the pack version it went live with.

## Upgrade

```
git pull
docker compose build
docker compose up -d
```

Migrations run on start and only go forward. Afterwards run `docker compose run --rm -T app audit verify`.

## Roll back

Migrations do not reverse. To roll back, stop the app, replace the database with the backup and start the earlier version. Restoring over the newer database would leave its new tables behind:

```
docker compose stop app maintenance
docker compose exec -T db dropdb -U postgres --force bulma
docker compose exec -T db createdb -U postgres bulma
docker compose exec -T db pg_restore -U postgres --exit-on-error -d bulma < ~/bulma-backups/bulma-YYYY-MM-DD.dump
docker run --rm -e OWNER="$(id -u):$(id -g)" -v bulma_files:/data -v ~/bulma-backups:/backup alpine sh -c 'find /data -mindepth 1 -delete && tar xzf /backup/files-YYYY-MM-DD.tgz -C /data && chown -R "$OWNER" /data'
git checkout <earlier tag>
docker compose build && docker compose up -d
```

Use the database dump and the files archive from the same backup: the database says which documents exist, the volume holds them. The files must belong to `BULMA_UID:BULMA_GID`; the command assumes that is you, so if `.env` says otherwise, use those values for `OWNER`.

Anything recorded after the backup is lost, so compare against the exported audit head and re-enter it. Then open a document on an entity, and `docker compose run --rm -T app audit verify`: the audit check does not look at the files.

## Restore on a fresh machine

A dump holds the grants but not the database roles they name, so create the roles first. Use the same `secrets` and `.env`, with `BULMA_UID` and `BULMA_GID` set to your user on this machine.

```
docker compose up -d db
docker compose run --rm -T migrate migrate --roles-only
docker compose exec -T db pg_restore -U postgres --exit-on-error -d bulma < ~/bulma-backups/bulma-YYYY-MM-DD.dump
docker run --rm -e OWNER="$(id -u):$(id -g)" -v bulma_files:/data -v ~/bulma-backups:/backup alpine sh -c 'tar xzf /backup/files-YYYY-MM-DD.tgz -C /data && chown -R "$OWNER" /data'
docker compose up -d
docker compose run --rm -T app audit verify
```

The archive keeps the owner from the old machine, and the app and the expiry job cannot write to or delete files they do not own, hence the `chown`. Afterwards open a document on an entity and upload one: the audit check does not look at the files.

Identity documents are in the `files` volume, not the database, so a backup is both. Stop the expiry job while you take it, or it can delete a file between the two:

```
docker compose stop maintenance
docker compose exec -T db pg_dump -U postgres -Fc bulma > ~/bulma-backups/bulma-YYYY-MM-DD.dump
docker run --rm -v bulma_files:/data -v ~/bulma-backups:/backup alpine tar czf /backup/files-YYYY-MM-DD.tgz -C /data .
docker compose start maintenance
```

The volume is `bulma_files` because the compose file names the project `bulma`, whatever the folder is called. If you start it under another project name (`-p` or `COMPOSE_PROJECT_NAME`), use that name instead of `bulma`; `docker volume ls` shows it. The files are encrypted, so they need the same keys.

The master keys and HMAC key in `secrets` are needed to verify the log and read encrypted data, so a backup without them is not a full backup. Test this before you need it, on a separate machine.
