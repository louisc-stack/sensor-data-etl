# sensor-data-etl

Load top-level CSV sensor readings from a configured directory into MySQL. Files are processed in parallel; invalid rows are skipped; duplicate `(sensorName, timestamp)` keys are deduplicated at insert time.

## Prerequisites

- Docker and Docker Compose
- Bash (for `start-dev.sh`)

## Configuration

Copy [.env.example](.env.example) to `.env` if you do not have one yet. Important variables:

| Variable | Purpose |
|----------|---------|
| `HOST_DATA_DIR` | Host path mounted as `/app/data/sensor-data` (CSV input directory) |
| `MYSQL_*` | Database connection used by the loader |
| `MIN_FILE_CONCURRENCY` / `MAX_FILE_CONCURRENCY` | Piscina worker pool size (parallel files) |
| `BATCH_SIZE` | Rows per `INSERT` batch |

The loader always reads CSVs from `/app/data/sensor-data` inside the container; change `HOST_DATA_DIR` to point at another folder on the host.

`MYSQL_ROOT_PASSWORD` in `.env.example` is a local development default. MySQL in this setup is for localhost only. Do not reuse that password on a host that exposes port 3306.

## Run the program (recommended)

```bash
./start-dev.sh
```

This script:

1. Creates `.env` from `.env.example` only when `.env` is missing
2. Starts MySQL (`development` profile)
3. Runs the program in the foreground so logs and exit status are visible

Running the program again against the same database keeps existing rows; duplicate keys are skipped (`INSERT IGNORE`). Use the reset steps below for an empty database.

Rebuild after dependency changes:

```bash
docker compose --profile=development build server
# run the program again
docker compose --profile=development run --rm server
```

Reset MySQL to an empty database. `-v` removes the data volume, so the next start runs [database/initdb.sql](database/initdb.sql) again:

```bash
docker compose --profile=development down -v
./start-dev.sh
```

## Unit tests

Tests cover validation, UTC normalization, and CSV listing:

```bash
docker compose --profile=test run --rm server-test
```

## Summary log

Each file prints one line, then a `total` line that adds those counts together:

```text
file-1.csv read=12 inserted=10 invalidated=1 transformRejected=0 rowsIgnored=1 insertFailed=0
total read=12 inserted=10 invalidated=1 transformRejected=0 rowsIgnored=1 insertFailed=0
```

| Field | Meaning |
|-------|---------|
| `read` | Data rows in the file (the header is not counted) |
| `inserted` | Rows written to database |
| `invalidated` | Rows that failed validation |
| `transformRejected` | Rows that failed data transformation after validation |
| `rowsIgnored` | Rows skipped because `(sensorName, timestamp)` was already present |
| `insertFailed` | Rows in a batch whose `INSERT` failed |

## Schema

See [database/initdb.sql](database/initdb.sql). Primary key `(sensorName, timestamp)` enforces one reading per sensor per instant (UTC, millisecond precision). `sensorName` uses a case-sensitive collation.

Secondary index `idx_timestamp` on `timestamp` is for timestamp-led queries: a time range, or one instant across sensors. Lookups that already start with `sensorName` use the primary key. This program only inserts but these indexes are useful for querying later if needed.

## Row handling

### Invalid rows

Rows must have:

- `timestamp`: ISO-8601 date-time **with** time zone offset
- `sensorName`: non-empty, at most 255 characters
- `value`: a finite number (string in CSV)

Invalid rows are skipped silently (no per-row log).

### Duplicates

Inserts use `INSERT IGNORE` against the primary key.

- **Same file, same key:** within one multi-row insert, the first row for that key is kept; later rows in the batch are ignored.
- **Across files:** whichever insert commits first wins when workers run in parallel. Later conflicting rows are ignored (existing row is **not** updated).

`ON DUPLICATE KEY UPDATE` was not used because a directory can hold many files, and each file can hold many records. The same key can appear more than once, sometimes with different values, and there is no rule for which value should be kept. With that many rows, those writes are extra work, and they still do not tell you which number was the real reading. `ON DUPLICATE KEY UPDATE` would rewrite the stored row on every later duplicate. `INSERT IGNORE` stores the key once and skips those rewrites.

Timestamps are normalized to UTC before insert, so `2026-10-27T08:00:00+00:00` and `2026-10-27T03:00:00.000-05:00` are the same key.

### Mock CSV files

| File | Intent |
|------|--------|
| `file-1.csv` | Valid timestamps (Z, offsets, edge dates) |
| `file-2.csv` | Valid `sensorName` variants (case, spaces, length) |
| `file-3.csv` | Same sensor and instant repeated with different values (duplicate-key stress) |
| `file-4.csv` | Invalid timestamps, names, and values (should insert nothing) |
| `file-5.csv` | Exact duplicate rows (within-file dedup) |
| `file-6.csv` | Larger multi-sensor file (parallel demo) |

## Simplified Flow

```text
.env / HOST_DATA_DIR  →  docker compose (development)
                              ├─ MySQL (initdb.sql)
                              └─ server: list CSVs → Piscina workers → stream/validate/batch INSERT IGNORE
```
