# Velora Streaming Platform - Backup & Disaster Recovery Runbook

This guide covers complete backup, restore, and disaster recovery procedures for Velora's database, video catalog metadata, and media storage pools.

---

## 1. Database Backup & Restore

### A. SQLite (Local / Development Profile)
The local SQLite database resides at `prisma/dev.db`. Because WAL mode is active, you must back up both `dev.db` and any `-wal` / `-shm` files.

#### Backup Command (Using SQLite Online Backup API)
```bash
# Windows PowerShell
sqlite3 prisma/dev.db ".backup 'backups/velora_sqlite_$(Get-Date -Format yyyyMMdd_HHmmss).db'"

# Linux Bash
sqlite3 prisma/dev.db ".backup 'backups/velora_sqlite_$(date +%Y%m%d_%H%M%S).db'"
```

#### Restore Command
```bash
cp backups/velora_sqlite_TARGET.db prisma/dev.db
npx prisma generate
```

---

### B. PostgreSQL (Production / Docker Profile)

#### Automated Daily Backup (pg_dump)
```bash
# Create timestamped SQL dump
docker exec -t velora_postgres pg_dump -U velora_admin -F c -b -v -f "/var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).dump" velora_production

# Or directly to host filesystem
pg_dump -h localhost -p 5432 -U velora_admin -F c -b -v -f "backups/velora_pg_$(date +%Y%m%d_%H%M%S).dump" velora_production
```

#### Automated Cron Script (`scripts/backup-db.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/data/velora/backups/db"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/velora_db_$TIMESTAMP.dump"

pg_dump -U velora_admin -d velora_production -F c -f "$FILENAME"

# Delete backups older than 14 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +14 -delete
echo "Database backup completed: $FILENAME"
```

#### Restore Command
```bash
# Restore into clean database
docker exec -i velora_postgres pg_restore -U velora_admin -d velora_production -v -c < backups/velora_pg_TARGET.dump
```

---

## 2. Media Storage Backup & Sync

Video media should **NEVER** be mixed with database dumps. Media storage is organized in:
```
media_storage/
├── videos/
│   ├── original/    (Source MP4 master files)
│   ├── hls/         (Generated master.m3u8, variant playlists, and .ts segments)
│   ├── thumbnails/  (Extracted video posters)
│   ├── posters/     (High-resolution backdrops)
│   └── subtitles/   (VTT / SRT files)
```

### Free-First Offline Hard Drive Backup (Rsync / Robocopy)
Use block-level differential backup to an external hard drive or secondary NAS server:

```powershell
# Windows PowerShell (Robocopy incremental mirror)
robocopy "C:\Users\Tejaswi\OneDrive\New folder (2)\streaming\media_storage" "D:\Velora_Media_Backup" /MIR /MT:8 /R:2 /W:5
```

```bash
# Linux Rsync incremental sync
rsync -avh --progress --delete /data/velora/ /mnt/backup_drive/velora_media/
```

---

## 3. Disaster Recovery Protocol

If the host machine fails or hardware crashes:

1. **New Machine Provisioning**:
   ```bash
   git clone <YOUR_REPO_URL> velora
   cd velora
   cp .env.example .env
   # Set secure passwords in .env
   ```
2. **Mount Media Storage**:
   Attach the media backup drive to `/data/velora` or `./media_storage`.
3. **Start Infrastructure**:
   ```bash
   docker compose up -d postgres redis
   ```
4. **Restore Database**:
   ```bash
   pg_restore -U velora_admin -d velora_production -v < backups/velora_pg_LATEST.dump
   ```
5. **Launch Application & Worker**:
   ```bash
   docker compose up -d web worker nginx
   ```
6. **Health Verification**:
   ```bash
   curl http://localhost/api/health
   ```
