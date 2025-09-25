# Exercise 1 — Docker-compose an microservices hands-on

**service1 (Node.js)** = only public entrypoint  
**service2 (Python/Flask)** = internal  
**storage (Python/Flask)** = internal persistent store

- `GET /status` (via service1): returns two lines (Timestamp1 + Timestamp2) and logs to **both** storages.  
- `GET /log` (via service1): proxies storage’s full log (text/plain).

## Quick start

```bash
# repo root (exercise1/)
# Linux only: ensure bind mount path works
export PWD="$PWD"

docker compose up --build -d

# Expect TWO lines for each call
curl -s http://localhost:8199/status
curl -s http://localhost:8199/status
```

**Verify storages match (2 lines per /status call):**
```bash
cat service1_nodejs/vstorage/log.txt
curl -s http://localhost:8199/log
diff <(cat service1_nodejs/vstorage/log.txt) <(curl -s http://localhost:8199/log) && echo MATCH
```

**Stop:**
```bash
docker compose down
```

## Endpoints

| Service  | Scope   | Port | Host Port | Endpoints                                |
|----------|---------|------|-----------|------------------------------------------|
| service1 | public  | 8199 | 8199      | `GET /health`, `GET /status`, `GET /log` |
| service2 | internal| 5000 | —         | `GET /health`, `GET /status`             |
| storage  | internal| 8080 | —         | `GET /health`, `POST /log`, `GET /log`   |

**Log format (UTC, no milliseconds):**
```
Timestamp1: uptime X hours, free disk in root: x MB @ 2025-09-23T19:58:01Z
Timestamp2: uptime Y hours, free disk in root: y MB @ 2025-09-23T19:58:01Z
```

## Storage paths

- **vStorage (host bind):** `./service1_nodejs/vstorage` mounted at `/app/vstorage` (service1 & service2 append).  
- **storage_data (named volume):** mounted at `/var/lib/storage` in `storage` (only storage writes; others POST via HTTP).

## Cleanup (reset data)

```bash
docker compose down
docker volume rm e1-compose_storage_data
rm -f service1_nodejs/vstorage/log.txt
```
